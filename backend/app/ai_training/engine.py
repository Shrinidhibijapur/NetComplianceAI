from ..models import LineClassification, MatchedExample
from .store import VectorStore

CONFIDENCE_THRESHOLD = 0.75


def classify_line(store: VectorStore, line_text: str, k: int = 3) -> LineClassification:
    matches = store.search(line_text, k=k)
    if not matches:
        return LineClassification(
            line_text=line_text, suggested_canonical_key=None, confidence=0.0, needs_labeling=True
        )

    top_score, top_example = matches[0]
    needs_labeling = top_score < CONFIDENCE_THRESHOLD

    return LineClassification(
        line_text=line_text,
        suggested_canonical_key=None if needs_labeling else top_example.canonical_key,
        confidence=round(top_score, 3),
        needs_labeling=needs_labeling,
        matched_examples=[
            MatchedExample(
                line_text=example.line_text,
                canonical_key=example.canonical_key,
                vendor=example.vendor,
                score=round(score, 3),
            )
            for score, example in matches
        ],
    )
