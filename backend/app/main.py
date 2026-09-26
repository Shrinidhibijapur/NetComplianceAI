from fastapi import FastAPI

from .compliance.routes import router as compliance_router
from .db import Base, engine
from .ingestion.routes import router as ingestion_router

app = FastAPI(title="ComplianceAI", version="0.1.0")

Base.metadata.create_all(bind=engine)

app.include_router(ingestion_router)
app.include_router(compliance_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
