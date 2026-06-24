import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import SearchBar from "./components/SearchBar";
import { formatQueryTimestamp } from "./services/queryService";
import {
  buttonHover,
  buttonTap,
  cardHover,
  fadeUpItem,
  pageVariants,
  subtleStaggerGroup,
} from "./utils/motion";

function AttendanceRequestsPage({
  students,
  isLoading,
  errorMessage,
  currentPhase = "session",
  onApproveAttendanceRequest = async () => {},
}) {
  const [searchTerm, setSearchTerm] = useState("");

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

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredRequests = attendanceRequests.filter((requestRecord) =>
    requestRecord.studentName.toLowerCase().includes(normalizedSearchTerm),
  );
  const pendingAttendanceRequests = attendanceRequests.filter(
    (requestRecord) => requestRecord.status === "pending",
  );

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
            <h1>Attendance Requests</h1>
            <p className="hero-copy">
              Review student self-marking requests and approve attendance when the
              simulated time or campus checks block direct attendance marking.
            </p>
          </div>

          <div className="hero-note">
            <p className="hero-note__eyebrow">Request Status</p>
            <h2>{pendingAttendanceRequests.length} Pending</h2>
            <p className="hero-note__copy">
              Pending requests require SGA approval. Once approved, the student is
              marked present automatically in the current session.
            </p>

            <div className="hero-note__meta">
              <div className="hero-note__meta-item">
                <span>Total Requests</span>
                <strong>{attendanceRequests.length}</strong>
              </div>
              <div className="hero-note__meta-item">
                <span>Visible Requests</span>
                <strong>{filteredRequests.length}</strong>
              </div>
            </div>
          </div>
        </motion.header>

        {isLoading ? (
          <div className="feedback-panel">Loading attendance requests...</div>
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
            </motion.section>

            {filteredRequests.length ? (
              <motion.section
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
              </motion.section>
            ) : (
              <div className="feedback-panel empty-state">
                <h3>No attendance requests found</h3>
                <p>
                  New student approval requests will appear here when self-marking
                  is blocked.
                </p>
              </div>
            )}
          </>
        ) : null}
      </section>
    </motion.main>
  );
}

export default AttendanceRequestsPage;
