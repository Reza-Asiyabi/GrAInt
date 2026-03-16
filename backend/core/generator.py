import os
from openai import OpenAI

from .prompts import PROMPTS

MODEL = "gpt-4o-mini"
OPTIONAL_FIELDS = ["references", "constraints", "timeline", "budget_range"]


def _normalize_inputs(inputs: dict) -> dict:
    """Ensure all optional fields are present so .format(**inputs) never raises KeyError."""
    normalized = dict(inputs)
    for field in OPTIONAL_FIELDS:
        if not normalized.get(field):
            normalized[field] = ""
    return normalized


def build_client() -> OpenAI:
    return OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL") or None,
    )


def generate_section(
    client: OpenAI,
    section: str,
    inputs: dict,
    context: dict | None = None,
) -> str:
    inputs = _normalize_inputs(inputs)
    section_prompt = PROMPTS["sections"][section]["prompt"].format(**inputs)

    # Pass previously generated sections for narrative continuity
    if context:
        ctx_lines = ["\n\nPREVIOUS SECTIONS (for narrative continuity):"]
        for name, content in context.items():
            ctx_lines.append(f"\n{name.upper()}:\n{content[:300]}...\n")
        section_prompt += "".join(ctx_lines)

    system_prompt = PROMPTS["general_writer"]["prompt"].format(**inputs)

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": section_prompt},
        ],
        temperature=0.7,
        max_tokens=1500,
    )
    return response.choices[0].message.content.strip()


def generate_review(client: OpenAI, inputs: dict, sections: dict) -> str:
    inputs = _normalize_inputs(inputs)
    full_text = "\n\n".join(
        f"=== {k.upper()} ===\n{v}" for k, v in sections.items()
    )
    review_prompt = f"""Review this research proposal across five dimensions:
1. Coherence & narrative flow
2. Technical rigour and feasibility
3. Clarity of expected outcomes and impact
4. Alignment with funding call requirements
5. Writing quality and academic tone

For each dimension provide a rating (1–5) and specific, actionable suggestions.
End with an overall summary and the top 3 priority improvements.

PROPOSAL:
{full_text}"""

    system_prompt = PROMPTS["consistency_checker"]["prompt"].format(**inputs)
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": review_prompt},
        ],
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()


def revise_section(
    client: OpenAI,
    section: str,
    current_content: str,
    feedback: str,
    inputs: dict,
) -> str:
    inputs = _normalize_inputs(inputs)
    revision_prompt = f"""Revise the following {section} section based on the feedback below.
Keep the academic tone and ensure it remains consistent with the overall proposal.

FEEDBACK:
{feedback}

CURRENT CONTENT:
{current_content}

Return only the revised section — no preamble or commentary."""

    system_prompt = PROMPTS["general_writer"]["prompt"].format(**inputs)
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": revision_prompt},
        ],
        temperature=0.5,
    )
    return response.choices[0].message.content.strip()
