# ComplianceAI

AI-driven multi-vendor network security compliance auditor (SIH26155). Upload a raw device
config from any vendor, get it normalized into one schema (known vendors parse instantly,
unrecognized syntax routes to a self-improving AI trainer), evaluate it against CIS / NIST
SP 800-53 / DISA STIG / ISO 27001, and export a branded PDF audit report — no sign-up, runs
fully offline. See [docs/Implementation_Plan.md](docs/Implementation_Plan.md) for architecture,
design rationale, and the phased build plan.

---

## 📁 Repository Structure

```
backend/             FastAPI application (ingestion, normalization, compliance, reporting, ai_training)
frontend/            React + TypeScript dashboard (Vite)
docs/                Implementation plan and architectural design references
docker-compose.yml   Air-gapped / local Docker container orchestration
```

---

## 🚀 Quick Start (local dev, no Docker)

This is the fastest way to run the project on your own machine. You'll need **two terminal
windows open at the same time** — one keeps the backend server running, the other keeps the
frontend server running. Leave both running while you use the app.

### Prerequisites

Install these first if you don't already have them:

- **Python 3.11+** — [python.org/downloads](https://www.python.org/downloads/). Check with `python --version`.
- **Node.js 18+** (includes `npm`) — [nodejs.org](https://nodejs.org/). Check with `node --version`.
- **Git** — to clone the repository.

You do **not** need Docker, PostgreSQL, or any account/API key to run this locally — the
default setup uses a local SQLite file and everything runs offline.

### Step 1 — Clone the repository

```bash
git clone <this-repo-url>
cd ComplianceAI
```

### Step 2 — Start the backend (Terminal 1)

```powershell
cd backend

# Create an isolated Python environment (first time only)
python -m venv .venv

# Activate it — you must re-run this every time you open a new terminal
.venv\Scripts\Activate.ps1        # Windows PowerShell
# .venv\Scripts\activate.bat      # Windows cmd.exe
# source .venv/bin/activate       # macOS / Linux

# Install backend dependencies (first time only, or after requirements.txt changes)
pip install -r requirements.txt

# Start the API server, auto-reloads on code changes
uvicorn app.main:app --reload --port 8000
```

Leave this terminal running. You should see `Uvicorn running on http://127.0.0.1:8000`.
Verify it's alive by opening `http://localhost:8000/health` in a browser — it should return
`{"status":"ok"}`. The API stores data in a local `backend/complianceai.db` SQLite file that's
created automatically on first run — no database setup needed.

### Step 3 — Start the frontend (Terminal 2, new window)

```powershell
cd frontend

# Install frontend dependencies (first time only, or after package.json changes)
npm install

# Start the dev server
npm run dev -- --port 5173
```

Leave this terminal running too. It will print a local URL — open
**`http://localhost:5173`** in your browser. By default the dashboard talks to the backend at
`http://localhost:8000`; if your backend runs somewhere else, create a `frontend/.env` file
with `VITE_API_URL=http://your-backend-host:port` before starting.

### Step 4 — Use the app

1. You land on the landing page — click **Launch Console**.
2. **Upload tab**: upload a device config. No file of your own? Click one of the bundled
   sample-config chips (a hardened Cisco device, a Juniper device that needs hardening, and an
   unrecognized "whitebox" vendor to demo the AI training loop) to auto-fill the form, then hit
   **Ingest config**.
3. **Devices tab**: your uploaded device appears as a card. Click it to expand, pick a
   framework (CIS / NIST / STIG / ISO), click **Evaluate**, then **Download PDF report** for
   the branded audit report.
4. **AI Training tab**: if a device had config lines the parser didn't recognize, they show up
   here — pick the canonical control they map to and confirm; every future device using that
   same phrasing is then auto-classified.

### Stopping everything

Press `Ctrl+C` in each terminal to stop the backend and frontend servers.

---

## 🐳 Docker (Postgres-backed)

```bash
cp .env.example .env
docker compose up --build -d
```

- `http://localhost:8000` → FastAPI backend container
- `http://localhost:8000/docs` → Swagger UI (upload files directly in the browser)
- `http://localhost:8000/health` → health check
- `localhost:5432` → PostgreSQL container

```bash
docker compose logs backend      # tail logs
docker compose down              # stop
docker compose down -v           # stop + wipe the Postgres volume
```

The frontend is not containerized yet — run it with `npm run dev` against the Dockerized
backend (`http://localhost:8000`).

---

## 🔌 API Reference (backend)

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/health` | Liveness check |
| `POST` | `/ingest/upload` | Upload one config (`file`, `vendor`, `device_id` form fields) |
| `POST` | `/ingest/bulk` | Upload a batch (`files[]`, `vendors[]`, `device_ids[]`) |
| `GET`  | `/ingest/records` | List every ingested device |
| `GET`  | `/compliance/frameworks` | List supported frameworks (CIS, NIST, STIG, ISO) |
| `POST` | `/compliance/evaluate` | Evaluate a config (`config_id`, `framework`) → findings + summary |
| `GET`  | `/reporting/{config_id}/pdf?framework=CIS` | Download the branded PDF audit report |
| `GET`  | `/ai-training/pending/{config_id}` | List unmapped config lines awaiting a label |
| `POST` | `/ai-training/label` | Confirm a line → canonical control mapping (auto-classifies future devices) |

Example end-to-end curl flow:

```powershell
curl.exe http://localhost:8000/health

curl.exe -X POST http://localhost:8000/ingest/upload `
  -F "file=@your_config.cfg" -F "vendor=cisco_ios" -F "device_id=core-sw-01"
# note the returned "id"

curl.exe -X POST http://localhost:8000/compliance/evaluate `
  -H "Content-Type: application/json" `
  -d '{\"config_id\": 1, \"framework\": \"CIS\"}'

curl.exe -o report.pdf "http://localhost:8000/reporting/1/pdf?framework=CIS"
```

Error paths return clean status codes, not crashes: an unknown framework is a `400`, a
non-existent `config_id` is a `404`.

---

## 🧪 Tests

```powershell
cd backend
python -m pytest -v
```

```powershell
cd frontend
npm run build      # tsc type-check + production build
```

---

## 🛠️ Troubleshooting

- **Port 8000/5173 already in use** — stop the process holding it before restarting
  (`Get-NetTCPConnection -LocalPort 8000` in PowerShell), or pick a different `--port`.
- **Frontend can't reach the backend** — confirm `uvicorn` is running and CORS is enabled
  (it is, by default, for local dev); set `VITE_API_URL` if the API isn't on `localhost:8000`.
- **Docker: always rebuild after code changes** — `docker compose up --build -d`.
- **Locked/stale SQLite file** — stop the running `uvicorn` process before deleting
  `backend/complianceai.db` to reset local data.
