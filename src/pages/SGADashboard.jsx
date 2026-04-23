import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import FilterBar from "../components/domain/FilterBar";
import SearchBar from "../components/domain/SearchBar";
import SortBar from "../components/domain/SortBar";
import StatsCard from "../components/domain/StatsCard";
import StudentRow from "../components/domain/StudentRow";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import { getRiskPriority } from "../services/riskService";
import {
  cardHover,
  fadeUpItem,
  pageVariants,
  staggerGroup,
  subtleStaggerGroup,
} from "../utils/motion";

const sortOptions = [
  { value: "RISK_LEVEL", label: "Risk Level (High to Low)" },
  { value: "ATTENDANCE_ASC", label: "Attendance (Low to High)" },
  { value: "ATTENDANCE_DESC", label: "Attendance (High to Low)" },
];

function SGADashboard({
  students,
  isLoading,
  errorMessage,
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

  const escalatedQueriesCount = students.flatMap((student) => student.queries || []).filter(
    (queryRecord) =>
      queryRecord.status === "pending" || queryRecord.status === "resolved",
  ).length;
  const generatedWeeklyReportsCount = students.filter(
    (student) => Boolean(student.currentWeekReport),
  ).length;

  const workspaceCards = [
    {
      to: "/session-control",
      title: "Session Lifecycle",
      count: "Active",
      copy: "Manage the current session, mark attendance, and close out slots.",
      cta: "Open Session Control",
    },
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
            <p className="eyebrow">Attendance Control</p>
            <h1>Attendance Dashboard</h1>
            <p className="hero-copy">
              Overview of the student roster, attendance trends, and quick access to SGA operations.
            </p>
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
              />
            </motion.div>
            <motion.div variants={fadeUpItem} whileHover={cardHover}>
              <StatsCard
                label="Medium Risk Students"
                value={dashboardInsights.riskCounts.MEDIUM}
                tone="medium"
              />
            </motion.div>
            <motion.div variants={fadeUpItem} whileHover={cardHover}>
              <StatsCard
                label="Low Risk Students"
                value={dashboardInsights.riskCounts.LOW}
                tone="low"
              />
            </motion.div>
          </motion.section>
        ) : null}

        <motion.section className="section-header" variants={fadeUpItem}>
          <div>
            <h2>Operations Hub</h2>
            <p>
              Open the right workspace for session management or parent follow-up tasks.
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
              Search, filter, and sort the roster. Use the action buttons to
              switch views.
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
          <SkeletonGrid count={6} />
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
                className="student-list"
                variants={subtleStaggerGroup}
              >
                <div className="student-list__header">
                  <span className="student-list__col student-list__col--info">Student</span>
                  <span className="student-list__col student-list__col--attendance">Attendance</span>
                  <span className="student-list__col student-list__col--risk">Risk</span>
                  <span className="student-list__col student-list__col--actions">Actions</span>
                </div>
                {sortedStudents.map((student) => (
                  <StudentRow key={student.id} student={student} />
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
