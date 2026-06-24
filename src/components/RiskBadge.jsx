import { getRiskColor, getRiskLabel } from "../services/riskService";

function RiskBadge({ level }) {
  const riskColors = getRiskColor(level);

  return (
    <span
      className="risk-badge"
      style={{
        backgroundColor: riskColors.badgeBackground,
        color: riskColors.accent,
      }}
    >
      {getRiskLabel(level)}
    </span>
  );
}

export default RiskBadge;
