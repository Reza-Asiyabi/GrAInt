import json
from pathlib import Path

SECTION_ORDER = [
    "title",
    "abstract",
    "background",
    "objectives",
    "methodology",
    "expected_outcomes",
]

SECTION_LABELS = {
    "title": "Title",
    "abstract": "Abstract",
    "background": "Background",
    "objectives": "Objectives",
    "methodology": "Methodology",
    "expected_outcomes": "Expected Outcomes",
}

_PROMPTS_PATH = Path(__file__).parent.parent / "prompts" / "Prompts.json"


def load_prompts() -> dict:
    with open(_PROMPTS_PATH, encoding="utf-8") as f:
        return json.load(f)


PROMPTS = load_prompts()
