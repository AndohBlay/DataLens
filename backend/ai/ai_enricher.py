PROMPT = f"""
You are a retail product catalog expert.

OCR Text:

{ocr_text}

Extract:

1. Brand
2. Product Name
3. Manufacturer
4. Category Type
5. Segment Type
6. Weight
7. Packaging Type
8. Country Origin
9. Marketing Message

Return JSON only.

Correct OCR spelling mistakes when obvious.
"""