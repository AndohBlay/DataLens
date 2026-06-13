import cv2
import numpy as np
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

_reader = None
_pool = ThreadPoolExecutor(max_workers=2)
_pyzbar_available = True

try:
    from pyzbar import pyzbar
except (ImportError, OSError) as exc:
    logger.warning("pyzbar not available: %s — barcode detection disabled", exc)
    _pyzbar_available = False


def _get_reader():
    global _reader
    if _reader is None:
        from easyocr import Reader
        logger.info("Loading EasyOCR model (first run takes ~30s)...")
        _reader = Reader(['en'], gpu=False)
    return _reader


def read_text_from_image(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot load image: {image_path}")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    processed = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )

    reader = _get_reader()
    future = _pool.submit(reader.readtext, processed)
    results = future.result(timeout=60)

    lines = [r[1] for r in results if r[2] >= 0.6]
    return "\n".join(lines)


def detect_barcodes(image_path):
    if not _pyzbar_available:
        logger.debug("Barcode detection skipped (pyzbar unavailable)")
        return []

    img = cv2.imread(image_path)
    if img is None:
        return []

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    try:
        decoded = pyzbar.decode(gray)
    except Exception as exc:
        logger.warning("Barcode detection failed: %s", exc)
        return []

    return [{"data": d.data.decode('utf-8'), "type": d.type} for d in decoded]
