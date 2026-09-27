from functools import lru_cache

import numpy as np

# ponytail: downloaded from Hugging Face on first use and cached in the container's filesystem —
# fine for a hackathon demo. For a real air-gapped deployment (Section 6), bake the model weights
# into the Docker image at build time instead of fetching them at runtime.
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(MODEL_NAME)


def embed(texts: list[str]) -> np.ndarray:
    vectors = _model().encode(texts, normalize_embeddings=True)
    return np.asarray(vectors, dtype="float32")
