import json
import re
import logging

logger = logging.getLogger(__name__)

JSON_BLOCK_RE = re.compile(r"\{.*\}", re.DOTALL)


def clean_json(response_text: str) -> dict:
    text = response_text.strip()

    for marker in ("```json", "```"):
        text = text.replace(marker, "")

    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = JSON_BLOCK_RE.search(text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError as exc:
                logger.error("JSON parse failed: %s\nBlock: %s", exc, match.group())

    raise ValueError(f"Cannot parse JSON from Gemini response:\n{response_text[:2000]}")
