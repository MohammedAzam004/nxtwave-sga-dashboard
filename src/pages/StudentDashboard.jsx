import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import RiskBadge from "../components/domain/RiskBadge";
import { formatQueryTimestamp } from "../services/queryService";
import { getRiskLabel } from "../services/riskService";
import { getActiveSession } from "../utils/attendance";
import {
  buttonHover,
  buttonTap,
  cardHover,
  fadeUpItem,
  pageVariants,
  subtleStaggerGroup,
} from "../utils/motion";

const phaseMessages = {
  session: {
    title: "Attendance Session Active (9-10)",
    body: "You can mark attendance during this session window.",
  },
  grace: {
    title: "Grace Period Active (10-11)",
    body: "Student self-marking is disabled. Submit a request to SGA with your reason.",
  },
  closed: {
    title: "Attendance Window Closed",
    body: "Attendance window closed. Pending students are marked absent and parents are alerted.",
  },
};


function getSessionStatusLabel(status) {
  if (status === "present") {
    return "Present";
  }

  if (status === "absent") {
    return "Absent";
  }

  return "Pending";
}

function StudentDashboard({
  students,
  isLoading,
  errorMessage,
  currentPhase = "session",
  currentSessionSlot = "9-10",
  onStudentMarkAttendance = async () => {},
  onRequestAttendanceApproval = () => {},
}) {
  const { id } = useParams();
  const [requestReason, setRequestReason] = useState("");
  const [requestError, setRequestError] = useState("");

  const student = useMemo(
    () => students.find((studentRecord) => String(studentRecord.id) === id) || null,
    [id, students],
  );

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
          <div className="feedback-panel">Loading student dashboard...</div>
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
            Student record not found. Open the dashboard and select a valid
            student entry.
          </div>
        </section>
      </motion.main>
    );
  }

  const attendancePercentage = student.attendance?.percentage ?? 0;
  const riskLevel = student.riskLevel;
  const riskClass = riskLevel.toLowerCase();
  const activeSession = getActiveSession(student.attendanceSessions, currentSessionSlot);
  const canMarkAttendance =
    currentPhase === "session" && activeSession.status === "pending";
  const phaseMessage = phaseMessages[currentPhase] || phaseMessages.session;
  const latestRequest = (student.attendanceRequests || [])[0] || null;
  const hasPendingRequest = Boolean(
    (student.attendanceRequests || []).find(
      (requestRecord) => requestRecord.status === "pending",
    ),
  );
  const canSubmitSgaRequest =
    currentPhase === "grace" &&
    activeSession.status === "pending" &&
    !hasPendingRequest;

  const handleSubmitRequest = () => {
    const trimmedReason = requestReason.trim();

    if (!trimmedReason) {
      setRequestError("Please provide a reason before submitting to SGA.");
      return;
    }

    onRequestAttendanceApproval(student.id, trimmedReason);
    setRequestReason("");
    setRequestError("");
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
          Back to Main Dashboard
        </Link>

        <motion.header
          className="dashboard-hero student-details-hero"
          variants={fadeUpItem}
        >
          <div>
            <p className="eyebrow">Student Dashboard</p>
            <div className="student-details__title-row">
              <div>
                <h1>{student.name}</h1>
                <p className="hero-copy">
                  Mark attendance between 9-10. If missed, submit a reason to
                  SGA during grace period for manual approval before close.
                </p>
              </div>
              <RiskBadge level={riskLevel} />
            </div>
          </div>

          <div className="hero-note">
            <p className="hero-note__eyebrow">Student Snapshot</p>
            <h2>{attendancePercentage}% attendance</h2>
            <p className="hero-note__copy">
              {student.name} is currently classified as{" "}
              {getRiskLabel(riskLevel).toLowerCase()} based on the latest
              attendance data.
            </p>

            <div className="hero-note__meta">
              <div className="hero-note__meta-item">
                <span>Session Slot</span>
                <strong>{activeSession.slot}</strong>
              </div>
              <div className="hero-note__meta-item">
                <span>Session Status</span>
                <strong>{getSessionStatusLabel(activeSession.status)}</strong>
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
                  <p className="detail-section__eyebrow">Current Window</p>
                  <h2>{phaseMessage.title}</h2>
                </div>
              </div>

              <p className="detail-section__description">{phaseMessage.body}</p>

              <div className="student-details__stats">
                <article className="student-details__stat">
                  <span>Current Phase</span>
                  <strong>{currentPhase.toUpperCase()}</strong>
                </article>
                <article className="student-details__stat">
                  <span>Slot</span>
                  <strong>{activeSession.slot}</strong>
                </article>
                <article className="student-details__stat">
                  <span>Status</span>
                  <strong>{getSessionStatusLabel(activeSession.status)}</strong>
                </article>
              </div>
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
                  <p className="detail-section__eyebrow">Actions</p>
                  <h2>Attendance Flow</h2>
                </div>
              </div>

              <div className="attendance-actions">
                <motion.button
                  type="button"
                  className="attendance-action-button attendance-action-button--present"
                  onClick={() => onStudentMarkAttendance(student.id)}
                  disabled={!canMarkAttendance}
                  whileHover={canMarkAttendance ? buttonHover : undefined}
                  whileTap={canMarkAttendance ? buttonTap : undefined}
                >
                  {canMarkAttendance ? "Mark Present (9-10)" : "Marking Disabled"}
                </motion.button>
              </div>

              {!canMarkAttendance ? (
                <p className="attendance-action-note student-phase-note">
                  {currentPhase === "session"
                    ? "Attendance already recorded for this session."
                    : "Attendance window closed. Contact SGA if missed."}
                </p>
              ) : null}

              <div className="sga-reply-form">
                <label className="query-form__label" htmlFor="attendance-request-reason">
                  Request SGA Approval (Reason)
                </label>
                <textarea
                  id="attendance-request-reason"
                  className="query-form__textarea"
                  rows={3}
                  placeholder="Explain why attendance was not marked between 9-10..."
                  value={requestReason}
                  onChange={(event) => {
                    setRequestReason(event.target.value);
                    if (requestError) {
                      setRequestError("");
                    }
                  }}
                  disabled={!canSubmitSgaRequest}
                />

                {requestError ? (
                  <p className="query-form__error">{requestError}</p>
                ) : null}

                <motion.button
                  type="button"
                  className="query-form__button"
                  onClick={handleSubmitRequest}
                  disabled={!canSubmitSgaRequest}
                  whileHover={canSubmitSgaRequest ? buttonHover : undefined}
                  whileTap={canSubmitSgaRequest ? buttonTap : undefined}
                >
                  Submit Request To SGA
                </motion.button>

                <p className="query-form__helper">
                  {currentPhase !== "grace"
                    ? "Requests can be submitted during grace phase (10-11)."
                    : hasPendingRequest
                      ? "Your request is pending SGA approval."
                      : "Include a clear reason so SGA can review quickly."}
                </p>
              </div>

              {latestRequest ? (
                <article className="query-item query-item--compact">
                  <div className="query-item__meta">
                    <span className="query-item__tag">Latest Request</span>
                    <span
                      className={`query-item__status query-item__status--${
                        latestRequest.status === "approved" ? "resolved" : "pending"
                      }`}
                    >
                      {latestRequest.status === "approved" ? "Approved" : "Pending"}
                    </span>
                  </div>
                  {latestRequest.reason ? (
                    <p className="query-item__answer">Reason: {latestRequest.reason}</p>
                  ) : null}
                  <p className="query-item__note">
                    Requested on {formatQueryTimestamp(latestRequest.createdAt)}
                  </p>
                  {latestRequest.approvedAt ? (
                    <p className="query-item__note">
                      Approved on {formatQueryTimestamp(latestRequest.approvedAt)}
                    </p>
                  ) : null}
                </article>
              ) : null}

              <article className={`student-details__stat student-details__stat--${riskClass} mt-4`}>
                <span>Risk Level</span>
                <strong>{getRiskLabel(riskLevel)}</strong>
              </article>
            </motion.section>
          </aside>
        </motion.section>
      </section>
    </motion.main>
  );
}

export default StudentDashboard;
