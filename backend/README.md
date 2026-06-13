# DataLens — Image to IMDB

AI-driven backend that extracts Item Master Database (IMDB) fields from product images and exports them as Excel or CSV for retail cataloging.

## How it works

1. **Upload** a product image via the web UI or API.
2. **OCR** runs first (EasyOCR) to pull raw text from the label.
3. **Barcode detection** runs in parallel (pyzbar) and overwrites the barcode field if found.
4. **Gemini Vision** receives the image + OCR text and returns structured JSON for all 10 IMDB columns.
5. **Validation** scores each field (barcode, weight, country, packaging, brand, product name) and computes a confidence percentage.
6. **Export** downloads an `.xlsx` or `.csv` with one row per product and 13 columns (10 IMDB fields + confidence + flagged_for_review + notes).

If Gemini is disabled, a pure-OCR fallback (regex + fuzzy matching via `rapidfuzz`) fills the same fields.

## Run it

```bash
cd E:\projects\DataLens\backend

python -m venv backend
backend\Scripts\activate

pip install -r requirements.txt

set GEMINI_API_KEY=your_key_here
uvicorn main:app --reload --port 8000
```

Open `http://localhost:8000`.

## Project structure

| File | What it does |
|---|---|
| `main.py` | FastAPI app. Serves the UI, accepts image uploads (`/api/extract`, `/api/extract-batch`), runs the pipeline, and streams Excel/CSV downloads (`/api/export/{excel,csv}`). |
| `ocr.py` | Lazy-loads EasyOCR on first call (thread-pooled, 60s timeout). Pre-processes images with denoising + adaptive thresholding. Also exposes `detect_barcodes()` via pyzbar. |
| `ai/gemini_extractor.py` | Sends image bytes + OCR prompt to `gemini-2.5-flash` and parses the JSON response. Returns empty-fallback dict on API failure so the pipeline never crashes. |
| `extractions/extractor.py` | Pure-OCR fallback: regex for weight, substring matching for country, fuzzy matching (`rapidfuzz`) for brand and packaging. |
| `validators/imdb_validator.py` | Field-level regex/string checks for barcode, weight, country, packaging, brand, and product name. Computes overall confidence %. Reads reference lists from `data/` JSON files. |
| `exporter.py` | Converts a list of IMDB records into styled Excel (openpyxl) or CSV (pandas). Handles confidence, review flags, and notes columns. |
| `utils/helpers.py` | Cleans Gemini text output before JSON parsing (strips markdown backticks, falls back to regex block extraction). |
| `data/models.py` | `IMDBRecord` dataclass — the 10-field schema shared across the pipeline. |
| `data/countries.json` | Allowed country values for validation. |
| `data/packaging_type.json` | Allowed packaging values for validation. |
| `data/categories.json` | Placeholder for future category taxonomy. |
| `static/index.html` | Single-page upload UI: drag-and-drop images, process up to 10 at once, review confidence badges, export to Excel/CSV. |
| `requirements.txt` | Python dependencies. |
| `.gitignore` | Ignores `.env`. |

## API endpoints

- `GET /` — Web UI
- `GET /api/health` — Health check
- `POST /api/extract` — Single image upload → IMDB JSON
- `POST /api/extract-batch` — Up to 10 images → list of IMDB JSON
- `GET /api/export/{excel,csv}` — Download processed records
- `POST /api/validate` — Validate an IMDB record and return confidence

## Notes

- Uploaded images are deleted immediately after processing.
- First OCR run downloads the EasyOCR model (~100 MB) and can take 20-30 seconds.
- Confidence < 60% flags a record for human review in the export.
