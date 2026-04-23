import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import RiskBadge from "./RiskBadge";
import { fadeUpItem, cardHover, cardTap } from "../../utils/motion";

function StudentRow({ student }) {
  const navigate = useNavigate();
  const attendancePercentage = student.attendance?.percentage ?? 0;
  const riskLevel = student.riskLevel;
  const studentId = student.id ?? "--";

  const handleRowClick = () => {
    navigate(`/student/${student.id}`);
  };

  const handleActionClick = (e) => {
    e.stopPropagation();
  };

  return (
    <motion.div
      className={`student-row student-row--${riskLevel.toLowerCase()}`}
      variants={fadeUpItem}
      whileHover={cardHover}
      whileTap={cardTap}
      onClick={handleRowClick}
      style={{ cursor: "pointer" }}
    >
      <div className="student-row__info">
        <span className="student-row__name student-row__name--link" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
          {student.name}
        </span>
        <span className="student-row__id">ID: {studentId}</span>
      </div>

      <div className="student-row__attendance">
        <span className="student-row__attendance-value">{attendancePercentage}%</span>
        <div className={`student-row__progress attendance-progress attendance-progress--${riskLevel.toLowerCase()}`} aria-hidden="true">
          <span
            className="attendance-progress__value"
            style={{ width: `${attendancePercentage}%` }}
          />
        </div>
      </div>

      <div className="student-row__risk">
        <RiskBadge level={riskLevel} />
      </div>

      <div className="student-row__actions">
        <Link
          to={`/student-dashboard/${student.id}`}
          className="student-row__btn student-row__btn--student"
          aria-label={`View as student: ${student.name}`}
          onClick={handleActionClick}
        >
          View as Student
        </Link>
        <Link
          to={`/parent-dashboard/${student.id}`}
          className="student-row__btn student-row__btn--parent"
          aria-label={`View as parent: ${student.name}`}
          onClick={handleActionClick}
        >
          View as Parent
        </Link>
      </div>
    </motion.div>
  );
}

export default StudentRow;
