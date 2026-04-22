const STORED_PARENT_QUERIES_KEY = "agentic-sga-parent-queries-v4";
const LEGACY_PARENT_QUERY_KEYS = [
  "agentic-sga-parent-queries",
  "agentic-sga-parent-queries-v2",
  "agentic-sga-parent-queries-v3",
];

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function clearLegacyParentQueryStorage() {
  if (!canUseLocalStorage()) {
    return;
  }

  LEGACY_PARENT_QUERY_KEYS.forEach((legacyKey) => {
    window.localStorage.removeItem(legacyKey);
  });
}

function createQueryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `query-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadStoredQueriesByStudent() {
  if (!canUseLocalStorage()) {
    return {};
  }

  try {
    clearLegacyParentQueryStorage();
    const storedQueries = window.localStorage.getItem(STORED_PARENT_QUERIES_KEY);
    return storedQueries ? JSON.parse(storedQueries) : {};
  } catch {
    return {};
  }
}

export function persistQueriesByStudent(queriesByStudent) {
  if (!canUseLocalStorage()) {
    return;
  }

  clearLegacyParentQueryStorage();
  window.localStorage.setItem(
    STORED_PARENT_QUERIES_KEY,
    JSON.stringify(queriesByStudent),
  );
}

export function createParentQueryRecord({
  studentId,
  question,
  aiResponse,
  isFallbackAnswer = false,
  errorMessage = "",
}) {
  return {
    id: createQueryId(),
    studentId: String(studentId),
    source: "parent",
    question: question.trim(),
    aiResponse: aiResponse?.trim() || "",
    sgaResponse: "",
    status: "answered",
    isEscalated: false,
    isFallbackAnswer,
    errorMessage,
    createdAt: new Date().toISOString(),
    escalatedAt: "",
    resolvedAt: "",
  };
}

export function addQueryToStudent(queriesByStudent, studentId, queryRecord) {
  if (studentId === undefined || studentId === null) {
    return queriesByStudent;
  }

  const studentKey = String(studentId);
  const nextQueriesByStudent = {
    ...queriesByStudent,
    [studentKey]: [queryRecord, ...(queriesByStudent[studentKey] || [])],
  };

  persistQueriesByStudent(nextQueriesByStudent);

  return nextQueriesByStudent;
}

export function updateStudentQuery(
  queriesByStudent,
  studentId,
  queryId,
  updater,
) {
  if (studentId === undefined || studentId === null || !queryId) {
    return queriesByStudent;
  }

  const studentKey = String(studentId);
  const currentQueries = queriesByStudent[studentKey] || [];
  let hasUpdatedQuery = false;

  const nextQueries = currentQueries.map((queryRecord) => {
    if (queryRecord.id !== queryId) {
      return queryRecord;
    }

    hasUpdatedQuery = true;
    return typeof updater === "function"
      ? updater(queryRecord)
      : {
          ...queryRecord,
          ...updater,
        };
  });

  if (!hasUpdatedQuery) {
    return queriesByStudent;
  }

  const nextQueriesByStudent = {
    ...queriesByStudent,
    [studentKey]: nextQueries,
  };

  persistQueriesByStudent(nextQueriesByStudent);

  return nextQueriesByStudent;
}

export function escalateStudentQuery(queriesByStudent, studentId, queryId) {
  return updateStudentQuery(
    queriesByStudent,
    studentId,
    queryId,
    (queryRecord) => ({
      ...queryRecord,
      status: queryRecord.status === "resolved" ? "resolved" : "pending",
      isEscalated: true,
      escalatedAt: queryRecord.escalatedAt || new Date().toISOString(),
    }),
  );
}

export function resolveStudentQuery(
  queriesByStudent,
  studentId,
  queryId,
  sgaResponse,
) {
  const trimmedResponse = sgaResponse.trim();

  if (!trimmedResponse) {
    return queriesByStudent;
  }

  return updateStudentQuery(
    queriesByStudent,
    studentId,
    queryId,
    (queryRecord) => ({
      ...queryRecord,
      status: "resolved",
      isEscalated: true,
      sgaResponse: trimmedResponse,
      resolvedAt: new Date().toISOString(),
      escalatedAt: queryRecord.escalatedAt || new Date().toISOString(),
    }),
  );
}

export function getQueryStatusLabel(status) {
  if (status === "pending") {
    return "Pending";
  }

  if (status === "resolved") {
    return "Resolved";
  }

  return "AI Answered";
}

export function formatQueryTimestamp(timestamp) {
  if (!timestamp) {
    return "";
  }

  const parsedDate = new Date(timestamp);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
