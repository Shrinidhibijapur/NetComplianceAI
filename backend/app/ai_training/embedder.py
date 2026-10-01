from functools import lru_cache

import numpy as np

# Offline: the weights are downloaded once at Docker build time (backend/Dockerfile) and the image
# sets HF_HUB_OFFLINE=1, so nothing is fetched at runtime. For a local non-Docker run, the first
# start needs internet to populate ~/.cache/huggingface; after that set HF_HUB_OFFLINE=1.
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


class EmbeddingUnavailable(RuntimeError):
    """The embedding model could not be loaded (e.g. not cached and no network)."""


@lru_cache(maxsize=1)
def _model():
    from sentence_transformers import SentenceTransformer

    try:
        return SentenceTransformer(MODEL_NAME)
    except Exception as exc:  # hub/network/cache errors surface as many types
        raise EmbeddingUnavailable(
            f"Embedding model '{MODEL_NAME}' is not available locally: {exc}"
        ) from exc


def embed(texts: list[str]) -> np.ndarray:
    vectors = _model().encode(texts, normalize_embeddings=True)
    return np.asarray(vectors, dtype="float32")
