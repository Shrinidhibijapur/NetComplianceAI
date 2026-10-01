import pytest
from fastapi.testclient import TestClient

from app.ai_training import embedder
from app.ai_training.embedder import EmbeddingUnavailable
from app.main import app

client = TestClient(app)


def test_missing_model_gives_503_not_500(monkeypatch):
    """With no cached model and no network, suggestions fail cleanly and the rest of the API works."""

    def boom(_texts):
        raise EmbeddingUnavailable("model not cached")

    monkeypatch.setattr("app.ai_training.state.vector_store._embed_fn", boom)
    # Use an unknown vendor so all lines go to raw_unmapped_lines → /pending will call embedder
    cid = client.post(
        "/ingest/upload",
        files={"file": ("s.cfg", b"unknown-feature enable\nunknown-setting 42\n", "text/plain")},
        data={"vendor": "totally_unknown_xyz", "device_id": "offline-1"},
    ).json()["id"]

    assert client.get(f"/ai-training/pending/{cid}").status_code == 503
    assert client.get("/health").status_code == 200


def test_model_load_failure_is_wrapped(monkeypatch):
    import sentence_transformers

    def fail(*_a, **_k):
        raise OSError("no network")

    monkeypatch.setattr(sentence_transformers, "SentenceTransformer", fail)
    embedder._model.cache_clear()
    try:
        with pytest.raises(EmbeddingUnavailable):
            embedder.embed(["x"])
    finally:
        embedder._model.cache_clear()
