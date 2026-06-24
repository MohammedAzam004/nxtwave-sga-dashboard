import { motion } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import { fadeUpItem } from "../utils/motion";

function AppNavigation() {
  const location = useLocation();
  const isSgaDashboardActive =
    location.pathname === "/sga-dashboard" ||
    location.pathname.startsWith("/student/") ||
    location.pathname.startsWith("/student-dashboard/");
  const isWeeklyReportsActive = location.pathname === "/weekly-reports";
  const isAttendanceRequestsActive =
    location.pathname === "/attendance-requests";
  const isParentQueriesActive = location.pathname === "/parent-queries";
  const isParentActive =
    location.pathname === "/parent-dashboard" ||
    location.pathname.startsWith("/parent-dashboard/");

  return (
    <motion.header
      className="app-navigation-shell"
      variants={fadeUpItem}
      initial="initial"
      animate="animate"
    >
      <motion.div className="app-navigation" layout>
        <div className="app-navigation__brand">
          <p className="app-navigation__eyebrow">Agentic SGA Copilot</p>
          <h1>Multi-User Attendance System</h1>
        </div>

        <nav className="app-navigation__links" aria-label="Dashboard navigation">
          <NavLink
            to="/sga-dashboard"
            className={`app-navigation__link ${
              isSgaDashboardActive ? "active" : ""
            }`}
          >
            SGA Dashboard
          </NavLink>
          <NavLink
            to="/weekly-reports"
            className={`app-navigation__link ${
              isWeeklyReportsActive ? "active" : ""
            }`}
          >
            Weekly Reports
          </NavLink>
          <NavLink
            to="/attendance-requests"
            className={`app-navigation__link ${
              isAttendanceRequestsActive ? "active" : ""
            }`}
          >
            Attendance Requests
          </NavLink>
          <NavLink
            to="/parent-queries"
            className={`app-navigation__link ${
              isParentQueriesActive ? "active" : ""
            }`}
          >
            Parent Queries
          </NavLink>
          <NavLink
            to="/parent-dashboard"
            className={`app-navigation__link ${isParentActive ? "active" : ""}`}
          >
            Parent Dashboard
          </NavLink>
        </nav>
      </motion.div>
    </motion.header>
  );
}

export default AppNavigation;
