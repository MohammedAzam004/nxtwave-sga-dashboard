export const ACTIVE_SESSION_SLOT = "9-10";

export function getActiveSession(sessions = [], slot = ACTIVE_SESSION_SLOT) {
  return (
    sessions.find((s) => s.slot === slot) || {
      slot,
      status: "pending",
      alertSent: false,
    }
  );
}

export function normalizeSessionStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s === "present") return "present";
  if (s === "absent") return "absent";
  return "pending";
}

export function createDefaultAttendanceSession(slot = ACTIVE_SESSION_SLOT) {
  return { slot, status: "pending", alertSent: false };
}
