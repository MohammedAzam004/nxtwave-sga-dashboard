import { getRiskLabel } from "../../services/riskService";

function RiskBadge({ level }) {
  const variantMap = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
  };

  const variant = variantMap[level] || "neutral";

  return (
    <span className={`badge badge-${variant}`}>
      {getRiskLabel(level)}
    </span>
  );
}

export default RiskBadge;
