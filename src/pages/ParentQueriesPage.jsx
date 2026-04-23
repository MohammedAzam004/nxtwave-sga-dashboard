import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import SearchBar from "../components/domain/SearchBar";
import SkeletonGrid from "../components/ui/SkeletonGrid";
import {
  formatQueryTimestamp,
  getQueryStatusLabel,
} from "../services/queryService";
import {
  buttonHover,
  buttonTap,
  cardHover,
  fadeUpItem,
  pageVariants,
  subtleStaggerGroup,
} from "../utils/motion";

function ParentQueriesPage({
  students,
  isLoading,
  errorMessage,
  onResolveParentQuery = () => {},
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sgaReplyDrafts, setSgaReplyDrafts] = useState({});

  const escalatedQueries = useMemo(
    () =>
      students
        .flatMap((student) =>
          (student.queries || [])
            .filter(
              (queryRecord) =>
                queryRecord.status === "pending" ||
                queryRecord.status === "resolved",
            )
            .map((queryRecord) => ({
              ...queryRecord,
              studentId: student.id,
              studentName: student.name,
              parentName: student.parent?.name || "Parent/Guardian",
            })),
        )
        .sort((queryA, queryB) => {
          if (queryA.status !== queryB.status) {
            return queryA.status === "pending" ? -1 : 1;
          }

          return (
            new Date(queryB.createdAt).getTime() -
            new Date(queryA.createdAt).getTime()
          );
        }),
    [students],
  );

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredQueries = escalatedQueries.filter((queryRecord) => {
    const studentMatch = queryRecord.studentName
      .toLowerCase()
      .includes(normalizedSearchTerm);
    const questionMatch = queryRecord.question
      .toLowerCase()
      .includes(normalizedSearchTerm);

    return studentMatch || questionMatch;
  });
  const pendingQueriesCount = escalatedQueries.filter(
    (queryRecord) => queryRecord.status === "pending",
  ).length;

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
            <h1>Parent Queries</h1>
            <p className="hero-copy">
              Review escalated parent questions, verify the AI answer, and send
              a manual SGA response whenever a personal follow-up is needed.
            </p>
          </div>

          <div className="hero-note">
            <p className="hero-note__eyebrow">Manual Follow-up</p>
            <h2>{pendingQueriesCount} Pending</h2>
            <p className="hero-note__copy">
              Pending items are awaiting a direct SGA reply. Resolved items remain
              visible for reference in the parent dashboard.
            </p>

            <div className="hero-note__meta">
              <div className="hero-note__meta-item">
                <span>Total Escalations</span>
                <strong>{escalatedQueries.length}</strong>
              </div>
              <div className="hero-note__meta-item">
                <span>Visible Queries</span>
                <strong>{filteredQueries.length}</strong>
              </div>
            </div>
          </div>
        </motion.header>

        {isLoading ? (
          <SkeletonGrid count={3} />
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

            {filteredQueries.length ? (
              <motion.section
                className="sga-query-grid"
                variants={subtleStaggerGroup}
              >
                {filteredQueries.map((queryRecord) => {
                  const draftReply =
                    sgaReplyDrafts[queryRecord.id] || queryRecord.sgaResponse || "";

                  return (
                    <motion.article
                      key={queryRecord.id}
                      className="query-item query-item--sga"
                      variants={fadeUpItem}
                      whileHover={cardHover}
                    >
                      <div className="query-item__meta">
                        <span className="query-item__tag">
                          {queryRecord.studentName}
                        </span>
                        <span
                          className={`query-item__status query-item__status--${queryRecord.status}`}
                        >
                          {getQueryStatusLabel(queryRecord.status)}
                        </span>
                      </div>

                      <p className="query-item__question">{queryRecord.question}</p>

                      <div className="query-item__context">
                        <span>From {queryRecord.parentName}</span>
                        <span>{formatQueryTimestamp(queryRecord.createdAt)}</span>
                      </div>

                      <p className="query-item__answer-label">AI Response</p>
                      <p className="query-item__answer">
                        {queryRecord.aiResponse ||
                          "Unable to generate response at the moment."}
                      </p>

                      {queryRecord.status === "resolved" ? (
                        <>
                          <p className="query-item__answer-label">SGA Response</p>
                          <p className="query-item__answer">
                            {queryRecord.sgaResponse}
                          </p>
                          <p className="query-item__note">
                            Resolved on {formatQueryTimestamp(queryRecord.resolvedAt)}
                          </p>
                        </>
                      ) : (
                        <div className="sga-reply-form">
                          <label
                            className="query-form__label"
                            htmlFor={`sga-reply-${queryRecord.id}`}
                          >
                            SGA Reply
                          </label>
                          <textarea
                            id={`sga-reply-${queryRecord.id}`}
                            className="query-form__textarea"
                            placeholder="Write a clear SGA follow-up for the parent..."
                            rows={3}
                            value={draftReply}
                            onChange={(event) =>
                              setSgaReplyDrafts((currentDrafts) => ({
                                ...currentDrafts,
                                [queryRecord.id]: event.target.value,
                              }))
                            }
                          />

                          <div className="sga-reply-form__actions">
                            <motion.button
                              type="button"
                              className="query-form__button"
                              onClick={() => {
                                onResolveParentQuery(
                                  queryRecord.studentId,
                                  queryRecord.id,
                                  draftReply,
                                );
                                setSgaReplyDrafts((currentDrafts) => ({
                                  ...currentDrafts,
                                  [queryRecord.id]: "",
                                }));
                              }}
                              whileHover={buttonHover}
                              whileTap={buttonTap}
                              disabled={!draftReply.trim()}
                            >
                              Send SGA Reply
                            </motion.button>
                            <p className="query-form__helper">
                              Resolving the query adds the SGA response to the
                              parent view.
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.article>
                  );
                })}
              </motion.section>
            ) : (
              <div className="feedback-panel empty-state">
                <h3>No escalated parent queries found</h3>
                <p>
                  Queries marked with Ask SGA will appear here for direct manual
                  follow-up.
                </p>
              </div>
            )}
          </>
        ) : null}
      </section>
    </motion.main>
  );
}

export default ParentQueriesPage;
