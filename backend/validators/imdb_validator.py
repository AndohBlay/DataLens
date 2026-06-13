import json
import re
from pathlib import Path
from typing import Dict

BASE_DIR = Path(__file__).resolve().parent.parent
COUNTRIES = json.load(open(BASE_DIR / "data" / "countries.json"))
PACKAGING_TYPES = json.load(open(BASE_DIR / "data" / "packaging_type.json"))


class IMDBValidator:

    @staticmethod
    def validate_barcode(barcode: str) -> Dict:
        if not barcode:
            return {"valid": False, "message": "Barcode is empty"}
        pattern = r"^\d{8,14}$"
        valid = bool(re.match(pattern, barcode))
        return {"valid": valid, "message": "Valid barcode" if valid else "Invalid barcode format"}

    @staticmethod
    def validate_weight(weight: str) -> Dict:
        if not weight:
            return {"valid": False, "message": "Weight is empty"}
        pattern = r"^\d+(?:\.\d+)?\s?(?:g|kg|ml|l)$"
        valid = bool(re.match(pattern, weight.lower()))
        return {"valid": valid, "message": "Valid weight" if valid else "Invalid weight format"}

    @staticmethod
    def validate_country(country: str) -> Dict:
        if not country:
            return {"valid": False, "message": "Country is empty"}
        valid = country in COUNTRIES
        return {"valid": valid, "message": "Valid country" if valid else "Unknown country"}

    @staticmethod
    def validate_packaging(packaging: str) -> Dict:
        if not packaging:
            return {"valid": False, "message": "Packaging type is empty"}
        valid = packaging in PACKAGING_TYPES
        return {"valid": valid, "message": "Valid packaging type" if valid else "Unknown packaging type"}

    @staticmethod
    def validate_brand(brand: str) -> Dict:
        if not brand:
            return {"valid": False, "message": "Brand is empty"}
        valid = len(brand.strip()) >= 2
        return {"valid": valid, "message": "Valid brand" if valid else "Brand too short"}

    @staticmethod
    def validate_product_name(product_name: str) -> Dict:
        if not product_name:
            return {"valid": False, "message": "Product name is empty"}
        valid = len(product_name.strip()) >= 3
        return {"valid": valid, "message": "Valid product name" if valid else "Product name too short"}

    @staticmethod
    def validate_record(record: Dict) -> Dict:
        results = {
            "barcode": IMDBValidator.validate_barcode(record.get("barcode", "")),
            "weight_unit": IMDBValidator.validate_weight(record.get("weight_unit", "")),
            "country_origin": IMDBValidator.validate_country(record.get("country_origin", "")),
            "packaging_type": IMDBValidator.validate_packaging(record.get("packaging_type", "")),
            "brand": IMDBValidator.validate_brand(record.get("brand", "")),
            "product_name": IMDBValidator.validate_product_name(record.get("product_name", "")),
        }
        valid_fields = sum(1 for item in results.values() if item["valid"])
        confidence = round((valid_fields / len(results)) * 100, 2)
        return {"confidence": confidence, "fields": results}
