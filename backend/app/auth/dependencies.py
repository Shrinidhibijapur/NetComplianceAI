import os
from typing import Annotated, Callable

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from ..db import User, get_db
from .security import decode_access_token

# Permissive dev fallback allows existing tests and local unauthenticated scripts to execute
DEV_AUTH_FALLBACK = os.environ.get("DEV_AUTH_FALLBACK", "true").lower() in ("true", "1", "yes")

# Default mock user for unauthenticated requests when fallback is active
FALLBACK_USER = User(
    id=1,
    username="admin",
    email="admin@compliance.ai",
    password_hash="",
    role="admin",
    active=1,
)


def get_current_user_optional(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> User | None:
    """Extract user from Bearer JWT header. Returns None if missing/invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        return FALLBACK_USER if DEV_AUTH_FALLBACK else None

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    if not payload:
        return FALLBACK_USER if DEV_AUTH_FALLBACK else None

    username = payload.get("sub")
    if not username:
        return FALLBACK_USER if DEV_AUTH_FALLBACK else None

    user = db.query(User).filter(User.username == username, User.active == 1).first()
    if not user and DEV_AUTH_FALLBACK:
        return FALLBACK_USER
    return user


def get_current_user(
    opt_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
) -> User:
    """Require valid authenticated user (401 if unauthenticated)."""
    if opt_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided or are invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return opt_user


def require_role(allowed_roles: list[str]) -> Callable:
    """Dependency factory enforcing role-based access control (RBAC)."""

    def role_checker(curr_user: User = Depends(get_current_user)) -> User:
        if curr_user.role not in allowed_roles and "admin" not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action prohibited: requires one of roles {allowed_roles}",
            )
        # Admin super-user bypass
        if curr_user.role == "admin" or curr_user.role in allowed_roles:
            return curr_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Action prohibited: user role '{curr_user.role}' lacks required permission",
        )

    return role_checker
