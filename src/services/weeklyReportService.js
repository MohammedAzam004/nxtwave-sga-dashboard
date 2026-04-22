import { calculateRisk } from "./riskService";

const STORED_WEEKLY_REPORTS_KEY = "agentic-sga-weekly-reports-v1";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createWeeklyReportId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `weekly-report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSafeDate(dateInput) {
  const parsedDate = new Date(dateInput);

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
}

function parseSessionDate(session) {
  const rawDate =
    session?.createdAt || session?.date || session?.timestamp || session?.sessionDate;

  if (!rawDate) {
    return null;
  }

  const parsedDate = new Date(rawDate);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function normalizeSessionStatus(status) {
  const normalizedStatus = String(status || "").trim().toUpperCase();

  if (normalizedStatus === "PRESENT") {
    return "PRESENT";
  }

  if (normalizedStatus === "ABSENT") {
    return "ABSENT";
  }

  return "PENDING";
}

function getISODateString(dateInput) {
  return getSafeDate(dateInput).toISOString().slice(0, 10);
}

function formatDateLabel(dateInput) {
  return getSafeDate(dateInput).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getStartOfWeek(dateInput = new Date()) {
  const date = getSafeDate(dateInput);
  const startOfWeek = new Date(date);
  const currentDay = startOfWeek.getDay();
  const dayOffset = currentDay === 0 ? -6 : 1 - currentDay;

  startOfWeek.setDate(startOfWeek.getDate() + dayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  return startOfWeek;
}

export function getEndOfWeek(dateInput = new Date()) {
  const startOfWeek = getStartOfWeek(dateInput);
  const endOfWeek = new Date(startOfWeek);

  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return endOfWeek;
}

export function getCurrentWeekKey(dateInput = new Date()) {
  return getISODateString(getStartOfWeek(dateInput));
}

export function getWeeklyReportPeriodLabel(dateInput = new Date()) {
  const startOfWeek = getStartOfWeek(dateInput);
  const endOfWeek = getEndOfWeek(dateInput);

  return `${formatDateLabel(startOfWeek)} - ${formatDateLabel(endOfWeek)}`;
}

export function getSimulatedWeeklySendLabel() {
  return "Sent by SGA (Simulated Sunday 9:00 AM)";
}

export function calculateWeeklyAttendanceSummary(
  attendanceSessions = [],
  fallbackRiskLevel = "LOW",
  dateInput = new Date(),
) {
  const startOfWeek = getStartOfWeek(dateInput);
  const endOfWeek = getEndOfWeek(dateInput);
  const normalizedSessions = attendanceSessions.filter(Boolean);
  const weeklySessions = normalizedSessions.filter((session) => {
    const sessionDate = parseSessionDate(session);

    if (!sessionDate) {
      return false;
    }

    return sessionDate >= startOfWeek && sessionDate <= endOfWeek;
  });
  const finalizedSessions = weeklySessions.filter((session) => {
    const sessionStatus = normalizeSessionStatus(session.status);
    return sessionStatus === "PRESENT" || sessionStatus === "ABSENT";
  });
  const presentCount = finalizedSessions.filter(
    (session) => normalizeSessionStatus(session.status) === "PRESENT",
  ).length;
  const totalSessions = finalizedSessions.length;
  const absentCount = totalSessions - presentCount;
  const attendancePercentage = totalSessions
    ? Math.round((presentCount / totalSessions) * 100)
    : 0;

  return {
    weekKey: getCurrentWeekKey(dateInput),
    periodLabel: getWeeklyReportPeriodLabel(dateInput),
    weekStartDate: getISODateString(startOfWeek),
    weekEndDate: getISODateString(endOfWeek),
    totalSessions,
    presentCount,
    absentCount,
    missedSessions: absentCount,
    attendancePercentage,
    riskLevel: totalSessions ? calculateRisk(attendancePercentage) : fallbackRiskLevel,
    hasSessions: totalSessions > 0,
  };
}

export function loadStoredWeeklyReportsByStudent() {
  if (!canUseLocalStorage()) {
    return {};
  }

  try {
    const storedReports = window.localStorage.getItem(STORED_WEEKLY_REPORTS_KEY);
    return storedReports ? JSON.parse(storedReports) : {};
  } catch {
    return {};
  }
}

export function persistWeeklyReportsByStudent(weeklyReportsByStudent) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    STORED_WEEKLY_REPORTS_KEY,
    JSON.stringify(weeklyReportsByStudent),
  );
}

export function getCurrentWeekReport(weeklyReports = [], dateInput = new Date()) {
  const currentWeekKey = getCurrentWeekKey(dateInput);

  return (
    weeklyReports.find((reportRecord) => reportRecord.weekKey === currentWeekKey) ||
    null
  );
}

export function getLatestWeeklyReport(weeklyReports = []) {
  return weeklyReports[0] || null;
}

export function upsertWeeklyReportForStudent(
  weeklyReportsByStudent,
  studentId,
  reportRecord,
) {
  if (studentId === undefined || studentId === null || !reportRecord) {
    return weeklyReportsByStudent;
  }

  const studentKey = String(studentId);
  const currentReports = weeklyReportsByStudent[studentKey] || [];
  const nextReport = {
    id: reportRecord.id || createWeeklyReportId(),
    ...reportRecord,
  };
  const nextReports = [
    nextReport,
    ...currentReports.filter(
      (currentReport) => currentReport.weekKey !== nextReport.weekKey,
    ),
  ].sort(
    (reportA, reportB) =>
      new Date(reportB.generatedAt || reportB.date).getTime() -
      new Date(reportA.generatedAt || reportA.date).getTime(),
  );
  const nextWeeklyReportsByStudent = {
    ...weeklyReportsByStudent,
    [studentKey]: nextReports,
  };

  persistWeeklyReportsByStudent(nextWeeklyReportsByStudent);

  return nextWeeklyReportsByStudent;
}
