import logging
from io import BytesIO
from typing import Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from exporter import export_to_csv, export_to_excel
from storage import store

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="IMDB Storage & Output API",
    description="Receives extracted/validated product records, stores them, and exports predictions.csv/xlsx",
    version="1.0.0",
)

# Allow the React frontend (and teammates' services) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)



# Health check
@app.get("/api/health")
async def health():
    return {"status": "ok", "version": app.version, "total_records": len(store.get_all())}

# Receive records from the extraction/validation team
@app.post("/api/records")
async def add_record(request: Request):
    """
    Receive ONE already-extracted-and-validated record and store it.

    Expected fields (from the extraction/validation pipeline):
      barcode, category_type, segment_type, manufacturer, brand,
      product_name, weight_unit, packaging_type, country_origin,
      marketing_message, variant, fragrance_flavor, promotion,
      addons, tagline, confidence, flagged_for_review, notes,
      source_filename
    """
    try:
        record: Dict = await request.json()
    except Exception:
        raise HTTPException(400, "Request body must be valid JSON")

    if not isinstance(record, dict):
        raise HTTPException(400, "Expected a single JSON object")

    saved = store.add(record)
    return JSONResponse(saved)


@app.post("/api/records-batch")
async def add_records_batch(request: Request):
    """
    Receive a LIST of already-extracted-and-validated records and store them all.
    Body: {"records": [...]}  or  a bare list [...]
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Request body must be valid JSON")

    records = body.get("records", body) if isinstance(body, dict) else body
    if not isinstance(records, list):
        raise HTTPException(400, "Expected a list of records or {'records': [...]}")

    saved = [store.add(r) for r in records]
    return JSONResponse({"stored": len(saved), "records": saved})


# Session record store
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


@app.post("/api/export/{fmt}")
async def export_results(fmt: str, request: Request):
    """13-column predictions.csv / predictions.xlsx from a posted record list."""
    if fmt not in ("excel", "csv"):
        raise HTTPException(400, "Format must be 'excel' or 'csv'")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Request body must be valid JSON")

    records = body.get("records", body) if isinstance(body, dict) else body
    if not isinstance(records, list):
        raise HTTPException(400, "Expected a list of records or {'records': [...]}")

    if fmt == "excel":
        content = export_to_excel(records)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        return StreamingResponse(
            BytesIO(content),
            media_type=media,
            headers={"Content-Disposition": "attachment; filename=predictions.xlsx"},
        )
    else:
        content = export_to_csv(records)
        return StreamingResponse(
            BytesIO(content.encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=predictions.csv"},
        )


@app.get("/api/export/{fmt}")
async def export_from_store(fmt: str):
    """Same as above, but pulls everything from the session store directly."""
    if fmt not in ("excel", "csv"):
        raise HTTPException(400, "Format must be 'excel' or 'csv'")

    records = store.get_all()
    if not records:
        raise HTTPException(404, "No records in session store yet")

    if fmt == "excel":
        content = export_to_excel(records)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        return StreamingResponse(
            BytesIO(content),
            media_type=media,
            headers={"Content-Disposition": "attachment; filename=predictions.xlsx"},
        )
    else:
        content = export_to_csv(records)
        return StreamingResponse(
            BytesIO(content.encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=predictions.csv"},
        )