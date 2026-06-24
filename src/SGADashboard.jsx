import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import FilterBar from "./components/FilterBar";
import SearchBar from "./components/SearchBar";
import SortBar from "./components/SortBar";
import StatsCard from "./components/StatsCard";
import StudentCard from "./components/StudentCard";
import { formatQueryTimestamp } from "./services/queryService";
import { getRiskColor, getRiskPriority } from "./services/riskService";
import {
  buttonHover,
  buttonTap,
  cardHover,
  fadeUpItem,
  pageVariants,
  staggerGroup,
  subtleStaggerGroup,
} from "./utils/motion";

const sortOptions = [
  { value: "RISK_LEVEL", label: "Risk Level (High to Low)" },
  { value: "ATTENDANCE_ASC", label: "Attendance (Low to High)" },
  { value: "ATTENDANCE_DESC", label: "Attendance (High to Low)" },
];

const phaseDetailsByKey = {
  session: {
    title: "Session (9-10)",
    copy: "Students can mark attendance during this phase.",
  },
  grace: {
    title: "Grace (10-11)",
    copy: "SGA can manually approve pending attendance in this phase.",
  },
  closed: {
    title: "Closed (After 11)",
    copy: "Pending sessions are marked absent and parent alerts are generated.",
  },
};

function getActiveSession(student, sessionSlot) {
  return (
    (student.attendanceSessions || []).find(
      (sessionRecord) => sessionRecord.slot === sessionSlot,
    ) || {
      slot: sessionSlot,
      status: "pending",
      alertSent: false,
    }
  );
}

function SGADashboard({
  students,
  isLoading,
  errorMessage,
  currentPhase = "session",
  currentSessionSlot = "9-10",
  onSetPhase = () => {},
  onStartNewSession = () => {},
  onSgaMarkSessionPresent = async () => {},
  onCloseSession = async () => {},
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [selectedSort, setSelectedSort] = useState("RISK_LEVEL");

  const dashboardInsights = useMemo(
    () =>
      students.reduce(
        (summary, student) => {
          const attendancePercentage = student.attendance?.percentage || 0;
          const normalizedRisk = student.riskLevel;

          summary.totalStudents += 1;
          summary.totalAttendance += attendancePercentage;
          summary.riskCounts[normalizedRisk] =
            (summary.riskCounts[normalizedRisk] || 0) + 1;

          return summary;
        },
        {
          totalStudents: 0,
          totalAttendance: 0,
          riskCounts: {
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0,
          },
        },
      ),
    [students],
  );

  const averageAttendance = dashboardInsights.totalStudents
    ? Math.round(
        dashboardInsights.totalAttendance / dashboardInsights.totalStudents,
      )
    : 0;
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredStudents = students.filter((student) => {
    const studentName = student.name?.toLowerCase() || "";
    const matchesSearch = studentName.includes(normalizedSearchTerm);
    const matchesRisk =
      selectedFilter === "ALL" || student.riskLevel === selectedFilter;

    return matchesSearch && matchesRisk;
  });
  const sortedStudents = [...filteredStudents].sort((studentA, studentB) => {
    const attendanceA = studentA.attendance?.percentage || 0;
    const attendanceB = studentB.attendance?.percentage || 0;

    if (selectedSort === "ATTENDANCE_ASC") {
      return attendanceA - attendanceB;
    }

    if (selectedSort === "ATTENDANCE_DESC") {
      return attendanceB - attendanceA;
    }

    const riskDifference =
      getRiskPriority(studentA.riskLevel) - getRiskPriority(studentB.riskLevel);

    if (riskDifference !== 0) {
      return riskDifference;
    }

    return attendanceA - attendanceB;
  });

  const sessionSummaries = students
    .map((student) => ({
      student,
      session: getActiveSession(student, currentSessionSlot),
    }))
    .sort((recordA, recordB) => {
      if (recordA.session.status !== recordB.session.status) {
        return recordA.session.status === "pending" ? -1 : 1;
      }

      return recordA.student.name.localeCompare(recordB.student.name);
    });

  const pendingSessions = sessionSummaries.filter(
    (record) => record.session.status === "pending",
  );
  const approvedSessions = sessionSummaries.filter(
    (record) => record.session.status === "present",
  );
  const absentSessions = sessionSummaries.filter(
    (record) => record.session.status === "absent",
  );

  const highRiskColors = getRiskColor("HIGH");
  const mediumRiskColors = getRiskColor("MEDIUM");
  const lowRiskColors = getRiskColor("LOW");
  const escalatedQueriesCount = students.flatMap((student) => student.queries || []).filter(
    (queryRecord) =>
      queryRecord.status === "pending" || queryRecord.status === "resolved",
  ).length;
  const generatedWeeklyReportsCount = students.filter(
    (student) => Boolean(student.currentWeekReport),
  ).length;

  const phaseInfo = phaseDetailsByKey[currentPhase] || phaseDetailsByKey.session;

  const workspaceCards = [
    {
      to: "/weekly-reports",
      title: "Weekly Reports",
      count: generatedWeeklyReportsCount,
      copy:
        "Generate and review AI-assisted weekly attendance summaries before parents see them.",
      cta: "Open Weekly Reports",
    },
    {
      to: "/parent-queries",
      title: "Parent Queries",
      count: escalatedQueriesCount,
      copy:
        "Track parent questions that were escalated to SGA and send manual follow-up replies.",
      cta: "Open Parent Queries",
    },
  ];

  return (
    <motion.main
      className="sga-dashboard"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <section className="dashboard-shell">
        <motion.header className="dashboard-hero" variants={fadeUpItem}>
          <div>
            <p className="eyebrow">Agentic SGA Copilot</p>
            <h1>Attendance & Communication Dashboard</h1>
            <p className="hero-copy">
              Simulate attendance with a session window, grace-period intervention,
              and final close-session alerts to parents when attendance remains
              pending.
            </p>
          </div>

          <div className="hero-note">
            <p className="hero-note__eyebrow">Current Phase</p>
            <h2>{phaseInfo.title}</h2>
            <p className="hero-note__copy">{phaseInfo.copy}</p>

            <div className="hero-note__meta">
              <div className="hero-note__meta-item">
                <span>Current Slot</span>
                <strong>{currentSessionSlot}</strong>
              </div>
              <div className="hero-note__meta-item">
                <span>Pending Sessions</span>
                <strong>{pendingSessions.length}</strong>
              </div>
            </div>
          </div>
        </motion.header>

        {!isLoading && !errorMessage ? (
          <motion.section
            className="stats-grid"
            aria-label="Dashboard insights"
            variants={staggerGroup}
          >
            <motion.div variants={fadeUpItem} whileHover={cardHover}>
              <StatsCard
                label="Total Students"
                value={dashboardInsights.totalStudents}
                tone="primary"
              />
            </motion.div>
            <motion.div variants={fadeUpItem} whileHover={cardHover}>
              <StatsCard
                label="Average Attendance"
                value={`${averageAttendance}%`}
                tone="primary"
              />
            </motion.div>
            <motion.div variants={fadeUpItem} whileHover={cardHover}>
              <StatsCard
                label="High Risk Students"
                value={dashboardInsights.riskCounts.HIGH}
                tone="high"
                style={{
                  background: highRiskColors.statGradient,
                  borderColor: highRiskColors.border,
                }}
              />
            </motion.div>
            <motion.div variants={fadeUpItem} whileHover={cardHover}>
              <StatsCard
                label="Medium Risk Students"
                value={dashboardInsights.riskCounts.MEDIUM}
                tone="medium"
                style={{
                  background: mediumRiskColors.statGradient,
                  borderColor: mediumRiskColors.border,
                }}
              />
            </motion.div>
            <motion.div variants={fadeUpItem} whileHover={cardHover}>
              <StatsCard
                label="Low Risk Students"
                value={dashboardInsights.riskCounts.LOW}
                tone="low"
                style={{
                  background: lowRiskColors.statGradient,
                  borderColor: lowRiskColors.border,
                }}
              />
            </motion.div>
          </motion.section>
        ) : null}

        {!isLoading && !errorMessage ? (
          <motion.section className="query-panel session-control-panel" variants={fadeUpItem}>
            <div className="query-panel__header">
              <div>
                <p className="query-panel__eyebrow">Session Control</p>
                <h3>Slot {currentSessionSlot} Lifecycle</h3>
              </div>
              <span className={`phase-badge phase-badge--${currentPhase}`}>
                {phaseInfo.title}
              </span>
            </div>

            <p className="query-panel__intro">
              Move from session to grace, approve pending students in grace,
              and close the session to finalize absences and trigger parent alerts.
            </p>

            <div className="session-control-panel__actions">
              <motion.button
                type="button"
                className="query-form__button"
                onClick={() => onSetPhase("grace")}
                disabled={currentPhase !== "session"}
                whileHover={currentPhase === "session" ? buttonHover : undefined}
                whileTap={currentPhase === "session" ? buttonTap : undefined}
              >
                Start Grace Period
              </motion.button>
              <motion.button
                type="button"
                className="query-form__button"
                onClick={onCloseSession}
                disabled={currentPhase === "closed"}
                whileHover={currentPhase !== "closed" ? buttonHover : undefined}
                whileTap={currentPhase !== "closed" ? buttonTap : undefined}
              >
                Close Session
              </motion.button>
              <motion.button
                type="button"
                className="query-item__escalate-button"
                onClick={onStartNewSession}
                whileHover={buttonHover}
                whileTap={buttonTap}
              >
                Start New Session
              </motion.button>
            </div>

            <div className="session-summary-grid">
              <article className="query-item query-item--compact">
                <p className="query-item__answer-label">Pending</p>
                <p className="query-item__answer">{pendingSessions.length}</p>
              </article>
              <article className="query-item query-item--compact">
                <p className="query-item__answer-label">Present</p>
                <p className="query-item__answer">{approvedSessions.length}</p>
              </article>
              <article className="query-item query-item--compact">
                <p className="query-item__answer-label">Absent</p>
                <p className="query-item__answer">{absentSessions.length}</p>
              </article>
            </div>

            {pendingSessions.length ? (
              <div className="session-pending-list">
                {pendingSessions.map((record) => (
                  <article key={`pending-${record.student.id}`} className="query-item query-item--compact">
                    <div className="query-item__meta">
                      <span className="query-item__tag">{record.student.name}</span>
                      <span className="query-item__status query-item__status--pending">
                        Pending
                      </span>
                    </div>
                    <p className="query-item__note">Slot {record.session.slot}</p>
                    {record.session.createdAt ? (
                      <p className="query-item__note">
                        Session initialized {formatQueryTimestamp(record.session.createdAt)}
                      </p>
                    ) : null}
                    <motion.button
                      type="button"
                      className="query-form__button"
                      onClick={() => onSgaMarkSessionPresent(record.student.id)}
                      disabled={currentPhase !== "grace"}
                      whileHover={currentPhase === "grace" ? buttonHover : undefined}
                      whileTap={currentPhase === "grace" ? buttonTap : undefined}
                    >
                      Approve As Present
                    </motion.button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="feedback-panel empty-state">
                <h3>No pending sessions</h3>
                <p>
                  All students are finalized for this slot. You can close the
                  session or start a new one.
                </p>
              </div>
            )}
          </motion.section>
        ) : null}

        <motion.section className="section-header" variants={fadeUpItem}>
          <div>
            <h2>Operations Hub</h2>
            <p>
              Open the right workspace for weekly communication or parent
              follow-up tasks.
            </p>
          </div>
        </motion.section>

        {!isLoading && !errorMessage ? (
          <motion.section
            className="workspace-grid"
            variants={subtleStaggerGroup}
          >
            {workspaceCards.map((card) => (
              <motion.article
                key={card.to}
                className="workspace-card"
                variants={fadeUpItem}
                whileHover={cardHover}
              >
                <div className="workspace-card__header">
                  <span className="workspace-card__eyebrow">Workspace</span>
                  <span className="workspace-card__count">{card.count}</span>
                </div>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
                <Link to={card.to} className="workspace-card__link">
                  {card.cta}
                </Link>
              </motion.article>
            ))}
          </motion.section>
        ) : null}

        <motion.section className="section-header" variants={fadeUpItem}>
          <div>
            <h2>Student Overview</h2>
            <p>
              Search, filter, and sort the roster. Click any card to open the
              full student record and phase-aware dashboards.
            </p>
          </div>
          {!isLoading && !errorMessage ? (
            <div className="results-pill">
              Showing {sortedStudents.length} of {dashboardInsights.totalStudents}{" "}
              students
            </div>
          ) : null}
        </motion.section>

        {isLoading ? (
          <div className="feedback-panel">Loading student data...</div>
        ) : null}

        {!isLoading && errorMessage ? (
          <div className="feedback-panel error">{errorMessage}</div>
        ) : null}

        {!isLoading && !errorMessage ? (
          <>
            <motion.section className="controls-panel" variants={fadeUpItem}>
              <div className="controls-row">
                <SearchBar value={searchTerm} onChange={setSearchTerm} />
                <SortBar
                  options={sortOptions}
                  value={selectedSort}
                  onChange={setSelectedSort}
                />
              </div>
              <FilterBar
                selectedFilter={selectedFilter}
                onFilterChange={setSelectedFilter}
              />
            </motion.section>

            {sortedStudents.length ? (
              <motion.section
                className="student-grid"
                variants={subtleStaggerGroup}
              >
                {sortedStudents.map((student) => (
                  <StudentCard key={student.id} student={student} />
                ))}
              </motion.section>
            ) : (
              <div className="feedback-panel empty-state">
                <h3>No students found</h3>
                <p>
                  Try a different name or switch the risk filter to widen the
                  results.
                </p>
              </div>
            )}
          </>
        ) : null}
      </section>
    </motion.main>
  );
}

export default SGADashboard;
