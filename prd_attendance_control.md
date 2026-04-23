# Product Requirements Document (PRD)

**Product:** Attendance Control — Automated Attendance Tracking & Parent Communication System
**Author:** Mohammed Azam
**Date:** April 2026
**Version:** 2.0
**Status:** In Development

---

## 1. Problem Statement

GR University has **10,000 students** and **50 SGAs** (Student Guidance Associates). Each SGA manages ~200 students.

SGAs currently track attendance and notify parents using WhatsApp, phone calls, and Google Sheets. This creates three systemic failures:

| Failure | Impact |
|---------|--------|
| **Delayed detection** | An SGA discovers chronic absenteeism only during end-of-week spreadsheet reviews. By then, the student has missed 5–6 sessions without intervention. |
| **Inconsistent parent communication** | No standard message format. No delivery confirmation. No audit trail. The university cannot verify that a parent was informed. |
| **Unscalable manual effort** | Each SGA spends ~45 min/day on attendance follow-up. Across 50 SGAs, this is **37+ person-hours daily** — zero instructional value. |

At 10K students this workflow is strained. At 20K+ it is unworkable.

---

## 2. Objective

Build a system where **the SGA's only job is decision-making, not data entry.**

Specifically:

1. Replace manual tracking with a session-based attendance lifecycle.
2. Auto-flag students below attendance thresholds — no spreadsheet scanning.
3. Auto-generate and deliver parent notifications on every absence — no manual typing.
4. Provide a single SGA dashboard for cohort-wide visibility.

**Target state:** SGA starts a session, monitors live counters, closes the session. Everything else — flagging, alerting, reporting — happens autonomously.

---

## 3. Users

| Role | Count | System Relationship |
|------|-------|-------------------|
| **SGA** (Primary) | 50 | Manages session lifecycle, reviews requests, monitors cohort, resolves escalated queries |
| **Parent** (Secondary) | ~10,000 | Receives alerts, queries chatbot, views weekly reports, escalates to SGA |
| **Student** (Secondary) | 10,000 | Self-marks attendance during session window, submits requests during grace period |

SGAs are the power users. The system is designed around their daily workflow. Parents interact passively. Students interact once per session.

---

## 4. Current Workflow (As-Is)

```
SGA opens Google Sheet → marks today's date column
    ↓
Faculty sends attendance list via WhatsApp
    ↓
SGA manually enters data into spreadsheet
    ↓
SGA scrolls 200 rows, visually identifies absentees
    ↓
SGA types individual WhatsApp messages to parents
    ↓
No delivery tracking. No standard format. No escalation path.
    ↓
End of week: SGA manually computes percentages, writes summary
    ↓
If SGA is absent, no one picks up the thread
```

**Core pain points:** No real-time visibility. No message standardization. No trend analysis. No accountability trail.

---

## 5. Proposed Solution (To-Be)

### 5.1 Session-Based Attendance Lifecycle

A three-phase model replaces the spreadsheet:

| Phase | Window | Behavior |
|-------|--------|----------|
| **Session** | 9:00–10:00 AM | Students self-mark attendance |
| **Grace** | 10:00–11:00 AM | Students submit requests with reasons; SGA reviews and approves |
| **Closed** | After 11:00 AM | Pending students auto-marked absent; parent alerts auto-generated |

Gap between "student was absent" and "parent was notified" collapses from hours to minutes.

### 5.2 Risk Classification

| Attendance | Risk | Dashboard Behavior |
|-----------|------|-------------------|
| > 85% | 🟢 Low | No flag |
| 75–85% | 🟡 Medium | Visual flag on dashboard |
| < 75% | 🔴 High | Prioritized in SGA view; alert generated |

Risk is **recalculated on every attendance event** — not a static label.

### 5.3 SGA (Student Guidance Associate) Dashboard

Single screen showing all students in a clean, interactive list view with: attendance %, risk level, and ID. Includes search, risk-level filter, sort, live session counters (Pending / Present / Absent), and quick links to Session Control, Reports, and Parent Queries. The entire student row is clickable for frictionless navigation.

### 5.4 Parent Communication Layer

- **Auto-alerts** — AI-generated on every absence, no SGA input required.
- **AI chatbot** — Parents ask questions; system answers using only that student's data.
- **Escalation** — Parent pushes a question to SGA for human review.
- **Weekly reports** — AI-written per-student attendance summaries.

---

## 6. AI Architecture & Agentic Behavior

This section explains **how AI is used** and **why the system qualifies as agentic**.

### 6.1 Agentic Behavior — Event-Driven Autonomy

The system acts **autonomously in response to events**, without requiring SGA input for each action:

| Trigger Event | Autonomous Action | Human Involvement |
|--------------|-------------------|-------------------|
| Session closes with pending students | System marks absent + generates personalized parent alert | None — fully automated |
| Student's attendance drops below 75% | System recalculates risk to HIGH, re-prioritizes in dashboard | SGA sees updated view |
| Parent asks a question via chatbot | System classifies intent + generates data-grounded response | None (unless parent escalates) |
| SGA clicks "Generate Weekly Report" | System computes weekly stats + generates AI-written report | One click — content is automated |
| Parent escalates a query | System moves query to SGA queue with full context | SGA writes manual response |

**Key distinction:** The SGA does not compose alerts, calculate risk, or write reports. The system does. The SGA only acts when human judgment is required (approving requests, responding to escalations).

### 6.2 Data-Grounded AI Responses (No Hallucination)

Every AI-generated output is constrained to **only the student's actual data.** The system enforces this through structured prompts:

```
Prompt Structure:
┌──────────────────────────────────────────────┐
│ SYSTEM INSTRUCTION                           │
│ "You are a school attendance assistant.      │
│  Use ONLY the provided student data.         │
│  Never invent missing facts."                │
├──────────────────────────────────────────────┤
│ STUDENT DATA (injected per-request)          │
│ Name: Rahul                                  │
│ Attendance: 68% (17 of 25 classes)           │
│ Risk: HIGH                                   │
├──────────────────────────────────────────────┤
│ INTENT-SPECIFIC INSTRUCTIONS                 │
│ (varies: greeting / irrelevant / why /       │
│  improve / details)                          │
├──────────────────────────────────────────────┤
│ STRICT RULES                                 │
│ - Do not make up data                        │
│ - Do not answer off-topic questions           │
│ - 2-5 sentences max, no markdown             │
└──────────────────────────────────────────────┘
```

The AI **never has free access to generate arbitrary content.** It receives only the specific student's record and must respond within the boundaries defined by the intent classifier.

### 6.3 Intent Classification (Parent Chatbot)

Before the AI generates a response, the system classifies the parent's question:

| Intent | Example Input | System Behavior |
|--------|--------------|----------------|
| `greeting` | "Hi", "Good morning" | Polite welcome; asks how to help |
| `irrelevant` | "Tell me a joke", "What's the weather?" | Hard rejection: *"This assistant is only for student-related information."* |
| `why` | "Why is attendance low?" | Explains data; does not guess causes |
| `improve` | "How can my child improve?" | Gives actionable suggestions based on attendance record |
| `details` | "How is my child doing?" | Full attendance summary with risk explanation |

This prevents the chatbot from being misused as a general-purpose AI assistant.

### 6.4 Fallback Architecture

Every AI feature has a **deterministic fallback** that activates when the Gemini API is unavailable:

| Feature | AI Mode | Fallback Mode |
|---------|---------|--------------|
| Parent alert | Gemini-generated personalized message | Pre-vetted template with student data interpolated |
| Absence alert | Gemini-generated session-specific notification | Template with slot, name, and attendance % filled in |
| Weekly report | Gemini-generated weekly summary | Template with present/missed counts and risk level |
| Chatbot response | Gemini-generated context-aware answer | Rule-based response using attendance data |

**Result:** The system **never fails silently.** If AI is down, the user still gets a functional — though less personalized — response. The UI flags fallback responses so SGA knows when AI was unavailable.

---

## 7. Key Features

| # | Feature | What It Does |
|---|---------|-------------|
| 1 | **Session lifecycle** | Three-phase flow (Session → Grace → Closed) with one-click transitions |
| 2 | **Student self-marking** | Students mark attendance during the session window |
| 3 | **Attendance requests** | Students submit reasons during grace; SGA reviews and approves |
| 4 | **Auto-absence marking** | Pending students marked absent on session close — no manual step |
| 5 | **AI absence alerts** | Personalized parent notifications generated on every absence |
| 6 | **Risk classification** | Students color-coded (HIGH / MEDIUM / LOW); recalculated per event |
| 7 | **Trend prediction** | System predicts whether attendance is trending up, down, or stable |
| 8 | **Parent chatbot** | AI answers parent questions using only that student's data |
| 9 | **Intent filtering** | Chatbot rejects off-topic queries automatically |
| 10 | **Query escalation** | Parent escalates to SGA; SGA responds manually with full context |
| 11 | **Weekly reports** | AI-written per-student summaries; viewable by SGA and parent |
| 12 | **Fallback mode** | All AI features degrade gracefully to template-based responses |
| 13 | **Optimized UI Navigation** | Clickable list rows, persistent back buttons on all dashboards, and auto-scroll-to-top ensures a fluid, native app feel |

---

## 8. User Flows

### SGA Daily Flow

```
1. Open Dashboard → 200 students sorted by risk level
2. Start session (9:00 AM) → students begin self-marking
3. Monitor live counters: Pending / Present / Absent
4. Start grace period (10:00 AM) → self-marking disabled
5. Review student requests → approve valid ones
6. Close session (11:00 AM)
7. System auto-marks absent + auto-generates parent alerts
8. Check Parent Queries → respond to escalated questions
9. End of week → generate weekly reports (one click per student)
```

### Parent Flow

```
1. Open Parent Dashboard → see child's attendance snapshot
2. Read absence alerts (if any)
3. Ask chatbot a question → receive AI response
4. Optionally escalate to SGA → await human response
5. View weekly report when available
```

---

## 9. Assumptions

- Fixed SGA-to-student assignment (~200 per SGA, stable cohort).
- One session slot per day (9–10 AM) in v1.
- Students access the system via web browser (laptop or phone).
- Parent communication is in-app only (no email/SMS in v1).
- Gemini API available for AI; fallback covers outages.
- Student master data pre-loaded from static JSON file in v1 (optimized to a 20-student dataset for high-performance demos and clean presentation).
- SGAs adopt the tool within one week if time savings are demonstrable.

---

## 10. Out of Scope (v1)

| Excluded Item | Rationale |
|--------------|-----------|
| Authentication (login/signup) | Roles simulated via routing; auth is v2 |
| Backend server / database | localStorage used for rapid prototyping |
| Email / SMS delivery | Alerts are in-app only; Twilio/SendGrid in v2 |
| Multiple sessions per day | Single slot for v1 simplicity; architecture supports extension |
| Biometric / GPS verification | Self-marking with simulated access controls in v1 |
| Student data CRUD | Static JSON; admin panel in v2 |
| Cross-device sync | Single-browser; requires backend in v2 |

---

## 11. Success Metrics

| Metric | Current State | v1 Target |
|--------|-------------|-----------|
| **SGA daily follow-up time** | ~45 min | < 10 min |
| **Absence → parent notification latency** | 4–24 hours | < 1 hour |
| **Absence notification coverage** | ~60% (inconsistent) | 100% (automated) |
| **Message quality consistency** | Varies by SGA | Standardized AI-generated format |
| **Weekly report generation time** | ~5 min per student (manual) | < 10 sec per student (AI) |
| **Parent query response time** | 1–2 days | Instant (AI) or < 4 hrs (escalated) |
| **Parent engagement rate** | Unmeasured | ≥ 40% of parents interact with dashboard or chatbot within first month |
| **Alert relevance score** | N/A | < 5% of AI alerts flagged as inaccurate or irrelevant by SGA review |

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **AI generates factually wrong message** | Parent receives misleading info | AI is constrained to injected student data only; cannot access external context. Fallback templates are pre-vetted. |
| **Fraudulent self-marking** | Unreliable attendance data | v1 simulates access controls (time window + campus check); v2 adds GPS/biometric |
| **localStorage data loss** | All records lost on browser clear | Documented limitation; v2 moves to persistent database |
| **Gemini API downtime** | AI features unavailable | Deterministic fallback for every AI feature; system never blocks on API failure |
| **Low parent adoption** | Alerts go unread | v2 adds email/SMS/push to meet parents on their preferred channel |
| **Single session slot rigidity** | Poor fit for multi-class institutions | Architecture designed for multi-slot; single slot chosen for v1 scope control |

---

## 13. Future Enhancements

| Priority | Enhancement | Value |
|----------|------------|-------|
| **P0** | Authentication + role-based access | Security; real multi-user isolation |
| **P0** | Backend API + database | Persistent storage; cross-device access |
| **P1** | Email / SMS integration | Reach parents outside the app |
| **P1** | Multiple session slots per day | Support real timetables |
| **P2** | Analytics dashboard with charts | Visual trends; comparative cohort analysis |
| **P2** | PDF export for reports | Printable artifacts for meetings |
| **P3** | Mobile app (PWA / React Native) | Better phone experience for students and parents |
| **P3** | Multi-language support | Accessibility for non-English-speaking parents |

---

> **v1 is a validation prototype.** It proves the workflow, the AI integration, and the agentic automation pattern. Production deployment requires P0 enhancements (auth + database) as a prerequisite.
