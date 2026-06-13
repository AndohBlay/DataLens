from rapidfuzz import process
import re 

COUNTRIES = [
    "Ghana",
    "Nigeria",
    "China",
    "India",
    "USA"
]

PACKAGING_TYPES = [
    "Sachet",
    "Bottle",
    "Can",
    "Box",
    "Tin",
    "Pouch"
]

KNOWN_BRANDS = [
    "SISTER",
    "MAGGI",
    "NESTLE",
    "MILO",
    "COWBELL"
]

def extract_product_name(text):

    lines = [
        line.strip()
        for line in text.split("\n")
        if line.strip()
    ]

    if len(lines) < 2:
        return ""

    brand = extract_brand(text)

    product_lines = []

    for line in lines:

        if line.upper() == brand:
            continue

        if extract_packaging(line):
            continue

        product_lines.append(line)

    return " ".join(product_lines)

def extract_weight(text):
    pattern = r'(\d+(?:\.\d+)?)\s?(g|kg|ml|l)'

    match = re.search(pattern,text, re.IGNORECASE)

    if match:
        return match.group()
    return ""

def extract_country(text):

    text_lower = text.lower()

    for country in COUNTRIES:
        if country.lower() in text_lower:
            return country

    return ""

def extract_packaging(text):

    words = text.split()

    best_match = None
    best_score = 0

    for word in words:

        match, score, _ = process.extractOne(
            word,
            PACKAGING_TYPES
        )

        if score > best_score:
            best_score = score
            best_match = match

    if best_score >= 70:
        return best_match

    return ""

def extract_brand(text):

    words = text.split()

    best_match = None
    best_score = 0

    for word in words:

        match, score, _ = process.extractOne(
            word,
            KNOWN_BRANDS
        )

        if score > best_score:
            best_score = score
            best_match = match

    if best_score >= 80:
        return best_match

    return ""

def extract_imdb_fields(text):

    return {
        "barcode": "",
        "category_type": "",
        "segment_type": "",
        "manufacturer": "",
        "brand": extract_brand(text),
        "product_name": extract_product_name(text),
        "weight_unit": extract_weight(text),
        "packaging_type": extract_packaging(text),
        "country_origin": extract_country(text),
        "marketing_message": ""
    }