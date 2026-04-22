import { useEffect, useState } from "react";
import {
  generateAbsenceAlert,
  generateMessage,
  generateWeeklyReport,
} from "../services/geminiService";
import {
  addQueryToStudent,
  escalateStudentQuery,
  loadStoredQueriesByStudent,
  resolveStudentQuery,
} from "../services/queryService";
import { calculateRisk, predictAttendanceRisk } from "../services/riskService";
import {
  calculateWeeklyAttendanceSummary,
  getCurrentWeekReport,
  loadStoredWeeklyReportsByStudent,
  upsertWeeklyReportForStudent,
} from "../services/weeklyReportService";
import { useToast } from "../components/ui/Toast";
import {
  ACTIVE_SESSION_SLOT,
  getActiveSession,
  normalizeSessionStatus,
  createDefaultAttendanceSession,
} from "../utils/attendance";

const STUDENTS_STORAGE_KEY = "students";
const ATTENDANCE_HISTORY_STORAGE_KEY = "attendanceHistoryById";
const ATTENDANCE_ACCESS_STORAGE_KEY = "studentAttendanceAccessById";
const ATTENDANCE_PHASE_STORAGE_KEY = "attendancePhase";
const ATTENDANCE_REQUESTS_STORAGE_KEY = "attendanceRequestsByStudentId";

const validPhases = ["session", "grace", "closed"];

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getSafeCount(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return 0;
  return Math.round(numericValue);
}

function normalizePhase(phase) {
  const normalizedPhase = String(phase || "").trim().toLowerCase();
  return validPhases.includes(normalizedPhase) ? normalizedPhase : "session";
}

function normalizeAttendanceSessions(attendanceSessions) {
  const normalizedSessions = Array.isArray(attendanceSessions)
    ? attendanceSessions
        .filter(Boolean)
        .map((sessionRecord) => ({
          slot: String(sessionRecord.slot || ACTIVE_SESSION_SLOT),
          status: normalizeSessionStatus(sessionRecord.status),
          alertSent: Boolean(sessionRecord.alertSent),
          createdAt: sessionRecord.createdAt || sessionRecord.date || "",
        }))
    : [];

  const hasActiveSession = normalizedSessions.some(
    (sessionRecord) => sessionRecord.slot === ACTIVE_SESSION_SLOT,
  );

  if (!hasActiveSession) {
    return [createDefaultAttendanceSession(), ...normalizedSessions];
  }

  return normalizedSessions;
}

function ensureStudentAlertRecords(alerts) {
  if (!Array.isArray(alerts)) return [];
  return alerts
    .filter(Boolean)
    .map((alertRecord) => ({
      slot: String(alertRecord.slot || ACTIVE_SESSION_SLOT),
      message: String(alertRecord.message || "").trim(),
      date: alertRecord.date || alertRecord.generatedAt || new Date().toISOString(),
      type: String(alertRecord.type || "absence"),
      isFallback: Boolean(alertRecord.isFallback),
      errorMessage: alertRecord.errorMessage || "",
    }))
    .filter((alertRecord) => alertRecord.message);
}

function updateActiveSession(attendanceSessions = [], updates) {
  const nextSessions = Array.isArray(attendanceSessions) ? [...attendanceSessions] : [];
  const activeSessionIndex = nextSessions.findIndex(
    (sessionRecord) => sessionRecord.slot === ACTIVE_SESSION_SLOT,
  );
  const currentSession =
    activeSessionIndex >= 0 ? nextSessions[activeSessionIndex] : createDefaultAttendanceSession();
  
  const nextSession = {
    ...currentSession,
    ...updates,
    slot: ACTIVE_SESSION_SLOT,
    status: normalizeSessionStatus(updates?.status || currentSession.status),
    alertSent:
      updates?.alertSent !== undefined ? Boolean(updates.alertSent) : Boolean(currentSession.alertSent),
  };

  if (activeSessionIndex >= 0) {
    nextSessions[activeSessionIndex] = nextSession;
  } else {
    nextSessions.unshift(nextSession);
  }

  return nextSessions;
}

function normalizeStudentRecord(student) {
  const rawAttendedClasses = getSafeCount(student.attendance?.attended);
  const rawTotalClasses = getSafeCount(student.attendance?.totalClasses);
  const totalClasses = Math.max(rawTotalClasses, rawAttendedClasses);
  const attendedClasses = Math.min(rawAttendedClasses, totalClasses);
  const percentage = totalClasses ? Math.round((attendedClasses / totalClasses) * 100) : 0;

  return {
    ...student,
    attendance: { totalClasses, attended: attendedClasses, percentage },
    riskLevel: calculateRisk(percentage),
    attendanceSessions: normalizeAttendanceSessions(student.attendanceSessions),
    alerts: ensureStudentAlertRecords(student.alerts),
  };
}

function createAttendanceHistoryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `attendance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createAttendanceHistoryEntry(status, updatedStudent, createdAt, id) {
  return {
    id,
    status,
    createdAt,
    percentage: updatedStudent.attendance.percentage,
    attendedClasses: updatedStudent.attendance.attended,
    totalClasses: updatedStudent.attendance.totalClasses,
    riskLevel: updatedStudent.riskLevel,
  };
}

function createAttendanceRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `attendance-request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultAttendanceAccess(studentId) {
  const numericStudentId = Number(studentId);
  if (!Number.isFinite(numericStudentId)) {
    return { isWithinTime: true, isOnCampus: true, alreadyMarked: false };
  }
  return {
    isWithinTime: numericStudentId % 3 !== 0,
    isOnCampus: numericStudentId % 5 !== 0,
    alreadyMarked: false,
  };
}

function updateAttendanceAccess(currentAccessByStudentId, studentId, updates) {
  const studentKey = String(studentId);
  return {
    ...currentAccessByStudentId,
    [studentKey]: {
      ...createDefaultAttendanceAccess(studentId),
      ...(currentAccessByStudentId[studentKey] || {}),
      ...updates,
    },
  };
}

function createAttendanceRequest(studentId, reasonMessage) {
  const trimmedReason = String(reasonMessage || "").trim();
  return {
    id: createAttendanceRequestId(),
    studentId: String(studentId),
    type: "attendance_request",
    reason: trimmedReason,
    status: "pending",
    createdAt: new Date().toISOString(),
    approvedAt: "",
  };
}

function readStoredValue(storageKey, fallbackValue) {
  if (!canUseLocalStorage()) return fallbackValue;
  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) return fallbackValue;
    return JSON.parse(storedValue);
  } catch {
    return fallbackValue;
  }
}

function readStoredStudents() {
  const storedStudents = readStoredValue(STUDENTS_STORAGE_KEY, []);
  if (!Array.isArray(storedStudents)) return [];
  return storedStudents.map(normalizeStudentRecord);
}

function readStoredRecordMap(storageKey) {
  const storedRecordMap = readStoredValue(storageKey, {});
  if (!storedRecordMap || typeof storedRecordMap !== "object" || Array.isArray(storedRecordMap)) {
    return {};
  }
  return storedRecordMap;
}

function saveStoredValue(storageKey, value) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

export function useAppState() {
  const { toasts, addToast } = useToast();
  const [studentSessionState, setStudentSessionState] = useState(() => ({
    students: readStoredStudents(),
    attendanceHistoryById: readStoredRecordMap(ATTENDANCE_HISTORY_STORAGE_KEY),
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [studentQueriesById, setStudentQueriesById] = useState(() => loadStoredQueriesByStudent());
  const [weeklyReportsByStudentId, setWeeklyReportsByStudentId] = useState(() => loadStoredWeeklyReportsByStudent());
  const [currentPhase, setCurrentPhase] = useState(() => normalizePhase(readStoredValue(ATTENDANCE_PHASE_STORAGE_KEY, "session")));
  const [studentAttendanceAccessById, setStudentAttendanceAccessById] = useState(() => readStoredRecordMap(ATTENDANCE_ACCESS_STORAGE_KEY));
  const [attendanceRequestsByStudentId, setAttendanceRequestsByStudentId] = useState(() => readStoredRecordMap(ATTENDANCE_REQUESTS_STORAGE_KEY));

  useEffect(() => {
    const controller = new AbortController();

    const loadStudents = async () => {
      if (studentSessionState.students.length) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/students.json", { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load student records.");
        const studentData = await response.json();
        if (!Array.isArray(studentData)) throw new Error("Student records are not in the expected format.");
        if (!controller.signal.aborted) {
          setStudentSessionState((currentState) => ({
            ...currentState,
            students: studentData.map(normalizeStudentRecord),
          }));
        }
      } catch (error) {
        if (error.name !== "AbortError" && !controller.signal.aborted) {
          setErrorMessage(error.message || "Something went wrong.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadStudents();
    return () => controller.abort();
  }, [studentSessionState.students.length]);

  useEffect(() => {
    if (isLoading) return;
    saveStoredValue(STUDENTS_STORAGE_KEY, studentSessionState.students);
    saveStoredValue(ATTENDANCE_HISTORY_STORAGE_KEY, studentSessionState.attendanceHistoryById);
    saveStoredValue(ATTENDANCE_ACCESS_STORAGE_KEY, studentAttendanceAccessById);
    saveStoredValue(ATTENDANCE_REQUESTS_STORAGE_KEY, attendanceRequestsByStudentId);
    saveStoredValue(ATTENDANCE_PHASE_STORAGE_KEY, currentPhase);
  }, [
    attendanceRequestsByStudentId,
    currentPhase,
    isLoading,
    studentAttendanceAccessById,
    studentSessionState,
  ]);

  const students = studentSessionState.students;
  const attendanceHistoryById = studentSessionState.attendanceHistoryById;
  const studentsWithSessionData = students.map((student) => {
    const studentKey = String(student.id);
    const attendanceHistory = attendanceHistoryById[studentKey] || [];
    const attendanceSessions = normalizeAttendanceSessions(student.attendanceSessions);
    const weeklyReports = weeklyReportsByStudentId[studentKey] || [];
    const weeklyAttendanceSummary = calculateWeeklyAttendanceSummary(attendanceSessions, student.riskLevel);
    const alerts = ensureStudentAlertRecords(student.alerts);
    const activeSession = getActiveSession(attendanceSessions);

    return {
      ...student,
      attendanceSessions,
      activeSession,
      alerts,
      queries: studentQueriesById[studentKey] || [],
      latestAlert: alerts[0] || null,
      attendanceAccess: studentAttendanceAccessById[studentKey] || createDefaultAttendanceAccess(student.id),
      attendanceRequests: attendanceRequestsByStudentId[studentKey] || [],
      weeklyReports,
      currentWeekReport: getCurrentWeekReport(weeklyReports),
      weeklyAttendanceSummary,
      prediction: predictAttendanceRisk(student.attendance?.percentage, attendanceHistory),
    };
  });

  const handleSaveParentQuery = (studentId, queryRecord) => {
    setStudentQueriesById((currentQueriesByStudent) =>
      addQueryToStudent(currentQueriesByStudent, studentId, queryRecord),
    );
    addToast("Query submitted successfully.");
  };

  const handleEscalateParentQuery = (studentId, queryId) => {
    setStudentQueriesById((currentQueriesByStudent) =>
      escalateStudentQuery(currentQueriesByStudent, studentId, queryId),
    );
    addToast("Query escalated to SGA.", "info");
  };

  const handleResolveParentQuery = (studentId, queryId, sgaResponse) => {
    setStudentQueriesById((currentQueriesByStudent) =>
      resolveStudentQuery(currentQueriesByStudent, studentId, queryId, sgaResponse),
    );
    addToast("Query resolved successfully.");
  };

  const handleGenerateAlert = async (studentRecord) => {
    const generatedAlert = await generateMessage(studentRecord);
    setStudentSessionState((currentState) => ({
      ...currentState,
      students: currentState.students.map((student) => {
        if (String(student.id) !== String(studentRecord.id)) return student;
        return {
          ...student,
          alerts: [
            {
              slot: ACTIVE_SESSION_SLOT,
              message: generatedAlert.message,
              date: generatedAlert.generatedAt || new Date().toISOString(),
              type: "manual",
              isFallback: Boolean(generatedAlert.isFallback),
              errorMessage: generatedAlert.errorMessage || "",
            },
            ...ensureStudentAlertRecords(student.alerts),
          ],
        };
      }),
    }));
    addToast("Parent alert generated.");
    return generatedAlert;
  };

  const handleGenerateWeeklyReport = async (studentId) => {
    const studentKey = String(studentId);
    const currentStudent = students.find((student) => String(student.id) === studentKey);
    if (!currentStudent) return null;

    const attendanceSessions = normalizeAttendanceSessions(currentStudent.attendanceSessions);
    const generatedReport = await generateWeeklyReport({ ...currentStudent, attendanceSessions });

    setWeeklyReportsByStudentId((currentWeeklyReportsByStudent) =>
      upsertWeeklyReportForStudent(currentWeeklyReportsByStudent, studentId, generatedReport),
    );
    addToast(`Weekly report for ${currentStudent.name} generated.`);
    return generatedReport;
  };

  const handleMarkAttendance = async (studentId, attendanceStatus) => {
    const studentKey = String(studentId);
    const normalizedStatus = attendanceStatus === "ABSENT" ? "ABSENT" : "PRESENT";
    const currentStudent = students.find((student) => String(student.id) === studentKey);
    if (!currentStudent) return null;

    const createdAt = new Date().toISOString();
    const historyId = createAttendanceHistoryId();
    const currentTotalClasses = getSafeCount(currentStudent.attendance?.totalClasses);
    const currentAttendedClasses = getSafeCount(currentStudent.attendance?.attended);
    const totalClasses = currentTotalClasses + 1;
    const attendedClasses = currentAttendedClasses + (normalizedStatus === "PRESENT" ? 1 : 0);
    const percentage = totalClasses ? Math.round((attendedClasses / totalClasses) * 100) : 0;
    const updatedRiskLevel = calculateRisk(percentage);
    const updatedStudent = {
      ...currentStudent,
      attendance: { totalClasses, attended: attendedClasses, percentage },
      riskLevel: updatedRiskLevel,
    };
    const nextHistoryEntry = createAttendanceHistoryEntry(normalizedStatus, updatedStudent, createdAt, historyId);

    setStudentSessionState((currentState) => ({
      students: currentState.students.map((student) =>
        String(student.id) === studentKey ? updatedStudent : student,
      ),
      attendanceHistoryById: {
        ...currentState.attendanceHistoryById,
        [studentKey]: [nextHistoryEntry, ...(currentState.attendanceHistoryById[studentKey] || [])],
      },
    }));

    return updatedStudent;
  };

  const handleSetPhase = (nextPhase) => {
    setCurrentPhase(normalizePhase(nextPhase));
    addToast(`Phase updated to ${nextPhase}.`, "info");
  };

  const handleStartNewSession = () => {
    setCurrentPhase("session");
    setStudentSessionState((currentState) => ({
      ...currentState,
      students: currentState.students.map((student) => ({
        ...student,
        attendanceSessions: updateActiveSession(normalizeAttendanceSessions(student.attendanceSessions), {
          status: "pending",
          alertSent: false,
          createdAt: new Date().toISOString(),
        }),
      })),
    }));
    addToast("New session started for all students.");
  };

  const handleStudentMarkAttendance = async (studentId) => {
    if (currentPhase !== "session") return null;
    const studentKey = String(studentId);
    const currentStudent = students.find((student) => String(student.id) === studentKey);
    if (!currentStudent) return null;

    const activeSession = getActiveSession(normalizeAttendanceSessions(currentStudent.attendanceSessions));
    if (activeSession.status !== "pending") return currentStudent;

    const updatedStudent = await handleMarkAttendance(studentId, "PRESENT");
    if (!updatedStudent) return null;

    setStudentSessionState((currentState) => ({
      ...currentState,
      students: currentState.students.map((student) =>
        String(student.id) === studentKey
          ? {
              ...student,
              attendanceSessions: updateActiveSession(normalizeAttendanceSessions(student.attendanceSessions), {
                status: "present",
                alertSent: false,
              }),
            }
          : student,
      ),
    }));

    setStudentAttendanceAccessById((currentAccessByStudentId) =>
      updateAttendanceAccess(currentAccessByStudentId, studentId, { alreadyMarked: true }),
    );

    addToast("Attendance marked successfully.");
    return updatedStudent;
  };

  const handleSgaMarkSessionPresent = async (studentId) => {
    if (currentPhase !== "grace") return null;
    const studentKey = String(studentId);
    const currentStudent = students.find((student) => String(student.id) === studentKey);
    if (!currentStudent) return null;

    const activeSession = getActiveSession(normalizeAttendanceSessions(currentStudent.attendanceSessions));
    if (activeSession.status !== "pending") return currentStudent;

    const updatedStudent = await handleMarkAttendance(studentId, "PRESENT");
    if (!updatedStudent) return null;

    setStudentSessionState((currentState) => ({
      ...currentState,
      students: currentState.students.map((student) =>
        String(student.id) === studentKey
          ? {
              ...student,
              attendanceSessions: updateActiveSession(normalizeAttendanceSessions(student.attendanceSessions), {
                status: "present",
                alertSent: false,
              }),
            }
          : student,
      ),
    }));

    addToast(`Attendance for ${currentStudent.name} marked present.`);
    return updatedStudent;
  };

  const handleCloseSession = async () => {
    if (currentPhase === "closed") return;
    setCurrentPhase("closed");

    const pendingStudents = students.filter((student) => {
      const activeSession = getActiveSession(normalizeAttendanceSessions(student.attendanceSessions));
      return activeSession.status === "pending";
    });

    for (const student of pendingStudents) {
      const updatedStudent = await handleMarkAttendance(student.id, "ABSENT");
      const absenceAlert = await generateAbsenceAlert(updatedStudent || student, ACTIVE_SESSION_SLOT);

      setStudentSessionState((currentState) => ({
        ...currentState,
        students: currentState.students.map((currentStudent) => {
          if (String(currentStudent.id) !== String(student.id)) return currentStudent;
          return {
            ...currentStudent,
            attendanceSessions: updateActiveSession(normalizeAttendanceSessions(currentStudent.attendanceSessions), {
              status: "absent",
              alertSent: true,
            }),
            alerts: [absenceAlert, ...ensureStudentAlertRecords(currentStudent.alerts)],
          };
        }),
      }));
    }
    addToast("Session closed. Absence alerts sent to parents.", "info");
  };

  const handleRequestAttendanceApproval = (studentId, reasonMessage) => {
    if (currentPhase !== "grace") return;
    const trimmedReason = String(reasonMessage || "").trim();
    if (!trimmedReason) return;

    const studentKey = String(studentId);
    const currentStudent = students.find((student) => String(student.id) === studentKey);
    if (!currentStudent) return;

    const activeSession = getActiveSession(normalizeAttendanceSessions(currentStudent.attendanceSessions));
    if (activeSession.status !== "pending") return;

    setAttendanceRequestsByStudentId((currentRequestsByStudentId) => {
      const currentRequests = currentRequestsByStudentId[studentKey] || [];
      const hasPendingRequest = currentRequests.some((request) => request.status === "pending");
      if (hasPendingRequest) return currentRequestsByStudentId;

      return {
        ...currentRequestsByStudentId,
        [studentKey]: [createAttendanceRequest(studentId, trimmedReason), ...currentRequests],
      };
    });
    addToast("Request submitted to SGA.");
  };

  const handleApproveAttendanceRequest = async (studentId, requestId) => {
    if (currentPhase !== "grace") return;
    const studentKey = String(studentId);

    setAttendanceRequestsByStudentId((currentRequestsByStudentId) => {
      const currentRequests = currentRequestsByStudentId[studentKey] || [];
      return {
        ...currentRequestsByStudentId,
        [studentKey]: currentRequests.map((request) =>
          request.id === requestId
            ? { ...request, status: "approved", approvedAt: new Date().toISOString() }
            : request,
        ),
      };
    });

    await handleSgaMarkSessionPresent(studentId);
  };

  return {
    studentsWithSessionData,
    isLoading,
    errorMessage,
    currentPhase,
    ACTIVE_SESSION_SLOT,
    studentQueriesById,
    attendanceHistoryById,
    toasts,
    handleSetPhase,
    handleStartNewSession,
    handleSgaMarkSessionPresent,
    handleCloseSession,
    handleApproveAttendanceRequest,
    handleGenerateWeeklyReport,
    handleResolveParentQuery,
    handleStudentMarkAttendance,
    handleRequestAttendanceApproval,
    handleMarkAttendance,
    handleGenerateAlert,
    handleSaveParentQuery,
    handleEscalateParentQuery,
  };
}
