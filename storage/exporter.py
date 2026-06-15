import io
import logging
from typing import List, Dict

import pandas as pd
from openpyxl.styles import Font, PatternFill, Alignment

logger = logging.getLogger(__name__)


IMDB_COLUMNS = [
    "ITEM_NAME",
    "BARCODE",
    "MANUFACTURER",
    "BRAND",
    "WEIGHT",
    "PACKAGING_TYPE",
    "COUNTRY",
    "VARIANT",
    "TYPE",
    "FRAGRANCE_FLAVOR",
    "PROMOTION",
    "ADDONS",
    "TAGLINE",
]

FIELD_MAP = {
    "ITEM_NAME":        "product_name",
    "BARCODE":          "barcode",
    "MANUFACTURER":     "manufacturer",
    "BRAND":            "brand",
    "WEIGHT":           "weight_unit",
    "PACKAGING_TYPE":   "packaging_type",
    "COUNTRY":          "country_origin",
    "VARIANT":          "variant",
    "FRAGRANCE_FLAVOR": "fragrance_flavor",
    "PROMOTION":        "promotion",
    "ADDONS":           "addons",
    "TAGLINE":          "tagline",
}


def _resolve_type(rec: Dict) -> str:
    """TYPE = combination of category_type + segment_type."""
    segment = (rec.get("segment_type") or "").strip()
    category = (rec.get("category_type") or "").strip()
    if segment and category:
        return f"{category} - {segment}" if segment.lower() != category.lower() else category
    return segment or category or ""


def _resolve_promo_fields(rec: Dict) -> Dict[str, str]:
    """
    PROMOTION / ADDONS / TAGLINE — if these specific fields are empty
    but marketing_message has content, use it as a TAGLINE fallback
    so the info isn't silently dropped.
    """
    promotion = (rec.get("promotion") or "").strip()
    addons    = (rec.get("addons") or "").strip()
    tagline   = (rec.get("tagline") or "").strip()
    marketing = (rec.get("marketing_message") or "").strip()

    if not (promotion or addons or tagline) and marketing:
        tagline = marketing

    return {"PROMOTION": promotion, "ADDONS": addons, "TAGLINE": tagline}


def records_to_dataframe(records: List[Dict]) -> pd.DataFrame:
    """Convert internal pipeline records into the 13-column hackathon DataFrame."""
    rows = []
    for rec in records:
        row = {}

        for hackathon_col, internal_key in FIELD_MAP.items():
            if hackathon_col in ("TYPE", "PROMOTION", "ADDONS", "TAGLINE"):
                continue
            row[hackathon_col] = str(rec.get(internal_key, "") or "")

        row["TYPE"] = _resolve_type(rec)
        row.update(_resolve_promo_fields(rec))

        for col in IMDB_COLUMNS:
            row.setdefault(col, "")

        rows.append(row)

    return pd.DataFrame(rows, columns=IMDB_COLUMNS)


def export_to_excel(records: List[Dict], filename: str = None) -> bytes:
    df = records_to_dataframe(records)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Predictions")
        worksheet = writer.sheets["Predictions"]

        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF")
        for cell in worksheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", wrap_text=True)

        for column in worksheet.columns:
            max_length = 0
            col_letter = column[0].column_letter
            for cell in column:
                try:
                    if cell.value:
                        max_length = max(max_length, len(str(cell.value)))
                except Exception:
                    pass
            worksheet.column_dimensions[col_letter].width = min(max_length + 4, 50)

    return output.getvalue()


def export_to_csv(records: List[Dict]) -> str:
    df = records_to_dataframe(records)
    return df.to_csv(index=False)