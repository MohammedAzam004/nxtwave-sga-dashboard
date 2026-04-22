# 🎓 Agentic SGA Copilot — Smart Attendance Management System

A production-grade, AI-powered Student Governance Assistant (SGA) built with React and Google Gemini. It provides a multi-user attendance management system with real-time session control, intelligent parent communication, risk-based monitoring, and automated weekly reporting.

## 📌 Problem Statement

Traditional attendance tracking in educational institutions relies on manual registers, disconnected spreadsheets, and delayed parent notifications. This leads to:

- **Delayed intervention** for at-risk students
- **No real-time visibility** into session attendance
- **Poor parent communication** — parents learn about absences days later
- **Manual workload** for SGA coordinators managing approvals and reports

## 💡 Solution

Agentic SGA Copilot automates the entire attendance lifecycle — from session management and self-marking to AI-generated parent alerts and weekly reports — all within a single, elegant dashboard.

---

## ✨ Features

### Session Management
- **Phase-based session lifecycle** — Session → Grace → Closed
- **Real-time attendance counters** — Pending, Present, Absent
- **One-click phase transitions** with validation guards

### Multi-User System
- **SGA Dashboard** — Overview of all students with risk indicators
- **Student Dashboard** — Self-marking attendance with request flow
- **Parent Dashboard** — AI-powered Q&A about child's performance

### AI-Powered Intelligence (Google Gemini)
- **Smart parent responses** — Context-aware answers using student data
- **Greeting detection** — Polite handling of greetings
- **Irrelevant query rejection** — Strictly focused on student context
- **Absence alerts** — Auto-generated parent notifications on session close
- **Weekly reports** — AI-summarized attendance reports per student
- **Fallback mode** — Graceful template-based responses when API is unavailable

### Attendance Requests
- **Student request flow** — Submit reason during grace period
- **SGA approval** — Review requests with student name, reason, attendance %, and risk level
- **Search & filter** — Find specific requests quickly

### Risk Monitoring
- **Automatic risk calculation** — LOW / MEDIUM / HIGH based on attendance %
- **Visual risk badges** — Color-coded indicators across all dashboards
- **Trend prediction** — AI-based attendance risk forecasting

### Parent Communication
- **Query system** — Parents ask questions, AI responds with student data
- **Escalation flow** — Queries can be escalated to SGA for manual response
- **Query resolution** — SGA can respond to escalated queries directly

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, JSX |
| **Routing** | React Router v7 |
| **Animations** | Framer Motion |
| **Styling** | Vanilla CSS (design tokens, BEM methodology) |
| **AI Model** | Google Gemini 2.5 Flash |
| **Build Tool** | Vite 5 |
| **State** | React Hooks + localStorage persistence |
| **Deployment** | Vercel |

---

## 🏗️ Project Architecture

```
src/
├── App.jsx                    # Route definitions & prop wiring
├── main.jsx                   # React entry point
├── components/
│   ├── domain/                # Business-specific components
│   │   ├── AlertBox.jsx       # AI-generated alert display
│   │   ├── FilterBar.jsx      # Risk level filter
│   │   ├── RiskBadge.jsx      # Color-coded risk indicator
│   │   ├── SearchBar.jsx      # Student search input
│   │   ├── SortBar.jsx        # Sort options dropdown
│   │   ├── StatsCard.jsx      # Statistics display card
│   │   └── StudentCard.jsx    # Student summary card
│   └── ui/                    # Generic UI primitives
│       ├── ScrollToTop.jsx    # Route-change scroll reset
│       ├── SkeletonGrid.jsx   # Loading skeleton
│       └── Toast.jsx          # Notification toasts
├── hooks/
│   └── useAppState.js         # Central state management (595 lines)
├── layouts/
│   └── DashboardLayout.jsx    # Navbar, routing shell, toast container
├── pages/
│   ├── SGADashboard.jsx       # SGA overview — all students
│   ├── SessionControlPage.jsx # Phase controls + attendance requests
│   ├── StudentDashboard.jsx   # Student self-marking interface
│   ├── StudentDetails.jsx     # Individual student deep-dive
│   ├── ParentDashboard.jsx    # Parent AI query interface
│   ├── ParentQueriesPage.jsx  # SGA view of escalated queries
│   └── WeeklyReportsPage.jsx  # AI-generated weekly reports
├── services/
│   ├── geminiService.js       # Gemini API integration & prompt engineering
│   ├── queryService.js        # Parent query CRUD & localStorage
│   ├── riskService.js         # Risk calculation & trend prediction
│   └── weeklyReportService.js # Weekly report generation & storage
├── styles/
│   └── sga-dashboard.css      # Complete design system (760+ lines)
└── utils/
    ├── attendance.js           # Session helpers & slot management
    └── motion.js               # Framer Motion animation presets
```

### High-Level Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ students.json│────▶│ useAppState  │────▶│   Page Components│
│  (public/)   │     │   (hooks)    │     │    (pages/)      │
└─────────────┘     └──────┬───────┘     └────────┬────────┘
                           │                       │
                    ┌──────▼───────┐        ┌──────▼───────┐
                    │ localStorage │        │ geminiService │
                    │ (persistence)│        │  (Gemini AI)  │
                    └──────────────┘        └──────────────┘
```

---

## ⚙️ Core Logic Explanation

### 1. Session Lifecycle

```
Session Phase (9-10)  →  Grace Phase (10-11)  →  Closed (After 11)
    │                        │                        │
    ▼                        ▼                        ▼
Students self-mark      SGA approves pending     Pending → Absent
attendance              requests manually        Parent alerts generated
```

### 2. Attendance Request Pipeline

```
Student blocked from self-marking
        │
        ▼
Student submits reason (grace period only)
        │
        ▼
Request appears in Session Control page
        │
        ▼
SGA reviews: name, reason, attendance %, risk
        │
        ▼
SGA approves → Student marked present + request closed
```

### 3. AI Response Pipeline

```
Parent submits question
        │
        ▼
detectIntent() → greeting / irrelevant / why / improve / details
        │
        ▼
buildParentResponsePrompt() → structured prompt with student data
        │
        ▼
Gemini API call (or fallback if unavailable)
        │
        ▼
Response displayed to parent
```

### 4. Risk Calculation

```
Attendance ≥ 75%  →  LOW risk (green)
Attendance 50-74% →  MEDIUM risk (amber)
Attendance < 50%  →  HIGH risk (red)
```

---

## 📦 Functions & Modules Breakdown

### `useAppState.js` — Central State Hook

| Handler | Purpose |
|---------|---------|
| `handleSetPhase` | Transition session phase (session → grace → closed) |
| `handleStartNewSession` | Reset all students to pending, restart session phase |
| `handleStudentMarkAttendance` | Student self-marks as present (session phase only) |
| `handleSgaMarkSessionPresent` | SGA manually approves student (grace phase only) |
| `handleCloseSession` | Mark all pending as absent, generate parent alerts |
| `handleRequestAttendanceApproval` | Student submits approval request with reason |
| `handleApproveAttendanceRequest` | SGA approves a student's attendance request |
| `handleMarkAttendance` | Direct present marking from student details page |
| `handleGenerateAlert` | Generate AI-powered parent alert |
| `handleGenerateWeeklyReport` | Generate AI weekly attendance summary |
| `handleSaveParentQuery` | Save parent's AI-generated query response |
| `handleEscalateParentQuery` | Escalate query to SGA for manual review |
| `handleResolveParentQuery` | SGA resolves an escalated parent query |

### `geminiService.js` — AI Integration

| Function | Purpose |
|----------|---------|
| `generateResponse` | Handle parent queries with Gemini AI |
| `generateMessage` | Generate parent notification messages |
| `generateAbsenceAlert` | Create absence alerts for session close |
| `generateWeeklyReport` | Generate AI weekly attendance reports |
| `detectIntent` | Classify query as greeting/irrelevant/why/improve/details |
| `isGeminiConfigured` | Check if API key is available |

### `riskService.js` — Risk Engine

| Function | Purpose |
|----------|---------|
| `calculateRisk` | Compute risk level from attendance percentage |
| `getRiskLabel` | Human-readable risk label |
| `predictAttendanceRisk` | Trend-based risk prediction |

---

## 🚀 Setup & Installation

### Prerequisites

- **Node.js** 18+ installed
- **npm** or **yarn**
- **Google Gemini API Key** (optional — app works in fallback mode without it)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/MohammedAzam004/nxtwave-sga-dashboard.git
cd nxtwave-sga-dashboard

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env    # Or create manually
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-2.5-flash
VITE_PARENT_EMAIL=parent@example.com
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GEMINI_API_KEY` | Optional | Google Gemini API key for AI features |
| `VITE_GEMINI_MODEL` | Optional | Gemini model name (default: `gemini-2.5-flash`) |
| `VITE_PARENT_EMAIL` | Optional | Email to simulate parent dashboard access |

> **Note:** Without a Gemini API key, the app runs in **fallback mode** — all AI features use pre-built template responses.

```bash
# 4. Start development server
npm run dev

# 5. Open in browser
# → http://localhost:5173
```

---

## 📖 Usage

### SGA Dashboard
Navigate to `/sga-dashboard` to see all students with their attendance percentages, risk levels, and status indicators. Click any student card to view detailed records.

### Session Control
Navigate to `/session-control` to manage the attendance lifecycle:
1. Click **Start Grace Period** to transition from session to grace
2. Review and approve **Attendance Requests** using the search bar
3. Click **Close Session** to finalize — pending students are marked absent

### Student Dashboard
Navigate to `/student-dashboard/:id` to simulate the student experience:
- Mark attendance during session phase
- Submit approval requests during grace phase

### Parent Dashboard
Navigate to `/parent-dashboard` to interact with the AI assistant:
- Ask questions like: *"How is my child's attendance?"*
- Get AI-powered responses based on real student data
- Escalate queries to SGA if needed

---

## 🤖 AI Model Details

| Property | Value |
|----------|-------|
| **Model** | Google Gemini 2.5 Flash |
| **Integration** | REST API via `generativelanguage.googleapis.com` |
| **Prompt Engineering** | Intent-based with structured system prompts |
| **Temperature** | 0.25–0.7 (varies by use case) |
| **Max Tokens** | 220–320 per response |
| **Fallback** | Template-based responses when API is unavailable |

### Intent Classification

The system classifies parent queries into 5 categories:

| Intent | Trigger Words | Behavior |
|--------|--------------|----------|
| `greeting` | hi, hello, good morning | Polite welcome, ask how to help |
| `irrelevant` | weather, joke, cricket | Reject with standard message |
| `why` | why, reason, explain | Explain attendance data |
| `improve` | improve, suggest, help | Give actionable suggestions |
| `details` | (default) | Full attendance summary |

---

## 🌐 Deployment

### Vercel (Recommended)

The project includes a `vercel.json` configured for SPA routing:

1. **Connect GitHub repo** to Vercel
2. **Framework Preset**: Vite
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Environment Variables**: Add `VITE_GEMINI_API_KEY` in Vercel dashboard
6. **Deploy**

### Manual Deployment

```bash
# Build production bundle
npm run build

# Preview locally
npm run preview

# The dist/ folder contains static files ready for any hosting provider
```

---

## 🧩 Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| **CSS PostCSS parse failure** | Fixed orphaned CSS declarations and unmatched closing braces in the stylesheet |
| **Runtime crashes from data mismatch** | `getActiveSession()` expected an array but received full student objects — corrected call sites |
| **Import naming errors** | `generateParentResponse` didn't exist — aliased correctly from `generateResponse` |
| **Pages opening mid-scroll** | Created `ScrollToTop` component that resets scroll on every route change |
| **node_modules committed to git** | Created proper `.gitignore` and removed tracked files with `git rm --cached` |
| **AI responding to irrelevant queries** | Added intent classification with `greeting` and `irrelevant` detection |

---

## ⚠️ Limitations

- **No authentication** — user roles (SGA, Student, Parent) are simulated via routing
- **No backend server** — all data persists in `localStorage` (clears on reset)
- **Single session slot** — currently supports only one time slot (9-10)
- **No real-time sync** — multiple browser tabs won't sync state
- **Gemini API dependency** — live AI features require a valid API key and internet

---

## 🔮 Future Improvements

- [ ] Add user authentication (login/signup with role-based access)
- [ ] Backend API with database persistence (MongoDB / PostgreSQL)
- [ ] Real-time notifications via WebSocket
- [ ] Multiple session slots per day
- [ ] Export attendance reports as PDF
- [ ] Email/SMS integration for parent alerts
- [ ] Admin analytics dashboard with charts
- [ ] Mobile-responsive PWA version

---

## 🤝 Contributing

Contributions are welcome! Follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Commit** your changes: `git commit -m "Add your feature"`
4. **Push** to the branch: `git push origin feature/your-feature`
5. **Open** a Pull Request

### Guidelines

- Follow existing code style and BEM CSS naming
- Test that `npm run build` passes before submitting
- Don't modify AI prompt logic without discussion
- Keep components focused and reusable

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/MohammedAzam004">Mohammed Azam</a>
</p>
