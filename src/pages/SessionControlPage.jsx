import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SearchBar from "../components/domain/SearchBar";
import { formatQueryTimestamp } from "../services/queryService";
import { getActiveSession } from "../utils/attendance";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import {
  buttonHover,
  buttonTap,
  cardHover,
  fadeUpItem,
  pageVariants,
  subtleStaggerGroup,
} from "../utils/motion";

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

function SessionControlPage({
  students,
  isLoading,
  errorMessage,
  currentPhase = "session",
  currentSessionSlot = "9-10",
  onSetPhase = () => {},
  onStartNewSession = () => {},
  onSgaMarkSessionPresent = async () => {},
  onCloseSession = async () => {},
  onApproveAttendanceRequest = async () => {},
}) {
  const [requestSearchTerm, setRequestSearchTerm] = useState("");

  const sessionSummaries = students
    .map((student) => ({
      student,
      session: getActiveSession(student.attendanceSessions, currentSessionSlot),
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

  // Attendance requests — full functionality from AttendanceRequestsPage
  const attendanceRequests = useMemo(
    () =>
      students
        .flatMap((student) =>
          (student.attendanceRequests || []).map((requestRecord) => ({
            ...requestRecord,
            studentName: student.name,
            studentAttendance: student.attendance?.percentage ?? 0,
            studentRiskLevel: student.riskLevel,
          })),
        )
        .sort((requestA, requestB) => {
          if (requestA.status !== requestB.status) {
            return requestA.status === "pending" ? -1 : 1;
          }
          return (
            new Date(requestB.createdAt).getTime() -
            new Date(requestA.createdAt).getTime()
          );
        }),
    [students],
  );

  const normalizedRequestSearch = requestSearchTerm.trim().toLowerCase();
  const filteredRequests = attendanceRequests.filter((requestRecord) =>
    requestRecord.studentName.toLowerCase().includes(normalizedRequestSearch),
  );
  const pendingRequestsCount = attendanceRequests.filter(
    (requestRecord) => requestRecord.status === "pending",
  ).length;

  const phaseInfo = phaseDetailsByKey[currentPhase] || phaseDetailsByKey.session;

  if (isLoading) {
    return (
      <motion.main
        className="sga-dashboard"
        variants={pageVariants}
        initial="initial"
        animate="animate"
      >
        <section className="dashboard-shell">
          <SkeletonGrid count={3} />
        </section>
      </motion.main>
    );
  }

  if (errorMessage) {
    return <div className="feedback-panel error">{errorMessage}</div>;
  }

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

        <motion.header className="dashboard-hero" variants={fadeUpItem}>
          <div>
            <p className="eyebrow">Operations</p>
            <h1>Session Control</h1>
            <p className="hero-copy">
              Manage the lifecycle of the current attendance slot. Move from session to grace, approve pending students, and close the session.
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
            </div>
          </div>
        </motion.header>

        {/* Phase Controls */}
        <motion.section className="query-panel session-control-panel" variants={fadeUpItem}>
          <div className="query-panel__header">
            <div>
              <p className="query-panel__eyebrow">Lifecycle</p>
              <h3>Slot {currentSessionSlot} Phase Controls</h3>
            </div>
            <span className={`phase-badge phase-badge--${currentPhase}`}>
              {phaseInfo.title}
            </span>
          </div>

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
            <article className="query-item query-item--compact query-item--medium">
              <p className="query-item__answer-label">Pending</p>
              <p className="query-item__answer">{pendingSessions.length}</p>
            </article>
            <article className="query-item query-item--compact query-item--low">
              <p className="query-item__answer-label">Present</p>
              <p className="query-item__answer">{approvedSessions.length}</p>
            </article>
            <article className="query-item query-item--compact query-item--high">
              <p className="query-item__answer-label">Absent</p>
              <p className="query-item__answer">{absentSessions.length}</p>
            </article>
          </div>
        </motion.section>

        {/* Attendance Requests — merged from AttendanceRequestsPage */}
        <motion.section className="query-panel" variants={fadeUpItem}>
          <div className="query-panel__header">
            <div>
              <p className="query-panel__eyebrow">Student Requests</p>
              <h3>Attendance Requests</h3>
            </div>
            <span className="query-panel__count">
              {pendingRequestsCount} pending
            </span>
          </div>

          <p className="query-panel__intro">
            Review student self-marking requests and approve attendance when the
            time or campus checks block direct attendance marking. Once approved,
            the student is marked present automatically.
          </p>

          <motion.div className="controls-panel controls-panel--flush" variants={fadeUpItem}>
            <div className="controls-row controls-row--single">
              <SearchBar value={requestSearchTerm} onChange={setRequestSearchTerm} />
            </div>
          </motion.div>

          {filteredRequests.length ? (
            <motion.div
              className="sga-query-grid"
              variants={subtleStaggerGroup}
            >
              {filteredRequests.map((requestRecord) => (
                <motion.article
                  key={requestRecord.id}
                  className="query-item query-item--sga"
                  variants={fadeUpItem}
                  whileHover={cardHover}
                >
                  <div className="query-item__meta">
                    <span className="query-item__tag">
                      {requestRecord.studentName}
                    </span>
                    <span
                      className={`query-item__status query-item__status--${
                        requestRecord.status === "approved" ? "resolved" : "pending"
                      }`}
                    >
                      {requestRecord.status === "approved" ? "Approved" : "Pending"}
                    </span>
                  </div>

                  <p className="query-item__question">
                    {requestRecord.type === "attendance_request"
                      ? "Attendance request submitted by student"
                      : requestRecord.type}
                  </p>

                  {requestRecord.reason ? (
                    <p className="query-item__answer">
                      Student reason: {requestRecord.reason}
                    </p>
                  ) : null}

                  <div className="query-item__context">
                    <span>
                      Current attendance: {requestRecord.studentAttendance}%
                    </span>
                    <span>{requestRecord.studentRiskLevel} risk</span>
                  </div>

                  <p className="query-item__note">
                    Requested on {formatQueryTimestamp(requestRecord.createdAt)}
                  </p>

                  {requestRecord.status === "approved" &&
                  requestRecord.approvedAt ? (
                    <p className="query-item__note">
                      Approved on {formatQueryTimestamp(requestRecord.approvedAt)}
                    </p>
                  ) : null}

                  {requestRecord.status === "pending" ? (
                    <div className="sga-reply-form__actions">
                      <motion.button
                        type="button"
                        className="query-form__button"
                        onClick={() =>
                          onApproveAttendanceRequest(
                            requestRecord.studentId,
                            requestRecord.id,
                          )
                        }
                        disabled={currentPhase !== "grace"}
                        whileHover={buttonHover}
                        whileTap={buttonTap}
                      >
                        Approve Attendance
                      </motion.button>
                      <p className="query-form__helper">
                        {currentPhase === "grace"
                          ? "Approval marks the student present and closes the request automatically."
                          : "Approvals are enabled only during the grace phase (10-11)."}
                      </p>
                    </div>
                  ) : null}
                </motion.article>
              ))}
            </motion.div>
          ) : (
            <div className="feedback-panel empty-state">
              <h3>No attendance requests found</h3>
              <p>
                New student approval requests will appear here when self-marking
                is blocked.
              </p>
            </div>
          )}
        </motion.section>
      </section>
    </motion.main>
  );
}

export default SessionControlPage;
