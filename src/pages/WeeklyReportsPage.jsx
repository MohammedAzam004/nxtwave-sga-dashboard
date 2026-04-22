import { useState } from "react";
import { motion } from "framer-motion";
import FilterBar from "../components/domain/FilterBar";
import SearchBar from "../components/domain/SearchBar";
import {
  formatQueryTimestamp,
} from "../services/queryService";
import { getWeeklyReportPeriodLabel } from "../services/weeklyReportService";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import {
  buttonHover,
  buttonTap,
  cardHover,
  fadeUpItem,
  pageVariants,
  subtleStaggerGroup,
} from "../utils/motion";

function WeeklyReportsPage({
  students,
  isLoading,
  errorMessage,
  onGenerateWeeklyReport = async () => {},
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [reportLoadingByStudentId, setReportLoadingByStudentId] = useState({});

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredStudents = students.filter((student) => {
    const studentName = student.name?.toLowerCase() || "";
    const matchesSearch = studentName.includes(normalizedSearchTerm);
    const matchesRisk =
      selectedFilter === "ALL" || student.riskLevel === selectedFilter;

    return matchesSearch && matchesRisk;
  });
  const generatedWeeklyReportsCount = students.filter(
    (student) => Boolean(student.currentWeekReport),
  ).length;

  const handleGenerateStudentWeeklyReport = async (studentId) => {
    const studentKey = String(studentId);

    setReportLoadingByStudentId((currentState) => ({
      ...currentState,
      [studentKey]: true,
    }));

    try {
      await onGenerateWeeklyReport(studentId);
    } finally {
      setReportLoadingByStudentId((currentState) => ({
        ...currentState,
        [studentKey]: false,
      }));
    }
  };

  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const handleGenerateAllReports = async () => {
    setIsGeneratingAll(true);
    try {
      for (const student of filteredStudents) {
        if (!student.currentWeekReport) {
          await handleGenerateStudentWeeklyReport(student.id);
        }
      }
    } finally {
      setIsGeneratingAll(false);
    }
  };

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
            <p className="eyebrow">SGA Workspace</p>
            <h1>Weekly Reports</h1>
            <p className="hero-copy">
              Generate and manage weekly attendance summaries for parents using
              the attendance sessions captured during the current reporting week.
            </p>
          </div>

          <div className="hero-note">
            <p className="hero-note__eyebrow">This Week</p>
            <h2>{getWeeklyReportPeriodLabel()}</h2>
            <p className="hero-note__copy">
              Reports are generated on demand for demo purposes and stored so
              parents can view the latest weekly summary from the SGA team.
            </p>

            <div className="hero-note__meta">
              <div className="hero-note__meta-item">
                <span>Generated Reports</span>
                <strong>{generatedWeeklyReportsCount}</strong>
              </div>
              <div className="hero-note__meta-item">
                <span>Visible Students</span>
                <strong>{filteredStudents.length}</strong>
              </div>
            </div>
          </div>
        </motion.header>

        {isLoading ? (
          <SkeletonGrid count={4} />
        ) : null}

        {!isLoading && errorMessage ? (
          <div className="feedback-panel error">{errorMessage}</div>
        ) : null}

        {!isLoading && !errorMessage ? (
          <>
            <motion.section className="controls-panel" variants={fadeUpItem}>
              <div className="controls-row controls-row--single">
                <SearchBar value={searchTerm} onChange={setSearchTerm} />
              </div>
              <FilterBar
                selectedFilter={selectedFilter}
                onFilterChange={setSelectedFilter}
              />
            </motion.section>

            <div className="generate-all-row">
              <motion.button
                type="button"
                className="query-form__button"
                onClick={handleGenerateAllReports}
                disabled={isGeneratingAll}
                whileHover={!isGeneratingAll ? buttonHover : undefined}
                whileTap={!isGeneratingAll ? buttonTap : undefined}
              >
                {isGeneratingAll ? "Generating all..." : "Generate All Reports"}
              </motion.button>
            </div>

            {filteredStudents.length ? (
              <motion.section
                className="sga-query-grid"
                variants={subtleStaggerGroup}
              >
                {filteredStudents.map((student) => {
                  const studentKey = String(student.id);
                  const weeklySummary = student.weeklyAttendanceSummary;
                  const latestWeeklyReport =
                    student.currentWeekReport || student.weeklyReports?.[0] || null;
                  const isGeneratingReport = Boolean(
                    reportLoadingByStudentId[studentKey],
                  );

                  return (
                    <motion.article
                      key={`weekly-report-${student.id}`}
                      className="query-item query-item--sga"
                      variants={fadeUpItem}
                      whileHover={cardHover}
                    >
                      <div className="query-item__meta">
                        <span className="query-item__tag">{student.name}</span>
                        <span
                          className={`query-item__status query-item__status--${
                            student.currentWeekReport ? "resolved" : "answered"
                          }`}
                        >
                          {student.currentWeekReport ? "Generated" : "Ready"}
                        </span>
                      </div>

                      <div className="query-item__context">
                        <span>{weeklySummary.periodLabel}</span>
                        <span>{weeklySummary.totalSessions} sessions recorded</span>
                      </div>

                      <div className="weekly-report__stats">
                        <span>
                          <strong>{weeklySummary.presentCount}</strong> Present
                        </span>
                        <span>
                          <strong>{weeklySummary.absentCount}</strong> Absent
                        </span>
                        <span>
                          <strong>{weeklySummary.attendancePercentage}%</strong>{" "}
                          Weekly Attendance
                        </span>
                      </div>

                      {latestWeeklyReport ? (
                        <>
                          <p className="query-item__answer-label">
                            {student.currentWeekReport
                              ? "Current Week Report"
                              : "Latest Report"}
                          </p>
                          <p className="query-item__answer">
                            {latestWeeklyReport.message}
                          </p>
                          <p className="query-item__note">
                            {latestWeeklyReport.generatedBy} |{" "}
                            {latestWeeklyReport.simulatedSentLabel}
                            {latestWeeklyReport.generatedAt
                              ? ` | ${formatQueryTimestamp(
                                  latestWeeklyReport.generatedAt,
                                )}`
                              : ""}
                          </p>
                          {latestWeeklyReport.errorMessage ? (
                            <p className="query-item__note">
                              {latestWeeklyReport.errorMessage}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <div className="query-empty-state">
                          No weekly report has been generated for this student yet.
                        </div>
                      )}

                      <div className="sga-reply-form__actions">
                        <motion.button
                          type="button"
                          className="query-form__button"
                          onClick={() => handleGenerateStudentWeeklyReport(student.id)}
                          disabled={isGeneratingReport}
                          whileHover={!isGeneratingReport ? buttonHover : undefined}
                          whileTap={!isGeneratingReport ? buttonTap : undefined}
                        >
                          {isGeneratingReport
                            ? "Generating report..."
                            : student.currentWeekReport
                              ? "Regenerate Weekly Report"
                              : "Generate Weekly Report"}
                        </motion.button>
                        <p className="query-form__helper">
                          The latest report is automatically visible in the parent
                          dashboard after generation.
                        </p>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.section>
            ) : (
              <div className="feedback-panel empty-state">
                <h3>No students found for weekly reports</h3>
                <p>Try another search term or switch the current risk filter.</p>
              </div>
            )}
          </>
        ) : null}
      </section>
    </motion.main>
  );
}

export default WeeklyReportsPage;
