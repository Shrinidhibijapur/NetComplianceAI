import math
from typing import Generic, TypeVar
from pydantic import BaseModel, Field
from sqlalchemy.orm import Query

T = TypeVar("T")


class PageParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page (max 100)")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


def paginate_query(
    query: Query,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list, int, int, int]:
    """Paginate a SQLAlchemy query deterministically. Returns (items, total, page, total_pages)."""
    page = max(1, page)
    page_size = min(max(1, page_size), 100)

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return items, total, page, total_pages
