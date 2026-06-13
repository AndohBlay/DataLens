from google import genai
from google.genai import types
from dotenv import load_dotenv
import os
import logging
from utils.helpers import clean_json

load_dotenv()
logger = logging.getLogger(__name__)

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY not set in environment")

client = genai.Client(api_key=API_KEY)

SYSTEM_PROMPT = """
You are an expert retail cataloging system. Your ONLY output must be valid JSON matching the schema below.

SCHEMA:
{
  "barcode": "",
  "category_type": "",
  "segment_type": "",
  "manufacturer": "",
  "brand": "",
  "product_name": "",
  "weight_unit": "",
  "packaging_type": "",
  "country_origin": "",
  "marketing_message": ""
}

RULES:
- Fill each field based on the image and OCR text.
- Correct obvious OCR spelling mistakes.
- Do not invent information you cannot see.
- Use empty string for any field that cannot be determined.
- Return ONLY the JSON object, no commentary.
"""


def extract_product_data(image_path: str, ocr_text: str = "") -> dict:
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    prompt = f"{SYSTEM_PROMPT}\n\nOCR TEXT:\n{ocr_text}\n"

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                prompt,
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/jpeg",
                ),
            ],
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=1024,
            ),
        )

        return clean_json(response.text)

    except Exception as exc:
        logger.error("Gemini extraction failed for %s: %s", image_path, exc)
        return {
            "barcode": "",
            "category_type": "",
            "segment_type": "",
            "manufacturer": "",
            "brand": "",
            "product_name": "",
            "weight_unit": "",
            "packaging_type": "",
            "country_origin": "",
            "marketing_message": "",
        }
