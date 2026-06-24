import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import RiskBadge from "./RiskBadge";
import { getRiskColor } from "../services/riskService";
import {
  buttonHover,
  buttonTap,
  cardHover,
  cardTap,
  fadeUpItem,
} from "../utils/motion";

function StudentCard({ student }) {
  const attendancePercentage = student.attendance?.percentage ?? 0;
  const riskLevel = student.riskLevel;
  const riskColors = getRiskColor(riskLevel);
  const studentId = student.id ?? "--";
  const hasAlert = Boolean(student.latestAlert?.message);

  return (
    <motion.article
      className="student-card-shell"
      variants={fadeUpItem}
      whileHover={cardHover}
      whileTap={cardTap}
    >
      <Link
        to={`/student/${student.id}`}
        className="student-card student-card--compact"
        data-risk={riskLevel}
        style={{
          background: riskColors.cardGradient,
          borderColor: riskColors.border,
        }}
        aria-label={`Open details for ${student.name}`}
      >
        <div className="student-card__compact-header">
          <p className="student-card__label">Student</p>
          <div className="student-card__meta-stack">
            <span className="student-card__id-badge">ID: {studentId}</span>
            <RiskBadge level={riskLevel} />
          </div>
        </div>

        <div className="student-card__compact-body">
          <h3>{student.name}</h3>
        </div>

        <div className="student-card__compact-footer">
          <span>Attendance</span>
          <strong>{attendancePercentage}%</strong>
        </div>

        {hasAlert ? (
          <div className="student-card__alert-pill">Alert Ready</div>
        ) : null}

        <div className="attendance-progress" aria-hidden="true">
          <span
            className="attendance-progress__value"
            style={{ width: `${attendancePercentage}%` }}
          />
        </div>
      </Link>

      <div className="student-card__footer-actions">
        <motion.div whileHover={buttonHover} whileTap={buttonTap}>
          <Link
            to={`/student-dashboard/${student.id}`}
            className="student-card__parent-link"
            aria-label={`View ${student.name} student dashboard`}
          >
            View as Student
          </Link>
        </motion.div>

        <motion.div whileHover={buttonHover} whileTap={buttonTap}>
          <Link
            to={`/parent-dashboard/${student.id}`}
            className="student-card__parent-link"
            aria-label={`View ${student.name} parent dashboard`}
          >
            View as Parent
          </Link>
        </motion.div>
      </div>
    </motion.article>
  );
}

export default StudentCard;
