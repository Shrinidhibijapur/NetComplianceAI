import numpy as np

from app.ai_training.engine import CONFIDENCE_THRESHOLD, classify_line
from app.ai_training.store import TrainingExample, VectorStore


def _fake_embed_fn(texts: list[str]) -> np.ndarray:
    """Deterministic bag-of-words embedding so these tests don't depend on model downloads."""
    vocab = ["ssh", "telnet", "snmp", "ntp", "logging", "unrelated"]
    vectors = []
    for text in texts:
        words = set(text.lower().split())
        vec = np.array([1.0 if w in words else 0.0 for w in vocab], dtype="float32")
        norm = np.linalg.norm(vec)
        vectors.append(vec / norm if norm else vec)
    return np.stack(vectors)


def test_store_search_returns_closest_match_first():
    store = VectorStore(embed_fn=_fake_embed_fn)
    store.build(
        [
            TrainingExample(id=1, vendor="cisco_ios", line_text="ssh version enabled", canonical_key="ssh_version"),
            TrainingExample(id=2, vendor="cisco_ios", line_text="ntp server configured", canonical_key="ntp_configured"),
        ]
    )
    results = store.search("ssh access on", k=2)
    assert results[0][1].canonical_key == "ssh_version"


def test_classify_line_high_similarity_auto_suggests():
    store = VectorStore(embed_fn=_fake_embed_fn)
    store.build([TrainingExample(id=1, vendor="sonic", line_text="ssh enabled", canonical_key="ssh_version")])

    result = classify_line(store, "ssh enabled")
    assert result.suggested_canonical_key == "ssh_version"
    assert not result.needs_labeling
    assert result.confidence >= CONFIDENCE_THRESHOLD


def test_classify_line_low_similarity_routes_to_human():
    store = VectorStore(embed_fn=_fake_embed_fn)
    store.build([TrainingExample(id=1, vendor="sonic", line_text="ssh enabled", canonical_key="ssh_version")])

    result = classify_line(store, "unrelated garbage text")
    assert result.suggested_canonical_key is None
    assert result.needs_labeling


def test_classify_line_empty_store_routes_to_human():
    store = VectorStore(embed_fn=_fake_embed_fn)
    result = classify_line(store, "anything")
    assert result.needs_labeling
    assert result.confidence == 0.0


def test_human_label_is_immediately_usable_no_retrain_needed():
    store = VectorStore(embed_fn=_fake_embed_fn)
    store.build([])

    before = classify_line(store, "logging enabled")
    assert before.needs_labeling  # nothing learned yet

    store.add(TrainingExample(id=1, vendor="sonic", line_text="logging enabled", canonical_key="logging_enabled"))

    after = classify_line(store, "logging enabled")
    assert after.suggested_canonical_key == "logging_enabled"
    assert not after.needs_labeling
