FROM python:3.11-slim

# System libs WeasyPrint needs for PDF rendering (Phase 3) & non-root user setup.
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-liberation \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -g 10001 appuser \
    && useradd -u 10001 -g appuser -s /bin/bash -m appuser \
    && mkdir -p /app /opt/hf \
    && chown -R appuser:appuser /app /opt/hf

WORKDIR /app
COPY --chown=appuser:appuser requirements.lock requirements.txt ./

# Locked resolved dependencies installation (satisfies Sonar docker:S8544)
RUN pip install --no-cache-dir --only-binary :all: \
    --index-url https://download.pytorch.org/whl/cpu \
    --extra-index-url https://pypi.org/simple \
    -r requirements.lock

# Bake embedding model into image so container never needs network at runtime.
ENV HF_HOME=/opt/hf
RUN python -c \
    "from sentence_transformers import SentenceTransformer; \
SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"
ENV HF_HUB_OFFLINE=1

COPY --chown=appuser:appuser app ./app
RUN chown -R appuser:appuser /app

USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
