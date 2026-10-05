from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..audit import log_event
from ..db import User, get_db
from .dependencies import get_current_user, require_role
from .security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str | None
    role: str
    active: bool
    created_at: str


class CreateUserRequest(BaseModel):
    username: str
    password: str
    email: str | None = None
    role: str = "viewer"  # "admin" | "auditor" | "viewer"


@router.post(
    "/login",
    response_model=LoginResponse,
    responses={
        401: {"description": "Invalid credentials or inactive account"},
        422: {"description": "Validation error"},
    },
)
def login(payload: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> LoginResponse:
    """Authenticate user with username/password and return signed JWT bearer token."""
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        log_event(
            db,
            "login_failed",
            subject=payload.username,
            status="failure",
            details={"reason": "invalid_credentials"},
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.active:
        log_event(
            db,
            "login_failed",
            subject=payload.username,
            status="failure",
            details={"reason": "account_inactive"},
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled",
        )

    token = create_access_token({"sub": user.username, "role": user.role, "id": user.id})
    log_event(
        db,
        "login_success",
        subject=user.username,
        actor=user.username,
        status="success",
        details={"role": user.role},
    )
    db.commit()

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        username=user.username,
        role=user.role,
    )


@router.get("/me", response_model=UserOut)
def get_me(user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    """Return profile details of the currently authenticated user."""
    created_str = user.created_at.isoformat() if user.created_at else ""
    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        active=bool(user.active),
        created_at=created_str,
    )


@router.post("/logout")
def logout(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """Logout current user and log audit entry."""
    log_event(db, "logout", subject=user.username, actor=user.username, status="success")
    db.commit()
    return {"status": "logged_out"}


@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_role(["admin"]))],
) -> list[UserOut]:
    """Admin-only: list all system users."""
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        UserOut(
            id=u.id,
            username=u.username,
            email=u.email,
            role=u.role,
            active=bool(u.active),
            created_at=u.created_at.isoformat() if u.created_at else "",
        )
        for u in users
    ]


@router.post(
    "/users",
    response_model=UserOut,
    responses={
        400: {"description": "Username already exists"},
        403: {"description": "Admin privileges required"},
    },
)
def create_user(
    payload: CreateUserRequest,
    db: Annotated[Session, Depends(get_db)],
    admin_user: Annotated[User, Depends(require_role(["admin"]))],
) -> UserOut:
    """Admin-only: create a new system user with designated role."""
    if payload.role not in ("admin", "auditor", "viewer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be one of: admin, auditor, viewer",
        )

    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with username '{payload.username}' already exists",
        )

    new_user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        active=1,
    )
    db.add(new_user)
    db.flush()

    log_event(
        db,
        "user_created",
        subject=new_user.username,
        actor=admin_user.username,
        status="success",
        details={"role": new_user.role},
    )
    db.commit()

    return UserOut(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        role=new_user.role,
        active=bool(new_user.active),
        created_at=new_user.created_at.isoformat() if new_user.created_at else "",
    )
