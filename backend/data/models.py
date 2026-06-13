# models.py

from dataclasses import dataclass

@dataclass
class IMDBRecord:
    barcode: str = ""
    category_type: str = ""
    segment_type: str = ""
    manufacturer: str = ""
    brand: str = ""
    product_name: str = ""
    weight_unit: str = ""
    packaging_type: str = ""
    country_origin: str = ""
    marketing_message: str = ""