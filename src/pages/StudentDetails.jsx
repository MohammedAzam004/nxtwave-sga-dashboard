import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import AlertBox from "../components/domain/AlertBox";
import RiskBadge from "../components/domain/RiskBadge";
import {
  formatQueryTimestamp,
  getQueryStatusLabel,
} from "../services/queryService";
import {
  getRiskLabel,
  getTrendLabel,
} from "../services/riskService";
import {
  buttonHover,
  buttonTap,
  cardHover,
  fadeUpItem,
  pageVariants,
  staggerGroup,
  subtleStaggerGroup,
} from "../utils/motion";

const emptyAlertState = {
  message: "",
  isFallback: false,
  note: "",
  isLoading: false,
};

function buildAlertState(alertRecord) {
  if (!alertRecord) {
    return emptyAlertState;
  }

  return {
    message: alertRecord.message || "",
    isFallback: Boolean(alertRecord.isFallback),
    isLoading: false,
    note: [
      alertRecord.generatedAt
        ? `Generated ${formatQueryTimestamp(alertRecord.generatedAt)}`
        : "",
      alertRecord.errorMessage || "",
    ]
      .filter(Boolean)
      .join(" | "),
  };
}

function getAttendanceStatusLabel(status) {
  return status === "ABSENT" ? "Absent" : "Present";
}

function StudentDetails({
  students,
  isLoading,
  errorMessage,
  studentQueriesById = {},
  attendanceHistoryById = {},
  onMarkAttendance = () => {},
  onGenerateAlert = async () => {},
}) {
  const { id } = useParams();
  const [alertState, setAlertState] = useState(emptyAlertState);

  const student = useMemo(
    () => students.find((studentRecord) => String(studentRecord.id) === id) || null,
    [id, students],
  );

  useEffect(() => {
    if (!student?.latestAlert) {
      setAlertState(emptyAlertState);
      return;
    }

    setAlertState(buildAlertState(student.latestAlert));
  }, [student?.latestAlert]);

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
          <div className="feedback-panel">Loading student details...</div>
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

  if (!student) {
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
            Student record not found. Return to the dashboard and select a valid
            student card.
          </div>
        </section>
      </motion.main>
    );
  }

  const attendancePercentage = student.attendance?.percentage ?? 0;
  const attendedClasses = student.attendance?.attended ?? 0;
  const totalClasses = student.attendance?.totalClasses ?? 0;
  const riskLevel = student.riskLevel;
  const riskClass = riskLevel.toLowerCase();
  const prediction = student.prediction || {
    predictedPercentage: attendancePercentage,
    predictedRiskLevel: riskLevel,
    trendDirection: "STABLE",
    observedPoints: 1,
  };
  const predictedRiskClass = prediction.predictedRiskLevel.toLowerCase();
  const studentQueries = studentQueriesById[String(student.id)] || [];
  const attendanceHistory = attendanceHistoryById[String(student.id)] || [];
  const latestAttendanceEvent = attendanceHistory[0];

  const handleGenerateAlert = async () => {
    setAlertState((currentState) => ({
      ...currentState,
      isLoading: true,
      note: "",
    }));

    const generatedAlert = await onGenerateAlert(student);
    setAlertState(buildAlertState(generatedAlert));
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

        <motion.header
          className="dashboard-hero student-details-hero"
          variants={fadeUpItem}
        >
          <div>
            <p className="eyebrow">Student Details</p>
            <div className="student-details__title-row">
              <div>
                <h1>{student.name}</h1>
                <p className="hero-copy">
                  Manage attendance updates, review parent communication, and
                  track how each new attendance event changes the student&apos;s
                  current risk profile.
                </p>
              </div>
              <RiskBadge level={riskLevel} />
            </div>

            <div className="flex gap-4 mt-4">
              <Link
                to={`/student-dashboard/${student.id}`}
                className="btn btn-outline"
              >
                View Student Dashboard
              </Link>
              <Link
                to={`/parent-dashboard/${student.id}`}
                className="btn btn-outline"
              >
                View Parent Dashboard
              </Link>
            </div>
          </div>

          <div className="hero-note">
            <p className="hero-note__eyebrow">Current Attendance Snapshot</p>
            <h2>{attendancePercentage}% attendance</h2>
            <p className="hero-note__copy">
              {student.name} has attended {attendedClasses} out of {totalClasses}{" "}
              classes and is currently classified as {getRiskLabel(riskLevel).toLowerCase()}.
            </p>

            <div className="hero-note__meta">
              <div className="hero-note__meta-item">
                <span>Parent Contact</span>
                <strong>{student.parent?.contact || "Not available"}</strong>
              </div>
              <div className="hero-note__meta-item">
                <span>Queries Raised</span>
                <strong>{studentQueries.length}</strong>
              </div>
            </div>
          </div>
        </motion.header>

        <motion.section
          className="student-details-grid"
          variants={subtleStaggerGroup}
        >
          <div className="student-details-main">
            <motion.section
              className="detail-section"
              variants={fadeUpItem}
              whileHover={cardHover}
            >
              <div className="detail-section__header">
                <div>
                  <p className="detail-section__eyebrow">Student Info</p>
                  <h2>Profile Summary</h2>
                </div>
              </div>

              <div className="student-details__info-grid">
                <div className="detail-row">
                  <span>Student Name</span>
                  <strong>{student.name}</strong>
                </div>
                <div className="detail-row">
                  <span>Parent Name</span>
                  <strong>{student.parent?.name || "Not available"}</strong>
                </div>
                <div className="detail-row">
                  <span>Parent Email</span>
                  <strong className="truncate-text">
                    {student.parent?.email || "Not available"}
                  </strong>
                </div>
                <div className="detail-row">
                  <span>Parent Contact</span>
                  <strong>{student.parent?.contact || "Not available"}</strong>
                </div>
              </div>
            </motion.section>

            <motion.section
              className="detail-section"
              variants={fadeUpItem}
              whileHover={cardHover}
            >
              <div className="detail-section__header">
                <div>
                  <p className="detail-section__eyebrow">Attendance</p>
                  <h2>Attendance Overview</h2>
                </div>
              </div>

              <div className="attendance-panel attendance-panel--detail">
                <div className="attendance-panel__header">
                  <span>Current Attendance</span>
                  <strong>{attendancePercentage}%</strong>
                </div>

                <div className={`attendance-progress attendance-progress--${riskClass}`} aria-hidden="true">
                  <span
                    className="attendance-progress__value"
                    style={{ width: `${attendancePercentage}%` }}
                  />
                </div>

                <p className="attendance-caption">
                  {attendedClasses} of {totalClasses} classes attended
                </p>
              </div>

              <div className="student-details__stats">
                <article className="student-details__stat">
                  <span>Total Classes</span>
                  <strong>{totalClasses}</strong>
                </article>
                <article className="student-details__stat">
                  <span>Classes Attended</span>
                  <strong>{attendedClasses}</strong>
                </article>
                <article className={`student-details__stat student-details__stat--${riskClass}`}>
                  <span>Current Risk</span>
                  <strong>{getRiskLabel(riskLevel)}</strong>
                </article>
              </div>
            </motion.section>

            <motion.section
              className="detail-section"
              variants={fadeUpItem}
              whileHover={cardHover}
            >
              <div className="detail-section__header">
                <div>
                  <p className="detail-section__eyebrow">Actions</p>
                  <h2>Mark Attendance</h2>
                </div>
              </div>

              <p className="detail-section__description">
                Each update simulates a new class session, recalculates the
                attendance percentage, refreshes the risk level instantly, and
                automatically creates a parent alert if the student moves into
                the high-risk range.
              </p>

              <div className="attendance-actions">
                <motion.button
                  type="button"
                  className="attendance-action-button attendance-action-button--present"
                  onClick={() => onMarkAttendance(student.id, "PRESENT")}
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                >
                  Mark Present
                </motion.button>
              </div>

              {latestAttendanceEvent ? (
                <p className="attendance-action-note">
                  Last update: marked {getAttendanceStatusLabel(latestAttendanceEvent.status).toLowerCase()} on{" "}
                  {formatQueryTimestamp(latestAttendanceEvent.createdAt)}. New
                  attendance is {latestAttendanceEvent.percentage}%.
                </p>
              ) : (
                <p className="attendance-action-note">
                  No attendance actions taken in this session yet.
                </p>
              )}
            </motion.section>

            <motion.section
              className="detail-section"
              variants={fadeUpItem}
              whileHover={cardHover}
            >
              <div className="detail-section__header">
                <div>
                  <p className="detail-section__eyebrow">Parent Communication</p>
                  <h2>Recent Queries</h2>
                </div>
                <span className="query-panel__count">
                  {studentQueries.length}
                </span>
              </div>

              <motion.div className="query-thread" variants={staggerGroup}>
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

                      <div className="query-item__status-row">
                        <span
                          className={`query-item__status query-item__status--${queryRecord.status}`}
                        >
                          {getQueryStatusLabel(queryRecord.status)}
                        </span>
                      </div>

                      <p className="query-item__answer-label">
                        {queryRecord.isFallbackAnswer
                          ? "Fallback Response"
                          : "AI Response"}
                      </p>
                      <p className="query-item__answer">
                        {queryRecord.aiResponse ||
                          "Unable to generate response at the moment."}
                      </p>

                      {queryRecord.sgaResponse ? (
                        <>
                          <p className="query-item__answer-label">SGA Response</p>
                          <p className="query-item__answer">
                            {queryRecord.sgaResponse}
                          </p>
                        </>
                      ) : null}

                      {queryRecord.status === "pending" ? (
                        <p className="query-item__note">
                          Escalated on{" "}
                          {formatQueryTimestamp(queryRecord.escalatedAt)}
                        </p>
                      ) : null}

                      {queryRecord.errorMessage ? (
                        <p className="query-item__note">
                          {queryRecord.errorMessage}
                        </p>
                      ) : null}
                    </motion.article>
                  ))
                ) : (
                  <div className="query-empty-state">
                    No parent questions have been raised for this student yet.
                  </div>
                )}
              </motion.div>
            </motion.section>
          </div>

          <aside className="student-details-side">
            <motion.section
              className="detail-section detail-section--tight"
              variants={fadeUpItem}
              whileHover={cardHover}
            >
              <div className="detail-section__header">
                <div>
                  <p className="detail-section__eyebrow">Forecast</p>
                  <h2>Risk Forecast</h2>
                </div>
              </div>

              <p className="detail-section__description">
                This forecast uses the latest attendance updates in the current
                session to estimate the next attendance percentage and expected
                risk level.
              </p>

              <div className="student-details__stats">
                <article className="student-details__stat">
                  <span>Trend</span>
                  <strong>{getTrendLabel(prediction.trendDirection)}</strong>
                </article>
                <article className="student-details__stat">
                  <span>Predicted Next Attendance</span>
                  <strong>{prediction.predictedPercentage}%</strong>
                </article>
                <article className={`student-details__stat student-details__stat--${predictedRiskClass}`}>
                  <span>Predicted Risk</span>
                  <strong>{getRiskLabel(prediction.predictedRiskLevel)}</strong>
                </article>
              </div>

              <p className="attendance-action-note">
                Forecast is based on {prediction.observedPoints} recent
                attendance snapshot{prediction.observedPoints === 1 ? "" : "s"}.
              </p>
            </motion.section>

            <motion.section
              className="detail-section detail-section--tight"
              variants={fadeUpItem}
              whileHover={cardHover}
            >
              <div className="detail-section__header">
                <div>
                  <p className="detail-section__eyebrow">AI Alert</p>
                  <h2>Parent Notification Draft</h2>
                </div>
              </div>

              <p className="detail-section__description">
                Generate or refresh a Gemini-assisted attendance message for the
                parent using the student&apos;s latest attendance data.
              </p>

              <div className="student-details__alert-actions">
                <motion.button
                  type="button"
                  className="student-details__alert-button"
                  onClick={handleGenerateAlert}
                  disabled={alertState.isLoading}
                  whileHover={!alertState.isLoading ? buttonHover : undefined}
                  whileTap={!alertState.isLoading ? buttonTap : undefined}
                >
                  {alertState.isLoading
                    ? "Generating message..."
                    : alertState.message
                      ? "Regenerate Alert"
                      : "Send Alert"}
                </motion.button>
              </div>

              {alertState.message || alertState.isLoading ? (
                <AlertBox
                  title={`Message for ${student.parent?.name || "Parent/Guardian"}`}
                  message={alertState.message}
                  isLoading={alertState.isLoading}
                  isFallback={alertState.isFallback}
                  note={alertState.note}
                  riskLevel={riskLevel}
                />
              ) : (
                <div className="query-empty-state">
                  No alert has been generated yet for this student.
                </div>
              )}
            </motion.section>

            <motion.section
              className="detail-section detail-section--tight"
              variants={fadeUpItem}
              whileHover={cardHover}
            >
              <div className="detail-section__header">
                <div>
                  <p className="detail-section__eyebrow">History</p>
                  <h2>Attendance Timeline</h2>
                </div>
              </div>

              <motion.div
                className="attendance-history"
                variants={subtleStaggerGroup}
              >
                {attendanceHistory.length ? (
                  attendanceHistory.map((historyEntry) => (
                    <motion.article
                      key={historyEntry.id}
                      className="attendance-history__item"
                      variants={fadeUpItem}
                      whileHover={cardHover}
                    >
                      <div className="attendance-history__meta">
                        <span
                          className={`attendance-history__status attendance-history__status--${historyEntry.status.toLowerCase()}`}
                        >
                          {getAttendanceStatusLabel(historyEntry.status)}
                        </span>
                        <span className="attendance-history__time">
                          {formatQueryTimestamp(historyEntry.createdAt)}
                        </span>
                      </div>
                      <p className="attendance-history__summary">
                        {historyEntry.attendedClasses} of{" "}
                        {historyEntry.totalClasses} classes attended
                      </p>
                      <p className="attendance-history__caption">
                        Attendance moved to {historyEntry.percentage}% and the
                        student is now {getRiskLabel(historyEntry.riskLevel).toLowerCase()}.
                      </p>
                    </motion.article>
                  ))
                ) : (
                  <div className="query-empty-state">
                    No attendance actions have been recorded in this session.
                  </div>
                )}
              </motion.div>
            </motion.section>
          </aside>
        </motion.section>
      </section>
    </motion.main>
  );
}

export default StudentDetails;
