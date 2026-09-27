from dataclasses import dataclass
from typing import Callable, Optional

import faiss
import numpy as np


@dataclass
class TrainingExample:
    id: int
    vendor: str
    line_text: str
    canonical_key: str


class VectorStore:
    """Nearest-neighbour lookup over human-confirmed (line -> control) examples (Section 4.2).

    Retrieval-based, not a trained classifier: every suggestion is traceable back to the
    specific prior example(s) that justified it, which is what makes it auditable for a
    security-compliance tool.
    """

    def __init__(self, embed_fn: Callable[[list[str]], np.ndarray]):
        self._embed_fn = embed_fn
        self._index: Optional[faiss.IndexFlatIP] = None
        self._examples: list[TrainingExample] = []

    def build(self, examples: list[TrainingExample]) -> None:
        self._examples = list(examples)
        self._index = None
        if self._examples:
            vectors = self._embed_fn([e.line_text for e in self._examples])
            self._index = faiss.IndexFlatIP(vectors.shape[1])
            self._index.add(vectors)

    def add(self, example: TrainingExample) -> None:
        vector = self._embed_fn([example.line_text])
        if self._index is None:
            self._index = faiss.IndexFlatIP(vector.shape[1])
        self._index.add(vector)
        self._examples.append(example)

    def search(self, line_text: str, k: int = 3) -> list[tuple[float, TrainingExample]]:
        if not self._examples or self._index is None:
            return []
        vector = self._embed_fn([line_text])
        k = min(k, len(self._examples))
        scores, indices = self._index.search(vector, k)
        return [
            (float(scores[0][i]), self._examples[indices[0][i]])
            for i in range(k)
            if indices[0][i] != -1
        ]
