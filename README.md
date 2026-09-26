# ComplianceAI

AI-driven multi-vendor network security compliance auditor (SIH26155). See [docs/Implementation_Plan.md](docs/Implementation_Plan.md) for architecture, design rationale, and the phased build plan.

---

## 📁 Repository Structure

```
backend/             FastAPI application (ingestion, normalization, compliance, reporting, ai_training)
frontend/            React web dashboard (Phase 5)
docs/                Implementation plan and architectural design specs
docker-compose.yml   Air-gapped / Local Docker container orchestration
```

---

## 🌐 How Localhost Access Works with Docker

When you run `docker compose up`, Docker forwards network ports from your host machine (`localhost`) into the Docker containers:

- **`http://localhost:8000`** $\rightarrow$ Connects directly to the **FastAPI Backend container**.
- **`http://localhost:8000/docs`** $\rightarrow$ Interactive Swagger UI (Upload files directly in your web browser!).
- **`http://localhost:8000/health`** $\rightarrow$ API Health status endpoint.
- **`localhost:5432`** $\rightarrow$ Connects directly to the **PostgreSQL Database container**.

---

## 🚀 Setup & Run with Docker (Recommended)

Requires only [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 1. Clone & Start Containers

```bash
# Copy example environment file
cp .env.example .env

# Build and start PostgreSQL + FastAPI containers
docker compose up --build -d
```

### 2. Verify in Browser or Terminal

#### Option A: Web Browser (GUI - Interactive)
Open your browser and navigate to:
👉 **`http://localhost:8000/docs`**  
You can test file uploads visually by expanding `/ingest/upload`, clicking **"Try it out"**, choosing a `.cfg` file, and clicking **Execute**.

#### Option B: Terminal (PowerShell / Command Line)

```powershell
# 1. Health check
curl.exe http://localhost:8000/health
# Expect: {"status":"ok"}

# 2. Upload sample Cisco config
curl.exe -X POST http://localhost:8000/ingest/upload `
  -F "file=@backend/tests/fixtures/cisco_ios_sample.cfg" `
  -F "vendor=cisco_ios" `
  -F "device_id=core-sw-01"

# 3. Upload sample Juniper config
curl.exe -X POST http://localhost:8000/ingest/upload `
  -F "file=@backend/tests/fixtures/juniper_junos_sample.cfg" `
  -F "vendor=juniper_junos" `
  -F "device_id=edge-fw-01"
```

### 3. Verify Database Persistence in PostgreSQL

Confirm that uploaded configurations are stored directly in PostgreSQL:

```bash
docker compose exec db psql -U complianceai -d complianceai -c "SELECT id, device_id, vendor, parse_confidence FROM config_records;"
```

### 4. Stopping Containers

```bash
docker compose down          # Stop containers
docker compose down -v       # Stop containers and wipe Postgres volume (clean slate)
```

---

## 💻 Local Development without Docker (SQLite Mode)

If you prefer running FastAPI without Docker during development:

```powershell
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1    # macOS/Linux: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run automated tests
python -m pytest -v

# Start FastAPI server (defaults to local SQLite database complianceai.db)
uvicorn app.main:app --reload
```

---

## 🛠️ Troubleshooting & Tips

- **Check logs**: `docker compose logs backend`
- **Port conflicts (`8000` or `5432`)**: If port 8000 is already in use by a local process, stop the local `uvicorn` instance before starting Docker.
- **Always build after code changes**: `docker compose up --build -d`
