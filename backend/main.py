import asyncio
import logging
import uuid
from io import BytesIO
from pathlib import Path
from typing import Dict, List

# FastAPI imports
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

# Local imports
from ai.gemini_extractor import extract_product_data
from exporter import export_to_csv, export_to_excel
from ocr import detect_barcodes, read_text_from_image
from session_store import store
from validators.imdb_validator import IMDBValidator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DataLens — Image to IMDB",
    description="AI-driven product image to item master data extraction",
    version="0.2.0",
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")


# Synchronous image processing function that does the heavy lifting:
def _process_image_sync(image_path: str, use_gemini: bool = True, use_ocr: bool = True) -> Dict:
    ocr_text = ""
    # OCR text extraction (if enabled)
    if use_ocr:
        try:
            ocr_text = read_text_from_image(image_path)
        except Exception as exc:
            logger.warning("OCR failed for %s: %s", image_path, exc)

    # Barcode detection (if enabled)
    barcodes = detect_barcodes(image_path)
    barcode_value = barcodes[0].get("data", "") if barcodes else ""

    # Data extraction via Gemini or local logic
    if use_gemini:
        data = extract_product_data(image_path, ocr_text)
    else:
        from extractions.extractor import extract_imdb_fields
        data = extract_imdb_fields(ocr_text)

    if barcode_value and not data.get("barcode"):
        data["barcode"] = barcode_value

    # Record validation and enrichment
    validation = IMDBValidator.validate_record(data)
    data["confidence"] = validation["confidence"]
    data["field_validation"] = validation["fields"]   # per-field detail
    data["flagged_for_review"] = validation["confidence"] < 60
    data["notes"] = ""

    # Persist in session store (adds record_id + duplicate info)
    store.add(data)
    return data


async def process_image(image_path: str, use_gemini: bool = True, use_ocr: bool = True) -> Dict:
    # Async wrapper — offloads blocking work to a thread.
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, _process_image_sync, image_path, use_gemini, use_ocr
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

# @app.get("/", response_class=HTMLResponse)
# async def index():
#     return Path("static/index.html").read_text(encoding="utf-8")


# For Testting the server is running
@app.get("/api/health")
async def health():
    return {"status": "ok", "version": app.version}


# *************** Single image extraction (POST, multipart/form-data) ****************
@app.post("/api/extract")
async def extract_single(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are accepted")

    ext = Path(file.filename or "upload.jpg").suffix
    dest = UPLOAD_DIR / f"{uuid.uuid4().hex}{ext}"

    try:
        dest.write_bytes(await file.read())
        record = await process_image(str(dest))
        return JSONResponse(record)
    except Exception as exc:
        logger.exception("Extraction failed")
        raise HTTPException(500, f"Extraction failed: {exc}")
    finally:
        dest.unlink(missing_ok=True)


# ******************** Batch (concurrent) extraction (POST, multipart/form-data) ********************
@app.post("/api/extract-batch")
async def extract_batch(files: List[UploadFile] = File(...)):

    if len(files) > 10:
        raise HTTPException(400, "Maximum 10 files per batch")

    # Save all uploads first
    saved: List[tuple] = []
    for file in files:
        if not file.content_type or not file.content_type.startswith("image/"):
            continue
        ext = Path(file.filename or "upload.jpg").suffix
        dest = UPLOAD_DIR / f"{uuid.uuid4().hex}{ext}"
        dest.write_bytes(await file.read())
        saved.append((file.filename, dest))

    # Process all concurrently
    async def _safe_process(filename: str, path: Path) -> Dict:
        try:
            record = await process_image(str(path))
            record["source_filename"] = filename
            return record
        except Exception as exc:
            logger.exception("Batch extraction failed for %s", filename)
            return {"source_filename": filename, "error": str(exc)}
        finally:
            path.unlink(missing_ok=True)

    results = await asyncio.gather(*[_safe_process(fn, p) for fn, p in saved])
    return JSONResponse({"records": list(results)})


# --- Session record store ---------------------------------------------------

@app.get("/api/records")
async def get_records():
    """Return all records processed in this server session."""
    return JSONResponse({"records": store.get_all()})


@app.delete("/api/records")
async def clear_records():
    """Wipe the session store (useful between demo runs)."""
    store.clear()
    return JSONResponse({"message": "Session cleared"})


@app.get("/api/stats")
async def get_stats():
    """Aggregate metrics for the current session — useful for demo slides."""
    return JSONResponse(store.stats())


# --- Export (POST, accepts JSON body) ---------------------------------------

@app.post("/api/export/{fmt}")
async def export_results(fmt: str, request: Request):
    if fmt not in ("excel", "csv"):
        raise HTTPException(400, "Format must be 'excel' or 'csv'")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Request body must be valid JSON")

    # Accept either {"records": [...]} or a bare list
    records = body.get("records", body) if isinstance(body, dict) else body
    if not isinstance(records, list):
        raise HTTPException(400, "Expected a list of records or {'records': [...]}")

    uid = uuid.uuid4().hex[:8]
    if fmt == "excel":
        content = export_to_excel(records)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"imdb_export_{uid}.xlsx"
        return StreamingResponse(
            BytesIO(content),
            media_type=media,
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    else:
        content = export_to_csv(records)
        filename = f"imdb_export_{uid}.csv"
        return StreamingResponse(
            BytesIO(content.encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )


# ********** Validate a single record **************************
@app.post("/api/validate")
async def validate_record(request: Request):
    record = await request.json()
    result = IMDBValidator.validate_record(record)
    return JSONResponse(result)

@app.post("/api/extract-product")
async def extract_product(files: List[UploadFile] = File(...)):
    """Multiple images of the SAME product — merge into one record."""
    if len(files) > 10:
        raise HTTPException(400, "Maximum 10 images per product")

    saved = []
    for file in files:
        if not file.content_type or not file.content_type.startswith("image/"):
            continue
        ext = Path(file.filename or "upload.jpg").suffix
        dest = UPLOAD_DIR / f"{uuid.uuid4().hex}{ext}"
        dest.write_bytes(await file.read())
        saved.append(dest)

    if not saved:
        raise HTTPException(400, "No valid image files provided")

    try:
        # Gather OCR text from all images
        ocr_parts = []
        for path in saved:
            try:
                text = read_text_from_image(str(path))
                if text:
                    ocr_parts.append(text)
            except Exception as exc:
                logger.warning("OCR failed for %s: %s", path, exc)

        combined_ocr = "\n".join(ocr_parts)

        # Detect barcodes across all images, take first hit
        barcode_value = ""
        for path in saved:
            barcodes = detect_barcodes(str(path))
            if barcodes:
                barcode_value = barcodes[0].get("data", "")
                break

        # Extract using the primary (first) image + all OCR text combined
        data = extract_product_data(str(saved[0]), combined_ocr)

        if barcode_value and not data.get("barcode"):
            data["barcode"] = barcode_value

        validation = IMDBValidator.validate_record(data)
        data["confidence"] = validation["confidence"]
        data["field_validation"] = validation["fields"]
        data["flagged_for_review"] = validation["confidence"] < 60
        data["notes"] = ""
        data["image_count"] = len(saved)

        store.add(data)
        return JSONResponse(data)

    except Exception as exc:
        logger.exception("Product extraction failed")
        raise HTTPException(500, f"Extraction failed: {exc}")
    finally:
        for path in saved:
            path.unlink(missing_ok=True)

