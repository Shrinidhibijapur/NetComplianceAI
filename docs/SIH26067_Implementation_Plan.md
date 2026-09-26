# SIH26067 — AI-Driven Multi-Vendor Network Security Compliance Auditor
**Organization:** National Technical Research Organisation (NTRO) | **Theme:** Blockchain & Cybersecurity | **Category:** Software

---

## 0. What's different from the draft you pasted

Your draft (from the reference doc) is a solid *problem restatement* but is thin as a *buildable* plan in four places, fixed below:

1. **The "AI training loop" is hand-wavy.** "The AI engine will update its internal heuristics" doesn't say what model, what representation, or what happens to old mappings. Section 4 replaces this with a concrete active-learning pipeline.
2. **Data sensitivity is never addressed — and this is the single biggest risk for an NTRO submission.** Network configs contain admin password hashes, SNMP community strings, ACL logic, and topology info. Judges *will* ask "where does the config data go." Section 6 makes on-prem/offline AI a hard requirement, not an implementation detail.
3. **"Vendor-agnostic from scratch" is unrealistic and unnecessary.** The industry already has open-source, battle-tested parsers covering most common vendors (Cisco, Juniper, Arista, Fortinet, etc.). Building your own NLP parser from zero would burn your hackathon time re-solving a solved problem. Section 3 proposes a hybrid: reuse existing parsers for known vendors, fall back to your AI/training loop only for the genuinely unknown ~20%.
4. **PDF reporting is under-specified** ("using ReportLab or FPDF") — fine as a library choice, but says nothing about how a demo-ready report actually gets designed. Section 5 gives a concrete template approach.

Everything else in your original scope (multi-framework support, bulk ingestion, remediation CLI generation) is kept and detailed further below.

---

## 1. Problem Restatement (verified)

Enterprise/government networks run heterogeneous multi-vendor hardware. Security frameworks (CIS Benchmarks, NIST SP 800-53, DISA STIGs, ISO/IEC 27001) define hardening rules, but each vendor expresses the same control in different CLI syntax. Today's options are manual checklist audits (slow, error-prone) or expensive vendor-locked NMS suites (inflexible, no cross-vendor normalization). The ask: an AI-augmented engine that normalizes arbitrary vendor configs into a common schema, checks them against chosen frameworks, and — critically — can be *taught* to understand a vendor format it has never seen, without a code redeploy.

This restatement matches the source document; no correction needed here.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Web Dashboard (React)                        │
│   Upload · Framework selection · Results view · Training UI      │
└───────────────────────────┬────────────────────────────────────┘
                             │ REST/WebSocket
┌───────────────────────────▼────────────────────────────────────┐
│                     API / Orchestration Layer (FastAPI)          │
└───────┬───────────────┬───────────────┬──────────────┬──────────┘
        │               │               │              │
┌───────▼──────┐ ┌──────▼───────┐ ┌─────▼──────┐ ┌─────▼──────────┐
│  Ingestion &  │ │ Normalization │ │ Compliance │ │  Reporting      │
│  Vendor       │ │ Engine        │ │ Rule       │ │  Engine         │
│  Detection    │ │ (Known-vendor │ │ Engine     │ │ (Jinja2 +       │
│               │ │ parsers + AI  │ │ (rules per │ │  WeasyPrint)    │
│               │ │ fallback)     │ │ framework) │ │                 │
└───────┬───────┘ └──────┬───────┘ └─────┬──────┘ └─────────────────┘
        │                │                │
        │         ┌──────▼───────┐        │
        │         │ Active-      │        │
        │         │ Learning /   │        │
        │         │ Training     │        │
        │         │ Store        │        │
        │         └──────────────┘        │
        └────────────────┬─────────────────┘
                          │
                 ┌────────▼────────┐
                 │  PostgreSQL +    │
                 │  Object store    │
                 │  (configs, jobs, │
                 │  learned rules)  │
                 └─────────────────┘
```

**Deployment note:** the whole stack should be designed to run **fully on-prem / air-gapped** (Docker Compose or a small K8s cluster). No component should require an external API call at runtime — see Section 6.

---

## 3. Normalization Layer — the hybrid approach

Don't build a parser from zero. Layer it:

| Layer | What it handles | Tooling |
|---|---|---|
| **L1 — Known-vendor structured parsing** | Cisco IOS/IOS-XE/NX-OS, Juniper Junos, Arista EOS, Fortinet, Palo Alto, HPE/Aruba, and ~50 more | [`ntc-templates`](https://github.com/networktocode/ntc-templates) (community-maintained TextFSM template library, vendor+command → structured dict) as the first pass. This alone will correctly parse the majority of configs you'll be demoed with. |
| **L2 — Structured-data devices** | Devices that expose config as XML/YANG/JSON already (Junos NETCONF, some Cisco IOS-XE via RESTCONF) | Skip text parsing entirely — parse the structured export directly. Higher reliability where available. |
| **L3 — Unknown/unrecognized vendor** | Anything L1/L2 can't classify with high confidence | Your AI fallback — see Section 4. This is where the actual novelty and SIH "AI" requirement lives. |

This gives you a demo-safe path (L1 covers your test data reliably) *and* a genuine AI story (L3 is the differentiator judges will ask about) — rather than betting the whole demo on an NLP model parsing Cisco IOS from scratch live on stage.

**Normalized schema** (the "Security Baseline Model") — keep it flat and framework-agnostic, e.g.:

```json
{
  "device_id": "core-sw-01",
  "vendor": "cisco_ios",
  "os_version": "17.3.4",
  "serial_number": "FDO12345ABC",
  "parsed_at": "2026-09-26T10:00:00Z",
  "controls": {
    "ssh_version": "2",
    "telnet_enabled": false,
    "http_mgmt_enabled": false,
    "password_encryption": "type8",
    "logging_enabled": true,
    "ntp_configured": true,
    "acl_default_deny": true,
    "snmp_community_default": false
  },
  "raw_unmapped_lines": ["..."],
  "parse_confidence": 0.94
}
```

`controls` keys are your **canonical vocabulary** — every framework rule (CIS, NIST, STIG, ISO) maps to one or more of these keys, not to vendor syntax. This is what makes the compliance engine framework-agnostic.

---

## 4. AI/ML Layer — concrete design (replaces the vague "training loop")

### 4.1 Classification, not free-form generation
Don't have the model *generate* interpretations of unknown config lines — have it **classify** each unrecognized line against your fixed canonical control vocabulary (the `controls` keys above). Classification is far more reliable, auditable, and testable than generative interpretation, and it's what actually gets used by the compliance engine downstream.

### 4.2 Pipeline
1. **Embed** each unrecognized config line (a local sentence-embedding model, e.g. a small `sentence-transformers` model run on-prem — no external API).
2. **Nearest-neighbour match** against a growing vector store of *previously confirmed* (line → control) mappings, seeded initially with a small hand-labeled set (~200–500 examples across a few vendors is enough to bootstrap).
3. **Confidence threshold:**
   - High similarity → auto-map, but flagged as "AI-suggested" in the report (never silently trusted for a security-critical tool).
   - Low similarity → route to the **Interactive Training Interface** for a human to label.
4. **Human labels it** → the (line, control, vendor) triple is added to the vector store. No retraining/redeploy needed — this *is* the "learning" your draft describes, made concrete: it's incremental retrieval-augmented classification, not a black-box model update.
5. Optionally, periodically distill the accumulated labeled set into a lightweight supervised classifier (e.g. a small fine-tuned encoder) once you have enough data — but the retrieval approach alone is enough for a working SIH prototype and is much easier to explain/defend to judges ("why did it classify this line as X" → "because it's closest to these 3 human-confirmed examples").

### 4.3 Why this over a full LLM
An LLM (via API) would look impressive but is the wrong tool here: it's non-deterministic, hard to justify for a security-audit finding ("the AI said so" is not an acceptable audit trail), and — per Section 6 — sending real network configs to an external LLM API is very likely disqualifying for an NTRO-sponsored problem statement. Embedding + retrieval + human-confirmed labels gives you auditability (you can always show *which* prior example justified a classification) and stays fully offline.

---

## 5. Compliance Engine & Reporting

- **Rule format:** one YAML/JSON rule per control, per framework, e.g.:
  ```yaml
  - control_id: CIS-9.2.1
    framework: CIS
    canonical_key: telnet_enabled
    expected: false
    severity: high
    remediation:
      cisco_ios: "line vty 0 4\n transport input ssh"
      juniper_junos: "delete system services telnet"
  ```
  This lets non-coders extend framework coverage by editing YAML, not Python — matches your "modular architecture" requirement and is genuinely low-code.
- **Evaluation:** simple rule engine walks each device's normalized `controls` dict against the selected framework's rule set → Pass/Fail/Not-Applicable + severity.
- **Reporting:** generate an HTML report from a Jinja2 template (device ID, serial, findings table, remediation commands, AI-confidence flags) and render to PDF with **WeasyPrint** rather than hand-drawing with ReportLab — much faster to get a polished, demo-ready layout since you're styling with CSS instead of positioning text boxes by pixel coordinates. FPDF/ReportLab remain fine fallbacks if WeasyPrint's system dependencies (Pango/Cairo) are a problem in your deployment environment.

---

## 6. Data Sensitivity & Deployment — non-negotiable for this PS

This is an NTRO problem statement referencing NCIIPC — the configs being audited are, by definition, sensitive critical-infrastructure data. Build this in from day one, not as a "future work" bullet:

- **No config data leaves the deployment environment.** No calls to external AI/LLM APIs at inference time. All embedding models and classifiers run locally (open-weight models, CPU or small GPU is enough for line-level classification).
- **Secrets handling:** password hashes, SNMP strings, pre-shared keys appearing in configs should be detected and redacted/masked before storage and before appearing in any report or training UI.
- **Storage:** encrypt configs and reports at rest; role-based access on the dashboard.
- **Offline-first packaging:** ship as a Docker Compose bundle so it can run in an air-gapped lab — directly matches how NTRO/NCIIPC environments actually operate, and is worth stating explicitly in your pitch as a design decision, not an afterthought.

---

## 7. Suggested Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Backend API | FastAPI (Python) | async, good for job orchestration, easy OpenAPI docs for demo |
| Parsing (L1) | `ntc-templates` + `textfsm` | mature multi-vendor coverage, saves weeks of work |
| Structured collection (L2, optional live-device mode) | Netmiko / NAPALM | if you extend beyond file-upload to live SSH pull, these are the standard libraries |
| Embeddings | `sentence-transformers` (local) | offline, small, fast enough for line classification |
| Vector store | FAISS (in-process) or Qdrant (if you want a service) | no external dependency, easy to demo |
| Rule engine | custom YAML-rule evaluator (small, ~200 lines) | simplest thing that works; avoid over-engineering with OPA/Rego unless the team already knows it |
| Reporting | Jinja2 + WeasyPrint | polished PDFs without manual layout code |
| Frontend | React + a component library (e.g. MUI) | fast to build upload/training/results screens |
| Jobs/queue | Celery + Redis (or simple FastAPI background tasks if scale is small for the demo) | needed for bulk upload processing |
| DB | PostgreSQL | devices, jobs, rules, audit trail |
| Deployment | Docker Compose | matches the air-gapped requirement above |

---

## 8. Demo-Critical Path (what to build first)

For a hackathon, build in this order so you always have something working to show:

1. File upload → L1 parsing (`ntc-templates`) for 2–3 common vendors (e.g. Cisco IOS, Juniper) → normalized schema.
2. Static rule set for CIS (a handful of controls) → Pass/Fail table on screen.
3. PDF report generation from the Jinja2 template.
4. **Then** layer in the AI/training loop (Section 4) as the "wow" feature on top of an already-working core — this is also the safer order if time runs short, since 1–3 alone is already a demoable, useful tool.
5. Bulk upload + multi-framework selection as polish, if time remains.

---

## 9. Open Questions to Settle With Your Team

- Live-device pull (Netmiko/NAPALM over SSH) vs. file-upload-only for v1 — file upload is far simpler and matches the PS wording ("configuration file is ingested"); recommend starting there.
- How many framework/control mappings you'll hand-author for the demo (don't try to cover all of CIS+NIST+STIG+ISO exhaustively — pick ~15–20 high-signal controls per framework that map cleanly to your canonical schema).
- Whether to seed the embedding/training store with configs you generate yourselves (safe, synthetic) rather than any real device data.
