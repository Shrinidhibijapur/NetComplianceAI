# Problem Statement, Explained

## 1. The one-line version

Build a tool where you upload a network device's config file (from **any** vendor), and it tells you **what is insecure, how bad it is, and the exact commands to fix it**, even for vendors it has never seen before.

## 2. Simple analogy

Think of a **building inspector**.

- Buildings = network devices (firewalls, routers, switches).
- Building code = security standards (CIS, NIST, STIG, ISO 27001).
- The inspector walks in and checks: fire exits present? Wiring safe? Locks working?

Today, the inspector has two bad options:

1. Check everything by hand with a paper checklist (slow, error-prone).
2. Buy an expensive tool that only works on one brand of building (vendor lock-in).

And every brand writes its blueprints in a different language. This project is **one inspector who can read any blueprint**, and can be taught new languages on the fly.

## 3. Who is this for? (Users)

| Who | What they need |
|---|---|
| **Network / security administrators** | Check many devices against standards without reading each config by hand |
| **Compliance / audit teams** | Proof (PDF reports) that devices meet CIS / NIST / STIG / ISO |
| **Enterprises with mixed hardware** | One place to check Cisco, Palo Alto, Juniper, Arista, MikroTik, etc. together |
| **MSPs / consultants** | Audit customers' varied networks without buying per-vendor tools |

## 4. What problem are we solving?

### 4.1 Misconfiguration causes breaches
Network devices guard the data. A single bad setting (Telnet left on, weak passwords, no logging, open ACLs) can be the hole attackers use. Security frameworks list the right settings ("hardening rules"), for example:

- Disable insecure protocols (Telnet, HTTP)
- Use SSH version 2
- Use strong encryption
- Restrict access with ACLs
- Log all admin access

### 4.2 Two gaps in how this is done today

**Gap 1: Syntactic diversity.** Every vendor writes the same idea differently.
"Set a session timeout" or "require a strong password" looks completely different on Cisco IOS vs Juniper SRX vs Palo Alto. Different command syntax, different structure, different OS versions.

**Gap 2: Scalability.** Networks keep changing: white-box switches (SONiC, Cumulus), cloud security groups (AWS/Azure), AI-cluster hardware. Traditional parsers are hard-coded per vendor, so they break or don't exist for anything new.

### 4.3 There is no single "source of truth"
Admins running mixed networks have no central place that says "here is the compliance state of every device."

## 5. The proposed solution

An **AI-augmented, vendor-agnostic Compliance Engine**. Instead of hard-coding every vendor's commands, it uses pattern recognition / NLP to understand configs.

### The pipeline

```
Config file (any vendor)
        |
        v
1. NORMALIZATION     -> convert to a vendor-neutral JSON ("Security Baseline Model")
        |                 e.g. { "ssh_version": 2, "telnet_enabled": false, "timeout": 300 }
        v
2. DEVIATION ANALYSIS -> compare against chosen framework (CIS / NIST / STIG / ISO)
        |                 e.g. rule: ssh_version must be 2 -> PASS / FAIL
        v
3. REPORT            -> PDF per device: identity, findings + severity, fix commands
```

### The "training loop" (the clever part)
When the engine meets a config line it does not understand:

1. It flags the raw, unrecognized lines.
2. The admin sees them in a GUI and picks a meaning with low-code mapping, e.g. *"this command sets the timeout limit."*
3. The engine updates its rules/heuristics and **learns that vendor's syntax with no code redeploy**.

Next time, that vendor's config parses automatically.

## 6. Required features

1. **Unified Ingestion Engine**: dashboard to upload one or many config files from any device.
2. **AI-Powered Training Module**: GUI to map unknown commands to compliance parameters.
3. **Multi-Framework Compliance Engine**: evaluate against CIS, NIST SP 800-53, DISA STIGs, ISO/IEC 27001 (user selects).
4. **Actionable Intelligence and PDF Reporting**, one PDF per device containing:
   - **Device identification**: serial number, model, hardware and OS details
   - **Compliance findings**: Pass/Fail plus risk severity
   - **Remediation**: device-specific, step-by-step CLI commands to fix each failure
5. **Vendor-Agnostic Scalability**: modular design; add new vendors, standards and OS versions through data/config, not code changes.

## 7. Key terms

| Term | Meaning |
|---|---|
| **CIS Benchmarks** | Community-written secure configuration guides per product |
| **NIST SP 800-53** | US government catalog of security controls |
| **DISA STIG** | US Dept. of Defense hardening guides |
| **ISO/IEC 27001** | International information-security management standard |
| **Normalization** | Translating vendor-specific config into one common structure |
| **Baseline Model** | The common structure (vendor-neutral schema) |
| **Remediation** | The commands that fix a failed check |
| **White-box networking** | Generic hardware running open network OSes (SONiC, Cumulus) |

## 8. Suggested development order

1. **Normalization**: CLI text -> structured JSON.
2. **Compliance engine**: rule logic; optionally Netmiko / NAPALM for collecting configs.
3. **AI/ML**: NLP or pattern matching to spot keywords in unseen formats; training UI feeds this.
4. **Reporting**: dynamic PDFs (ReportLab / FPDF) tailored to device model and software version.

## 9. What "success" looks like

- Upload a Cisco config and a Juniper config; both are checked against the same CIS rule set.
- Upload a config from an unknown vendor; the system asks the admin to label a few lines, then parses it from then on.
- Each device gets a PDF: what it is, what failed, how severe, and the exact commands to fix it.
- Adding a new vendor or standard needs no code change.
