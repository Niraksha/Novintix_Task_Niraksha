# 🏥 CADUCEUS — Healthcare Agentic AI System

**C**entral **A**gentic **D**irector for **U**niversal **C**linical **E**fficiency & **U**nderstanding **S**ystem

> An orchestrated multi-agent AI system that handles 5,000+ daily patient inquiries across appointments, prescriptions, lab results and insurance — with HIPAA-compliant guardrails and real-time monitoring.

---

## 🏗️ System Architecture

```
Patient Inquiry (Web / SMS / App / Phone)
         │
         ▼
┌─────────────────────────────────┐
│        ORCHESTRATOR             │  ← Intent Classification (Groq)
│   (Python / FastAPI Router)     │  ← Session Isolation
│                                 │  ← Pre/Post Guardrail Checks
└────────────┬────────────────────┘
             │ Routes to
    ┌─────────┼──────────────────────┐
    ▼         ▼         ▼            ▼
┌───────┐ ┌──────┐ ┌────────┐ ┌──────────┐
│Appt.  │ │Rx    │ │Report  │ │Escalation│
│Agent  │ │Agent │ │Agent   │ │Agent     │
└───────┘ └──────┘ └────────┘ └──────────┘
    │         │         │            │
    └─────────┴─────────┴────────────┘
                     │
          ┌──────────▼──────────┐
          │   GUARDRAIL ENGINE  │  ← Medical Advice Blocker
          │   (Pre + Post Check)│  ← PII Detector
          │                     │  ← Session Isolation
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │  MONITORING LAYER   │  ← Real-time Alerts
          │  (Audit + Metrics)  │  ← HIPAA Audit Trail
          └─────────────────────┘
```

---

## 🚀 Quick Start

### 1. Backend (Python + FastAPI)
```bash
cd backend
pip install -r requirements.txt
# Ensure GROQ_API_KEY is in .env
python main.py
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 🤖 Agents & Logic

The system uses **Groq's Llama 3** models for high-speed agentic reasoning.

| Agent | Responsibility | Escalation Trigger |
|-------|---------------|-------------------|
| **Appointment Agent** | Book / reschedule / cancel appointments | Cancellation < 24hrs |
| **Prescription Agent** | Refill validation, drug info | Controlled substances, side effects |
| **Report Agent** | Lab result explanation | Abnormal values |
| **Insurance Agent** | Coverage & claim status | Complex billing disputes |
| **Escalation Agent** | Human handoff | Emergency keywords, low confidence |

---

## 🛡️ Guardrails

- `NO_DIAGNOSIS` — Agents cannot diagnose conditions.
- `NO_PII_EXPOSURE` — Social Security Numbers and other PII are redacted.
- `CRISIS_OVERRIDE` — Self-harm signals trigger immediate emergency escalation.
- `SESSION_ISOLATION` — Zero data leakage between patient sessions.

---

## 📊 Monitoring Dashboard

The real-time dashboard provides:
- **Intent Distribution**: Breakdown of inquiry types.
- **Response Latency**: Real-time timeseries of system speed.
- **Escalation Rate**: % of queries requiring human intervention.
- **FCR Rate**: First Contact Resolution success.
- **Safety Logs**: Immutable audit trail of guardrail violations.

---

## 👥 Team
Built for the Healthcare AI System Design Challenge.
*"In medicine, as in all things, first do no harm."*
