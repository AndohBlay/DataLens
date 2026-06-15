
from __future__ import annotations

import os
import threading
import logging
from typing import Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


SHEET_COLUMNS = [
    "record_id",
    "ITEM_NAME", "BARCODE", "MANUFACTURER", "BRAND", "WEIGHT",
    "PACKAGING_TYPE", "COUNTRY", "VARIANT", "TYPE",
    "FRAGRANCE_FLAVOR", "PROMOTION", "ADDONS", "TAGLINE",
    "confidence", "flagged_for_review", "potential_duplicate",
    "notes", "source_filename",
]


GOOGLE_CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS_FILE", "google_credentials.json")
GOOGLE_SHEET_NAME = os.getenv("GOOGLE_SHEET_NAME", "IMDB_Predictions")

_worksheet = None

if os.path.exists(GOOGLE_CREDENTIALS_FILE):
    try:
        import gspread
        from google.oauth2.service_account import Credentials

        SCOPES = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ]
        creds = Credentials.from_service_account_file(GOOGLE_CREDENTIALS_FILE, scopes=SCOPES)
        gc = gspread.authorize(creds)
        spreadsheet = gc.open(GOOGLE_SHEET_NAME)
        _worksheet = spreadsheet.sheet1

        # Ensure header row exists
        existing_header = _worksheet.row_values(1)
        if existing_header != SHEET_COLUMNS:
            _worksheet.update("A1", [SHEET_COLUMNS])

        logger.info("Google Sheets connected — records will be persisted to '%s'.", GOOGLE_SHEET_NAME)
    except Exception as exc:
        logger.warning("Google Sheets connection failed (%s) — falling back to in-memory only.", exc)
        _worksheet = None
else:
    logger.warning(
        "%s not found — running in-memory only (no persistence).",
        GOOGLE_CREDENTIALS_FILE,
    )


def _record_to_row(record: Dict) -> List:
    """Map an internal record dict to a row matching SHEET_COLUMNS."""
    # Lazy import to avoid circular import with exporter.py
    from exporter import FIELD_MAP, _resolve_type, _resolve_promo_fields

    row = {}
    for hackathon_col, internal_key in FIELD_MAP.items():
        if hackathon_col in ("TYPE", "PROMOTION", "ADDONS", "TAGLINE"):
            continue
        row[hackathon_col] = str(record.get(internal_key, "") or "")

    row["TYPE"] = _resolve_type(record)
    row.update(_resolve_promo_fields(record))

    row["record_id"] = record.get("record_id", "")
    row["confidence"] = record.get("confidence", "")
    row["flagged_for_review"] = "Yes" if record.get("flagged_for_review") else "No"
    row["potential_duplicate"] = "Yes" if record.get("potential_duplicate") else "No"
    row["notes"] = record.get("notes", "")
    row["source_filename"] = record.get("source_filename", "")

    return [row.get(col, "") for col in SHEET_COLUMNS]


class SessionStore:
    """Thread-safe in-memory store for IMDB records, with optional Google Sheets persistence."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._records: List[Dict] = []

    def add(self, record: Dict) -> Dict:
        """Add a record, attach duplicate info, append to Google Sheet if available."""
        with self._lock:
            record_id = len(self._records) + 1
            record["record_id"] = record_id

            duplicate = self._find_duplicate(record)
            record["potential_duplicate"] = duplicate is not None
            record["matched_record"] = duplicate

            self._records.append(record)

        if _worksheet is not None:
            try:
                _worksheet.append_row(_record_to_row(record), value_input_option="USER_ENTERED")
            except Exception as exc:
                logger.warning("Google Sheets append failed for record %s: %s", record_id, exc)

        return record

    def get_all(self) -> List[Dict]:
        with self._lock:
            return list(self._records)

    def clear(self) -> None:
        with self._lock:
            self._records.clear()
        if _worksheet is not None:
            try:
                _worksheet.resize(rows=1)
                _worksheet.resize(rows=1000)
            except Exception as exc:
                logger.warning("Google Sheets clear failed: %s", exc)

    def stats(self) -> Dict:
        with self._lock:
            total = len(self._records)
            flagged = sum(1 for r in self._records if r.get("flagged_for_review"))
            duplicates = sum(1 for r in self._records if r.get("potential_duplicate"))
            confidences = [r.get("confidence", 0) for r in self._records]
            avg_conf = round(sum(confidences) / total, 2) if total else 0
            return {
                "total_records": total,
                "flagged_for_review": flagged,
                "potential_duplicates": duplicates,
                "avg_confidence": avg_conf,
                "persisted_to_sheets": _worksheet is not None,
            }


    def _find_duplicate(self, incoming: Dict) -> Optional[Dict]:
        barcode = (incoming.get("barcode") or "").strip()
        brand = (incoming.get("brand") or "").strip().lower()
        weight = (incoming.get("weight_unit") or "").strip().lower()

        for existing in self._records:
            if barcode and barcode == (existing.get("barcode") or "").strip():
                return _slim(existing)

            ex_brand = (existing.get("brand") or "").strip().lower()
            ex_weight = (existing.get("weight_unit") or "").strip().lower()
            if brand and weight and brand == ex_brand and weight == ex_weight:
                return _slim(existing)

        return None


def _slim(record: Dict) -> Dict:
    keys = ("record_id", "barcode", "brand", "product_name", "weight_unit", "confidence")
    return {k: record.get(k, "") for k in keys}


# Module-level singleton — import this everywhere
store = SessionStore()