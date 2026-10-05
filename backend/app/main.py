import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .ai_training.bootstrap import bootstrap_vector_store
from .ai_training.routes import router as ai_training_router
from .audit_routes import router as audit_router
from .auth.routes import router as auth_router
from .compliance.routes import router as compliance_router
from .config import CORS_ORIGINS
from .db import Base, SessionLocal, engine, seed_default_users
from .ingestion.routes import router as ingestion_router
from .middleware import RateLimiterMiddleware, SecurityHeadersMiddleware
from .reporting.routes import router as reporting_router
from .tasks.routes import router as tasks_router

logger = logging.getLogger("complianceai")

app = FastAPI(
    title="ComplianceAI",
    version="0.6.0",
    description="Enterprise Multi-Vendor Network Security Compliance Auditor",
)

# Security & CORS Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimiterMiddleware, requests_per_minute=120, login_per_minute=10)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler to prevent leaking internal stack traces or secrets."""
    logger.error("Unhandled exception at %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected internal security or processing error occurred."},
    )


# Database & AI Bootstrap
Base.metadata.create_all(bind=engine)
with SessionLocal() as session:
    seed_default_users(session)

bootstrap_vector_store()

# Register Routers
app.include_router(auth_router)
app.include_router(ingestion_router)
app.include_router(compliance_router)
app.include_router(reporting_router)
app.include_router(ai_training_router)
app.include_router(audit_router)
app.include_router(tasks_router)


@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok", "version": "0.6.0"}
