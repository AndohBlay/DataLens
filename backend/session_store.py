"""
In-memory store for processed IMDB records within a server session.
Provides duplicate detection by barcode, brand, and weight.
"""

from __future__ import annotations

import threading
from typing import Dict, List, Optional


class SessionStore:
    """Thread-safe in-memory store for IMDB records."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._records: List[Dict] = []

    def add(self, record: Dict) -> Dict:
        #Add a record to the store and return it with duplicate info attached. (record_id,potential_duplicate(Boolean),matched_record)
        
        with self._lock:
            record_id = len(self._records) + 1
            record["record_id"] = record_id

            duplicate = self._find_duplicate(record)
            record["potential_duplicate"] = duplicate is not None
            record["matched_record"] = duplicate  # None or the conflicting dict

            self._records.append(record)
            return record

    def get_all(self) -> List[Dict]:
        with self._lock:
            return list(self._records)

    def clear(self) -> None:
        with self._lock:
            self._records.clear()

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
            }

    # ------------------------------------------------------------------
    # Duplicate detection
    # ------------------------------------------------------------------

    def _find_duplicate(self, incoming: Dict) -> Optional[Dict]:
        #Return the first existing record that conflicts with `incoming`.

        """
        Match logic (any one of these is enough to flag):
          1. Exact barcode match  (barcode non-empty)
          2. Same brand + same weight_unit  (both non-empty)
        """
        barcode = (incoming.get("barcode") or "").strip()
        brand = (incoming.get("brand") or "").strip().lower()
        weight = (incoming.get("weight_unit") or "").strip().lower()

        for existing in self._records:
            # Rule 1 — barcode collision
            if barcode and barcode == (existing.get("barcode") or "").strip():
                return _slim(existing)

            # Rule 2 — brand + weight collision
            ex_brand = (existing.get("brand") or "").strip().lower()
            ex_weight = (existing.get("weight_unit") or "").strip().lower()
            if brand and weight and brand == ex_brand and weight == ex_weight:
                return _slim(existing)

        return None


def _slim(record: Dict) -> Dict:
    #Return a lightweight summary of a record for the matched_record field.
    keys = ("record_id", "barcode", "brand", "product_name", "weight_unit", "confidence")
    return {k: record.get(k, "") for k in keys}


# Module-level singleton — import this everywhere
store = SessionStore()
