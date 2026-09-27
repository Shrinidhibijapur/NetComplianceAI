from fastapi import FastAPI

from .ai_training.bootstrap import bootstrap_vector_store
from .ai_training.routes import router as ai_training_router
from .compliance.routes import router as compliance_router
from .db import Base, engine
from .ingestion.routes import router as ingestion_router
from .reporting.routes import router as reporting_router

app = FastAPI(title="ComplianceAI", version="0.1.0")

Base.metadata.create_all(bind=engine)
bootstrap_vector_store()

app.include_router(ingestion_router)
app.include_router(compliance_router)
app.include_router(reporting_router)
app.include_router(ai_training_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
