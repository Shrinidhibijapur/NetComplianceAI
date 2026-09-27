from .embedder import embed
from .store import VectorStore

vector_store = VectorStore(embed_fn=embed)
