import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import RiskBadge from "../components/domain/RiskBadge";
import StatsCard from "../components/domain/StatsCard";
import { generateResponse as generateParentResponse } from "../services/geminiService";
import {
  createParentQueryRecord,
  getQueryStatusLabel,
  formatQueryTimestamp,
} from "../services/queryService";
import { getRiskLabel } from "../services/riskService";
import {
  buttonHover,
  buttonTap,
  cardHover,
  fadeUpItem,
  pageVariants,
  staggerGroup,
  subtleStaggerGroup,
} from "../utils/motion";

const simulatedParentEmail = import.meta.env.VITE_PARENT_EMAIL?.trim().toLowerCase();

function ParentDashboard({
  students,
  isLoading,
  errorMessage,
  studentQueriesById = {},
  onSaveParentQuery = () => {},
  onEscalateParentQuery = () => {},
}) {
  const { id } = useParams();
  const [queryInput, setQueryInput] = useState("");
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);
  const [queryInputError, setQueryInputError] = useState("");
  const hasRouteStudentId = Boolean(id);

  const selectedStudent = useMemo(() => {
    if (!students.length) {
      return null;
    }

    if (hasRouteStudentId) {
      return (
        students.find((student) => String(student.id) === id) || null
      );
    }

    if (!simulatedParentEmail) {
      return students[0];
    }

    return (
      students.find(
        (student) =>
          student.parent?.email?.trim().toLowerCase() === simulatedParentEmail,
      ) || students[0]
    );
  }, [hasRouteStudentId, id, students]);

  if (isLoading) {
    return (
      <motion.main
        className="sga-dashboard"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <section className="dashboard-shell">
          <div className="feedback-panel">Loading parent dashboard...</div>
        </section>
      </motion.main>
    );
  }

  if (errorMessage) {
    return (
      <motion.main
        className="sga-dashboard"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <section className="dashboard-shell">
          <div className="feedback-panel error">{errorMessage}</div>
        </section>
      </motion.main>
    );
  }

  if (!selectedStudent && hasRouteStudentId) {
    return (
      <motion.main
        className="sga-dashboard"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <section className="dashboard-shell">
          <div className="feedback-panel error">Student not found</div>
        </section>
      </motion.main>
    );
  }

  if (!selectedStudent) {
    return (
      <motion.main
        className="sga-dashboard"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <section className="dashboard-shell">
          <div className="feedback-panel error">
            No student record is available for the parent view.
          </div>
        </section>
      </motion.main>
    );
  }

  const attendancePercentage = selectedStudent.attendance?.percentage ?? 0;
  const attendedClasses = selectedStudent.attendance?.attended ?? 0;
  const totalClasses = selectedStudent.attendance?.totalClasses ?? 0;
  const riskLevel = selectedStudent.riskLevel;
  const studentQueries = selectedStudent.queries || [];
  const weeklyReports = selectedStudent.weeklyReports || [];
  const latestWeeklyReport = weeklyReports[0] || null;
  const weeklySummary = selectedStudent.weeklyAttendanceSummary;
  const parentAlerts = (selectedStudent.alerts || [])
    .sort(
      (alertA, alertB) =>
        new Date(alertB.date).getTime() - new Date(alertA.date).getTime(),
    );

  const handleSubmitQuery = async (event) => {
    event.preventDefault();

    const trimmedQuery = queryInput.trim();

    if (!trimmedQuery) {
      setQueryInputError("Please enter a question before submitting.");
      return;
    }

    setIsSubmittingQuery(true);
    setQueryInputError("");

    const result = await generateParentResponse(selectedStudent, trimmedQuery);
    const queryRecord = createParentQueryRecord({
      studentId: selectedStudent.id,
      question: trimmedQuery,
      aiResponse: result.answer,
      isFallbackAnswer: result.isFallback,
      errorMessage: result.errorMessage,
    });

    onSaveParentQuery(selectedStudent.id, queryRecord);
    setQueryInput("");
    setIsSubmittingQuery(false);
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
        <Link to="/sga-dashboard" className="detail-back-link">
          Back to SGA Dashboard
        </Link>

        <motion.header className="dashboard-hero parent-hero" variants={fadeUpItem}>
          <div>
            <p className="eyebrow">Parent View</p>
            <h1>{selectedStudent.parent?.name || "Parent/Guardian"} Dashboard</h1>
            <p className="hero-copy">
              View your child&apos;s attendance status, current school guidance,
              and the latest AI-assisted communication shared by the attendance
              support team.
            </p>
          </div>

          <div className="hero-note">
            <p className="hero-note__eyebrow">Student Snapshot</p>
            <div className="parent-snapshot__title">
              <h2>{selectedStudent.name}</h2>
              <RiskBadge level={riskLevel} />
            </div>
            <p className="hero-note__copy">
              Attendance is currently {attendancePercentage}%, with a{" "}
              {getRiskLabel(riskLevel).toLowerCase()} classification based on
              the latest attendance data.
            </p>

            <div className="hero-note__meta">
              <div className="hero-note__meta-item">
                <span>Parent Email</span>
                <strong>{selectedStudent.parent?.email || "Not available"}</strong>
              </div>
              <div className="hero-note__meta-item">
                <span>Contact</span>
                <strong>{selectedStudent.parent?.contact || "Not available"}</strong>
              </div>
            </div>
          </div>
        </motion.header>

        <motion.section
          className="stats-grid parent-stats-grid"
          aria-label="Parent insights"
          variants={staggerGroup}
        >
          <motion.div variants={fadeUpItem} whileHover={cardHover}>
            <StatsCard
              label="Attendance"
              value={`${attendancePercentage}%`}
              tone="primary"
            />
          </motion.div>
          <motion.div variants={fadeUpItem} whileHover={cardHover}>
            <StatsCard
              label="Risk Level"
              value={getRiskLabel(riskLevel)}
              tone={riskLevel.toLowerCase()}
            />
          </motion.div>
          <motion.div variants={fadeUpItem} whileHover={cardHover}>
            <StatsCard
              label="Classes Attended"
              value={`${attendedClasses} / ${totalClasses}`}
              tone="primary"
            />
          </motion.div>
        </motion.section>

        <motion.section
          className="parent-content-grid"
          variants={subtleStaggerGroup}
        >
          <motion.article
            className="parent-profile-card"
            variants={fadeUpItem}
            whileHover={cardHover}
          >
            <p className="parent-profile-card__eyebrow">Student Details</p>
            <h2>{selectedStudent.name}</h2>

            <div className="parent-profile-card__details">
              <div className="detail-row">
                <span>Parent Name</span>
                <strong>{selectedStudent.parent?.name || "Not available"}</strong>
              </div>
              <div className="detail-row">
                <span>Parent Email</span>
                <strong className="truncate-text">
                  {selectedStudent.parent?.email || "Not available"}
                </strong>
              </div>
              <div className="detail-row">
                <span>Parent Contact</span>
                <strong>{selectedStudent.parent?.contact || "Not available"}</strong>
              </div>
              <div className="detail-row">
                <span>Attendance Risk</span>
                <RiskBadge level={riskLevel} />
              </div>
            </div>
          </motion.article>

          <div className="parent-side-stack">
            <motion.section
              className="query-panel"
              variants={fadeUpItem}
              whileHover={cardHover}
            >
              <div className="query-panel__header">
                <div>
                  <p className="query-panel__eyebrow">Weekly Report</p>
                  <h3>Attendance Summary</h3>
                </div>
                <span className="query-panel__count">
                  {weeklyReports.length} report{weeklyReports.length === 1 ? "" : "s"}
                </span>
              </div>

              {latestWeeklyReport ? (
                <>
                  <div className="query-item query-item--compact">
                    <div className="query-item__meta">
                      <span className="query-item__tag">
                        {latestWeeklyReport.periodLabel || weeklySummary.periodLabel}
                      </span>
                      <span className="query-item__time">
                        {latestWeeklyReport.generatedAt
                          ? formatQueryTimestamp(latestWeeklyReport.generatedAt)
                          : latestWeeklyReport.date}
                      </span>
                    </div>

                    <div className="weekly-report__stats">
                      <span>
                        <strong>
                          {latestWeeklyReport.summary?.presentCount ??
                            weeklySummary.presentCount}
                        </strong>{" "}
                        Present
                      </span>
                      <span>
                        <strong>
                          {latestWeeklyReport.summary?.absentCount ??
                            weeklySummary.absentCount}
                        </strong>{" "}
                        Absent
                      </span>
                      <span>
                        <strong>
                          {latestWeeklyReport.summary?.attendancePercentage ??
                            weeklySummary.attendancePercentage}
                          %
                        </strong>{" "}
                        This Week
                      </span>
                    </div>

                    <p className="query-item__answer-label">AI Generated Message</p>
                    <p className="query-item__answer">{latestWeeklyReport.message}</p>
                    <p className="query-item__note">
                      {latestWeeklyReport.generatedBy} |{" "}
                      {latestWeeklyReport.simulatedSentLabel}
                    </p>
                    {latestWeeklyReport.errorMessage ? (
                      <p className="query-item__note">
                        {latestWeeklyReport.errorMessage}
                      </p>
                    ) : null}
                  </div>

                  {weeklyReports.length > 1 ? (
                    <div className="weekly-report-list">
                      {weeklyReports.slice(1).map((reportRecord) => (
                        <article
                          key={reportRecord.id || `${reportRecord.weekKey}-${reportRecord.date}`}
                          className="query-item query-item--compact"
                        >
                          <div className="query-item__meta">
                            <span className="query-item__tag">
                              {reportRecord.periodLabel}
                            </span>
                            <span className="query-item__time">
                              {reportRecord.generatedAt
                                ? formatQueryTimestamp(reportRecord.generatedAt)
                                : reportRecord.date}
                            </span>
                          </div>
                          <p className="query-item__answer">{reportRecord.message}</p>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="query-empty-state">
                  No weekly report has been shared yet. Once SGA generates a
                  weekly attendance summary, it will appear here.
                </div>
              )}
            </motion.section>

            <motion.section className="parent-alert-panel" variants={fadeUpItem}>
              {parentAlerts.length ? (
                <div className="parent-alerts-grid">
                  {parentAlerts.map((alertRecord, index) => (
                    <article
                      key={`alert-${alertRecord.slot}-${alertRecord.date}-${index}`}
                      className="query-item parent-alert-card"
                    >
                      <div className="query-item__meta">
                        <span className="query-item__tag">
                          {alertRecord.type === "manual" ? "SGA Alert" : "Absence Alert"}
                        </span>
                        <span className="query-item__status query-item__status--pending">
                          Slot {alertRecord.slot}
                        </span>
                      </div>

                      <p className="query-item__answer">{alertRecord.message}</p>

                      <p className="query-item__note">
                        Shared on {formatQueryTimestamp(alertRecord.date)}
                      </p>

                      {alertRecord.errorMessage ? (
                        <p className="query-item__note">{alertRecord.errorMessage}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="feedback-panel parent-empty-state">
                  <h3>No alerts yet</h3>
                  <p>
                    Important attendance alerts from the SGA team will appear here.
                  </p>
                </div>
              )}
            </motion.section>

            <motion.section
              className="query-panel"
              variants={fadeUpItem}
              whileHover={cardHover}
            >
              <div className="query-panel__header">
                <div>
                  <p className="query-panel__eyebrow">Parent Queries</p>
                  <h3>Ask the SGA team</h3>
                </div>
                <span className="query-panel__count">
                  {studentQueries.length} question{studentQueries.length === 1 ? "" : "s"}
                </span>
              </div>

              <p className="query-panel__intro">
                Ask a question about attendance or support needs. In this demo,
                the question is also visible from the SGA dashboard.
              </p>

              <form className="query-form" onSubmit={handleSubmitQuery}>
                <label className="query-form__label" htmlFor="parent-query">
                  Ask About Your Child
                </label>
                <textarea
                  id="parent-query"
                  className="query-form__textarea"
                  placeholder="Why is attendance low for my child, and what should we do next?"
                  value={queryInput}
                  onChange={(event) => {
                    setQueryInput(event.target.value);

                    if (queryInputError) {
                      setQueryInputError("");
                    }
                  }}
                  rows={4}
                />

                {queryInputError ? (
                  <p className="query-form__error">{queryInputError}</p>
                ) : null}

                <div className="query-form__actions">
                  <motion.button
                    type="submit"
                    className="query-form__button"
                    disabled={isSubmittingQuery}
                    whileHover={!isSubmittingQuery ? buttonHover : undefined}
                    whileTap={!isSubmittingQuery ? buttonTap : undefined}
                  >
                    {isSubmittingQuery ? "Getting AI response..." : "Submit Query"}
                  </motion.button>
                  <p className="query-form__helper">
                    AI responses are generated when available and fall back
                    gracefully if Gemini is unavailable. Use Ask SGA when you
                    want a manual follow-up from the SGA team.
                  </p>
                </div>
              </form>

              <motion.div className="query-thread" variants={subtleStaggerGroup}>
                {studentQueries.length ? (
                  studentQueries.map((queryRecord) => (
                    <motion.article
                      key={queryRecord.id}
                      className="query-item"
                      variants={fadeUpItem}
                      whileHover={cardHover}
                    >
                      <div className="query-item__meta">
                        <span className="query-item__tag">Parent Question</span>
                        <span className="query-item__time">
                          {formatQueryTimestamp(queryRecord.createdAt)}
                        </span>
                      </div>
                      <p className="query-item__question">{queryRecord.question}</p>

                      <p className="query-item__answer-label">
                        {queryRecord.isFallbackAnswer
                          ? "Fallback Response"
                          : "AI Response"}
                      </p>
                      <p className="query-item__answer">
                        {queryRecord.aiResponse ||
                          "Unable to generate response at the moment."}
                      </p>

                      <div className="query-item__status-row">
                        <span
                          className={`query-item__status query-item__status--${queryRecord.status}`}
                        >
                          {getQueryStatusLabel(queryRecord.status)}
                        </span>

                        {queryRecord.status === "answered" ? (
                          <motion.button
                            type="button"
                            className="query-item__escalate-button"
                            onClick={() =>
                              onEscalateParentQuery(
                                selectedStudent.id,
                                queryRecord.id,
                              )
                            }
                            whileHover={buttonHover}
                            whileTap={buttonTap}
                          >
                            Ask SGA
                          </motion.button>
                        ) : null}
                      </div>

                      {queryRecord.status === "pending" ? (
                        <p className="query-item__note">
                          Escalated to SGA on{" "}
                          {formatQueryTimestamp(queryRecord.escalatedAt)}
                        </p>
                      ) : null}

                      {queryRecord.sgaResponse ? (
                        <>
                          <p className="query-item__answer-label">SGA Response</p>
                          <p className="query-item__answer">
                            {queryRecord.sgaResponse}
                          </p>
                        </>
                      ) : null}

                      {queryRecord.errorMessage ? (
                        <p className="query-item__note">{queryRecord.errorMessage}</p>
                      ) : null}
                    </motion.article>
                  ))
                ) : (
                  <div className="query-empty-state">
                    No questions submitted yet. Ask something to start the
                    conversation with the SGA team.
                  </div>
                )}
              </motion.div>
            </motion.section>
          </div>
        </motion.section>
      </section>
    </motion.main>
  );
}

export default ParentDashboard;
