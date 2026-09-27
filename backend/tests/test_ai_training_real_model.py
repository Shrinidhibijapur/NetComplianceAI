"""Slower integration test using the real sentence-transformers model (downloads/caches on
first run). Proves the AI training loop actually generalizes to unseen vendor syntax, not just
to the fake embedder used in test_ai_training.py."""

from app.ai_training.embedder import embed
from app.ai_training.engine import classify_line
from app.ai_training.seed_examples import SEED_EXAMPLES
from app.ai_training.store import TrainingExample, VectorStore


def test_unseen_sonic_ssh_line_matches_seeded_ssh_examples():
    store = VectorStore(embed_fn=embed)
    store.build(
        [TrainingExample(id=i, **ex) for i, ex in enumerate(SEED_EXAMPLES)]
    )

    # SONiC-style line, exact wording never seen in the seed set (Section 4.3's promise).
    result = classify_line(store, "config ssh-server enable version2")

    # Similarity alone points the right way even for unseen phrasing...
    assert result.matched_examples[0].canonical_key == "ssh_version"
    # ...but confidence lands below the auto-accept threshold, so a human confirms it once
    # (Section 4.2's "never silently trusted" rule) rather than the system guessing outright.
    assert result.needs_labeling
    assert result.suggested_canonical_key is None

    # Human confirms it once -> the exact same line is now auto-classified, no retrain needed.
    store.add(TrainingExample(id=999, vendor="sonic", line_text="config ssh-server enable version2", canonical_key="ssh_version"))
    after_labeling = classify_line(store, "config ssh-server enable version2")
    assert after_labeling.suggested_canonical_key == "ssh_version"
    assert not after_labeling.needs_labeling


def test_unrelated_sonic_line_is_not_forced_into_a_wrong_bucket():
    store = VectorStore(embed_fn=embed)
    store.build([TrainingExample(id=i, **ex) for i, ex in enumerate(SEED_EXAMPLES)])

    result = classify_line(store, "hostname sonic-leaf-01")
    assert result.needs_labeling
