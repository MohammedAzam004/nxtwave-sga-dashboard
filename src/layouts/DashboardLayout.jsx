import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { isGeminiConfigured } from "../services/geminiService";
import { fadeUpItem } from "../utils/motion";
import ScrollToTop from "../components/ui/ScrollToTop";
import { ToastContainer } from "../components/ui/Toast";

function DashboardLayout({ toasts = [] }) {
  const location = useLocation();
  const geminiReady = isGeminiConfigured();
  const isSgaDashboardActive =
    location.pathname === "/sga-dashboard" ||
    location.pathname.startsWith("/student/") ||
    location.pathname.startsWith("/student-dashboard/");
  const isSessionControlActive = location.pathname === "/session-control";
  const isWeeklyReportsActive = location.pathname === "/weekly-reports";
  const isParentQueriesActive = location.pathname === "/parent-queries";
  const isParentActive =
    location.pathname === "/parent-dashboard" ||
    location.pathname.startsWith("/parent-dashboard/");

  const handleResetDemo = () => {
    if (window.confirm("Reset all demo data? This clears localStorage and reloads the page.")) {
      window.localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="app-container">
      <ScrollToTop />
      <motion.header
        className="navbar"
        variants={fadeUpItem}
        initial="initial"
        animate="animate"
      >
        <div>
          <h1 className="navbar__title">Agentic SGA Copilot</h1>
          <p className="navbar__subtitle">Multi-User System</p>
        </div>

        <nav className="nav-links" aria-label="Dashboard navigation">
          <NavLink
            to="/sga-dashboard"
            className={`nav-item ${isSgaDashboardActive ? "active" : ""}`}
          >
            SGA Dashboard
          </NavLink>
          <NavLink
            to="/session-control"
            className={`nav-item ${isSessionControlActive ? "active" : ""}`}
          >
            Session Control
          </NavLink>
          <NavLink
            to="/weekly-reports"
            className={`nav-item ${isWeeklyReportsActive ? "active" : ""}`}
          >
            Weekly Reports
          </NavLink>
          <NavLink
            to="/parent-queries"
            className={`nav-item ${isParentQueriesActive ? "active" : ""}`}
          >
            Parent Queries
          </NavLink>
          <NavLink
            to="/parent-dashboard"
            className={`nav-item ${isParentActive ? "active" : ""}`}
          >
            Parent Dashboard
          </NavLink>
          <button
            type="button"
            className="reset-button"
            onClick={handleResetDemo}
          >
            Reset Demo
          </button>
        </nav>
      </motion.header>

      {!geminiReady ? (
        <div className="gemini-banner">
          <span className="gemini-banner__icon">⚡</span>
          AI is running in fallback mode — add a Gemini API key in .env for live AI responses.
        </div>
      ) : null}

      <main className="main-content">
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default DashboardLayout;

