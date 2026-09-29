from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .ai_training.bootstrap import bootstrap_vector_store
from .ai_training.routes import router as ai_training_router
from .compliance.routes import router as compliance_router
from .db import Base, engine
from .ingestion.routes import router as ingestion_router
from .reporting.routes import router as reporting_router

app = FastAPI(title="ComplianceAI", version="0.1.0")

# Dev/demo CORS — the dashboard is a separate Vite origin. Tighten to specific
# origins before an air-gapped/production deployment (Section 6).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
bootstrap_vector_store()

app.include_router(ingestion_router)
app.include_router(compliance_router)
app.include_router(reporting_router)
app.include_router(ai_training_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
