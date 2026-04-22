const RISK_CONFIG = Object.freeze({
  HIGH: { label: "High Risk", priority: 0 },
  MEDIUM: { label: "Medium Risk", priority: 1 },
  LOW: { label: "Low Risk", priority: 2 },
});

const STABLE_TREND_THRESHOLD = 0.5;
const TREND_LOOKBACK_COUNT = 4;

function normalizePercentage(percentage) {
  const numericPercentage = Number(percentage);

  if (Number.isNaN(numericPercentage)) {
    return 0;
  }

  return Math.min(Math.max(numericPercentage, 0), 100);
}

function normalizeRiskLevel(riskLevel) {
  return RISK_CONFIG[riskLevel] ? riskLevel : "LOW";
}

export function calculateRisk(percentage) {
  const normalizedPercentage = normalizePercentage(percentage);

  if (normalizedPercentage < 75) {
    return "HIGH";
  }

  if (normalizedPercentage <= 85) {
    return "MEDIUM";
  }

  return "LOW";
}

export function getRiskLabel(riskLevel) {
  return RISK_CONFIG[normalizeRiskLevel(riskLevel)].label;
}

export function getRiskPriority(riskLevel) {
  return RISK_CONFIG[normalizeRiskLevel(riskLevel)].priority;
}

export function getTrendLabel(trendDirection) {
  if (trendDirection === "INCREASING") {
    return "Increasing";
  }

  if (trendDirection === "DECREASING") {
    return "Decreasing";
  }

  return "Stable";
}

export function predictAttendanceRisk(currentPercentage, attendanceHistory = []) {
  const normalizedCurrentPercentage = normalizePercentage(currentPercentage);
  const recentPercentages = attendanceHistory
    .slice(0, TREND_LOOKBACK_COUNT)
    .map((historyEntry) => normalizePercentage(historyEntry?.percentage))
    .reverse();

  if (!recentPercentages.length) {
    recentPercentages.push(normalizedCurrentPercentage);
  }

  if (
    recentPercentages[recentPercentages.length - 1] !==
    normalizedCurrentPercentage
  ) {
    recentPercentages.push(normalizedCurrentPercentage);
  }

  const percentageChanges = [];

  for (let index = 1; index < recentPercentages.length; index += 1) {
    percentageChanges.push(
      recentPercentages[index] - recentPercentages[index - 1],
    );
  }

  const averageChange = percentageChanges.length
    ? percentageChanges.reduce((sum, change) => sum + change, 0) /
      percentageChanges.length
    : 0;

  let trendDirection = "STABLE";

  if (averageChange > STABLE_TREND_THRESHOLD) {
    trendDirection = "INCREASING";
  } else if (averageChange < -STABLE_TREND_THRESHOLD) {
    trendDirection = "DECREASING";
  }

  const predictedPercentage = normalizePercentage(
    Math.round(normalizedCurrentPercentage + averageChange),
  );

  return {
    currentPercentage: normalizedCurrentPercentage,
    predictedPercentage,
    predictedRiskLevel: calculateRisk(predictedPercentage),
    trendDirection,
    averageChange: Number(averageChange.toFixed(1)),
    observedPoints: recentPercentages.length,
  };
}
