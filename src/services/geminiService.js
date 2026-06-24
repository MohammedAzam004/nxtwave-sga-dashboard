import { calculateRisk, getRiskLabel } from "./riskService";
import {
  calculateWeeklyAttendanceSummary,
  getCurrentWeekKey,
  getSimulatedWeeklySendLabel,
} from "./weeklyReportService";

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const STORED_ALERTS_KEY = "agentic-sga-parent-alerts-v3";
const LEGACY_ALERT_KEYS = [
  "agentic-sga-parent-alerts",
  "agentic-sga-parent-alerts-v2",
];

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function clearLegacyAlertStorage() {
  if (!canUseLocalStorage()) {
    return;
  }

  LEGACY_ALERT_KEYS.forEach((legacyKey) => {
    window.localStorage.removeItem(legacyKey);
  });
}

function readStoredAlerts() {
  if (!canUseLocalStorage()) {
    return {};
  }

  try {
    clearLegacyAlertStorage();
    const storedAlerts = window.localStorage.getItem(STORED_ALERTS_KEY);
    return storedAlerts ? JSON.parse(storedAlerts) : {};
  } catch {
    return {};
  }
}

function saveStoredAlert(studentId, alertRecord) {
  if (!canUseLocalStorage() || studentId === undefined || studentId === null) {
    return {
      ...alertRecord,
      generatedAt: new Date().toISOString(),
    };
  }

  clearLegacyAlertStorage();
  const alerts = readStoredAlerts();
  const savedAlertRecord = {
    ...alertRecord,
    generatedAt: new Date().toISOString(),
  };
  alerts[String(studentId)] = savedAlertRecord;

  window.localStorage.setItem(STORED_ALERTS_KEY, JSON.stringify(alerts));
  return savedAlertRecord;
}

function normalizeStudent(student) {
  const attendancePercentage = student.attendance?.percentage ?? 0;
  const attendedClasses = student.attendance?.attended ?? 0;
  const totalClasses = student.attendance?.totalClasses ?? 0;
  const riskLevel = student.riskLevel || calculateRisk(attendancePercentage);

  return {
    id: student.id,
    name: student.name || "Student",
    parentName: student.parent?.name || "Parent/Guardian",
    attendancePercentage,
    attendedClasses,
    totalClasses,
    riskLevel,
    attendanceSessions: Array.isArray(student.attendanceSessions)
      ? student.attendanceSessions
      : [],
  };
}

function buildWeeklyReportPrompt(student, weeklySummary) {
  return `
You are an academic attendance assistant writing a formal weekly report from the SGA team to a parent.

STUDENT DATA:
- Student Name: ${student.name}
- Weekly Attendance Percentage: ${weeklySummary.attendancePercentage}%
- Total Sessions This Week: ${weeklySummary.totalSessions}
- Present Sessions: ${weeklySummary.presentCount}
- Missed Sessions: ${weeklySummary.missedSessions}
- Weekly Risk Level: ${getRiskLabel(weeklySummary.riskLevel)}
- Reporting Week: ${weeklySummary.periodLabel}

REQUIREMENTS:
- Write a formal and supportive message to the parent.
- Clearly mention that this is a weekly attendance summary from the SGA team.
- Explain the weekly attendance level in simple language.
- Mention the missed-session count clearly.
- Provide one practical suggestion for improvement if attendance is low.
- If no sessions were recorded this week, clearly say that no attendance sessions were recorded in the current reporting window and avoid assuming reasons.
- Keep the response to 4 to 6 sentences.
- Start with "Dear Parent,"
- End with "Regards, SGA Team"
- Do not use bullet points or markdown.
  `.trim();
}

function buildWeeklyReportFallback(student, weeklySummary) {
  if (!weeklySummary.hasSessions) {
    return `Dear Parent,\n\nThis is a weekly attendance summary from the SGA team for ${student.name}. No attendance sessions were recorded in the current reporting window (${weeklySummary.periodLabel}), so a weekly attendance percentage could not be fully assessed from session data. Based on the latest available record, we recommend continuing to monitor attendance closely and reaching out to the SGA team if you would like a manual review.\n\nRegards, SGA Team`;
  }

  return `Dear Parent,\n\nThis is a weekly attendance update from the SGA team for ${student.name}. Your child recorded ${weeklySummary.presentCount} present sessions out of ${weeklySummary.totalSessions} total sessions this week, resulting in a weekly attendance of ${weeklySummary.attendancePercentage}%. This falls under the ${getRiskLabel(weeklySummary.riskLevel).toLowerCase()} category, and ${weeklySummary.missedSessions} session${weeklySummary.missedSessions === 1 ? "" : "s"} were missed during the reporting period. We recommend encouraging regular attendance and staying consistent with class participation in the coming week.\n\nRegards, SGA Team`;
}

export function detectIntent(query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (
    /\b(why|reason|cause|explain|explaining)\b/.test(normalizedQuery)
  ) {
    return "why";
  }

  if (
    /\b(improve|improvement|increase|better|suggest|advice|how can|what should|help)\b/.test(
      normalizedQuery,
    )
  ) {
    return "improve";
  }

  return "details";
}

function getIntentPromptInstructions(intent, student) {
  if (intent === "why") {
    return `
INTENT TYPE: why
- Focus on explaining what the attendance percentage and risk level indicate.
- Do NOT guess the cause of the attendance level.
- If the parent is asking for a cause or background reason, include exactly: "I currently only have attendance-related information."
- Keep the explanation tied to ${student.name}'s current attendance record only.
    `.trim();
  }

  if (intent === "improve") {
    return `
INTENT TYPE: improve
- Focus on supportive improvement suggestions based only on attendance and risk level.
- Suggest improving attendance consistency and regular class participation.
- Do NOT suggest specific interventions, medical reasons, academic scores, or personal circumstances unless they are provided.
    `.trim();
  }

  return `
INTENT TYPE: details
- Give a clear attendance summary using the provided student data.
- Explain what the current risk level means in simple words.
- Keep the answer informative, direct, and grounded only in the record provided.
  `.trim();
}

function buildPrompt(student) {
  return `
You are an empathetic school attendance support assistant.

Write one polite, professional message to ${student.parentName}, the parent or guardian of ${student.name}.

Context:
- Attendance percentage: ${student.attendancePercentage}%
- Classes attended: ${student.attendedClasses} out of ${student.totalClasses}
- Risk level: ${getRiskLabel(student.riskLevel)}

Requirements:
- Express concern in a calm and supportive tone
- Mention the attendance concern clearly
- Encourage the parent to connect with the school
- Suggest 1 or 2 constructive next steps
- Keep the message between 90 and 140 words
- Do not use bullet points
- Do not use markdown
- End with a short professional sign-off from the Student Guidance & Attendance Team
  `.trim();
}

function buildFallbackMessage(student) {
  return `Dear ${student.parentName}, we wanted to share a concern regarding ${student.name}'s recent attendance. Their current attendance stands at ${student.attendancePercentage}%, which places them in the ${getRiskLabel(student.riskLevel).toLowerCase()} category. We would appreciate the opportunity to work together to understand any challenges affecting attendance and to support consistent participation in classes. Please consider reaching out to the school so we can discuss helpful next steps and ensure your child receives the support they need. Kind regards, Student Guidance & Attendance Team`;
}

function buildAbsenceAlertPrompt(student, slot) {
  return `
You are writing an official school attendance alert to a parent.

Context:
- Student name: ${student.name}
- Missed session: ${slot}
- Reason: Attendance was not recorded in session or grace period

Write a clear and polite parent message.

Requirements:
- Start with "Dear Parent,"
- Mention the missed session (${slot})
- Explain that attendance was not confirmed during the allowed time window and grace period
- Ask for timely attendance in future sessions
- End with "Regards,\nSGA Team"
- Keep it concise, professional, and easy to understand
- Do not use markdown or bullet points
  `.trim();
}

function buildAbsenceAlertFallback(student, slot) {
  return `Dear Parent,\n\nYour child ${student.name} was marked absent for the session between ${slot} AM as attendance was not recorded within the allowed time. Despite a grace period for manual updates, attendance was not confirmed. Please ensure timely attendance in future sessions.\n\nRegards,\nSGA Team`;
}

function buildParentResponsePrompt(student, question, intent) {
  return `
You are a strict academic assistant. Your job is to answer using ONLY the provided student data.

STUDENT DATA (SOURCE OF TRUTH):
Name: ${student.name}
Attendance Percentage: ${student.attendancePercentage}%
Risk Level: ${getRiskLabel(student.riskLevel)}

PARENT QUESTION:
${question}

${getIntentPromptInstructions(intent, student)}

STRICT RULES:
1. You MUST only use the provided data.
2. You MUST NOT invent or assume any information.
3. If information is missing, clearly say: "I currently only have attendance-related information."
4. You MUST give a complete answer in 3 to 5 sentences.
5. You MUST include the student name, attendance percentage, and a simple explanation of the risk level.
6. If attendance is below 75%, clearly explain that it is low and suggest improvement.
7. Do NOT give a short or incomplete answer.
8. Do NOT stop early.
9. Do not use bullet points or markdown in the final answer.

RESPONSE FORMAT:
- Sentence 1: Start exactly with "${student.name} currently has an attendance of ${student.attendancePercentage}%."
- Sentence 2: Explain what the ${getRiskLabel(student.riskLevel).toLowerCase()} level means in simple words.
- Sentence 3: Give a suggestion based only on the attendance data.
- Add 1 or 2 more short sentences only if needed for clarity.
  `.trim();
}

function buildParentResponseFallback(student, question, intent) {
  const asksForMissingDetails =
    /performance|performing|marks|grade|grades|behavior|health|reason|cause|why/i.test(
      question,
    );
  const riskLabel = getRiskLabel(student.riskLevel).toLowerCase();
  const lowAttendanceLine =
    student.attendancePercentage < 75
      ? "This indicates that attendance is below the recommended level and needs attention."
      : "This reflects the current attendance level based on the available record.";
  const suggestionLine =
    student.riskLevel === "LOW"
      ? "Continuing regular attendance will help maintain this positive position."
      : "It would be beneficial to improve consistency in attending classes and monitor participation regularly.";
  const detailsLine = `${student.name} currently has an attendance of ${student.attendancePercentage}%. This falls under the ${riskLabel} category. ${lowAttendanceLine}`;

  if (intent === "improve") {
    return `${detailsLine} ${suggestionLine}`;
  }

  if (asksForMissingDetails) {
    return `${detailsLine} I currently only have attendance-related information. ${suggestionLine}`;
  }

  if (intent === "why") {
    return `${detailsLine} I currently only have attendance-related information. ${suggestionLine}`;
  }

  return `${detailsLine} ${suggestionLine}`;
}

function extractMessage(responseData) {
  if (typeof responseData?.message === "string" && responseData.message.trim()) {
    return responseData.message.trim();
  }

  const parts =
    responseData?.candidates?.flatMap(
      (candidate) => candidate?.content?.parts || [],
    ) || [];

  return parts
    .map((part) => part?.text || "")
    .join("\n")
    .trim();
}

async function parseError(response) {
  try {
    const errorBody = await response.json();
    return errorBody?.error?.message || "Unable to generate the message.";
  } catch {
    return "Unable to generate the message.";
  }
}

async function requestThroughProxy(prompt, student, generationConfig = {}) {
  const response = await fetch(GEMINI_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      prompt,
      student,
      generationConfig,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

async function requestDirectly(prompt, generationConfig = {}) {
  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: {
        role: "system",
        parts: [
          {
            text: "You are a school attendance assistant. Use only the provided student data, stay supportive and professional, and never invent missing facts.",
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 220,
        ...generationConfig,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

async function requestGemini(prompt, student, options = {}) {
  let responseData;

  if (GEMINI_PROXY_URL) {
    responseData = await requestThroughProxy(
      prompt,
      student,
      options.generationConfig,
    );
  } else if (GEMINI_API_KEY) {
    // This fallback is convenient for local demos, but client-side env vars
    // are bundled into the frontend and are not secure for production use.
    responseData = await requestDirectly(prompt, options.generationConfig);
  } else {
    throw new Error(
      "Gemini is not configured. Add VITE_GEMINI_PROXY_URL for a secure setup, or VITE_GEMINI_API_KEY only for local demo use.",
    );
  }

  const message = extractMessage(responseData);

  if (!message) {
    throw new Error("Gemini returned an empty message.");
  }

  return message;
}

export async function generateMessage(student) {
  const normalizedStudent = normalizeStudent(student);
  const prompt = buildPrompt(normalizedStudent);

  try {
    const message = await requestGemini(prompt, normalizedStudent, {
      generationConfig: {
        temperature: 0.4,
        topP: 0.85,
        maxOutputTokens: 320,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const generatedAlert = saveStoredAlert(normalizedStudent.id, {
      message,
      isFallback: false,
      errorMessage: "",
    });

    return generatedAlert;
  } catch (error) {
    const fallbackAlert = saveStoredAlert(normalizedStudent.id, {
      message: buildFallbackMessage(normalizedStudent),
      isFallback: true,
      errorMessage: error.message || "Unable to generate the message.",
    });

    return fallbackAlert;
  }
}

export async function generateAbsenceAlert(student, slot) {
  const normalizedStudent = normalizeStudent(student);
  const normalizedSlot = String(slot || "9-10").trim() || "9-10";
  const prompt = buildAbsenceAlertPrompt(normalizedStudent, normalizedSlot);

  try {
    const message = await requestGemini(prompt, normalizedStudent, {
      generationConfig: {
        temperature: 0.25,
        topP: 0.8,
        maxOutputTokens: 220,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    return {
      slot: normalizedSlot,
      message,
      date: new Date().toISOString(),
      type: "absence",
      isFallback: false,
      errorMessage: "",
    };
  } catch (error) {
    return {
      slot: normalizedSlot,
      message: buildAbsenceAlertFallback(normalizedStudent, normalizedSlot),
      date: new Date().toISOString(),
      type: "absence",
      isFallback: true,
      errorMessage: error.message || "Unable to generate the absence alert.",
    };
  }
}

export async function generateWeeklyReport(student) {
  const normalizedStudent = normalizeStudent(student);
  const weeklySummary = calculateWeeklyAttendanceSummary(
    normalizedStudent.attendanceSessions,
    normalizedStudent.riskLevel,
  );
  const prompt = buildWeeklyReportPrompt(normalizedStudent, weeklySummary);

  try {
    const message = await requestGemini(prompt, normalizedStudent, {
      generationConfig: {
        temperature: 0.35,
        topP: 0.85,
        maxOutputTokens: 320,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    return {
      weekKey: getCurrentWeekKey(),
      date: weeklySummary.weekEndDate,
      message,
      generatedBy: "SGA (AI)",
      generatedAt: new Date().toISOString(),
      simulatedSentLabel: getSimulatedWeeklySendLabel(),
      isFallback: false,
      errorMessage: "",
      summary: weeklySummary,
      periodLabel: weeklySummary.periodLabel,
    };
  } catch (error) {
    return {
      weekKey: getCurrentWeekKey(),
      date: weeklySummary.weekEndDate,
      message: buildWeeklyReportFallback(normalizedStudent, weeklySummary),
      generatedBy: "SGA (AI)",
      generatedAt: new Date().toISOString(),
      simulatedSentLabel: getSimulatedWeeklySendLabel(),
      isFallback: true,
      errorMessage: error.message || "Unable to generate the weekly report.",
      summary: weeklySummary,
      periodLabel: weeklySummary.periodLabel,
    };
  }
}

export async function generateResponse(student, question) {
  const normalizedStudent = normalizeStudent(student);
  const trimmedQuestion = question.trim();
  const intent = detectIntent(trimmedQuestion);
  const prompt = buildParentResponsePrompt(
    normalizedStudent,
    trimmedQuestion,
    intent,
  );

  try {
    const answer = await requestGemini(prompt, normalizedStudent, {
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 256,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    return {
      answer,
      intent,
      isFallback: false,
      errorMessage: "",
    };
  } catch (error) {
    return {
      answer: buildParentResponseFallback(
        normalizedStudent,
        trimmedQuestion,
        intent,
      ),
      intent,
      isFallback: true,
      errorMessage: error.message || "Unable to generate response at the moment.",
    };
  }
}

export const generateParentResponse = generateResponse;
export const generateParentQueryResponse = generateParentResponse;

export function loadStoredGeneratedAlerts() {
  return readStoredAlerts();
}

export function getStoredGeneratedAlert(studentId) {
  if (studentId === undefined || studentId === null) {
    return null;
  }

  const storedAlerts = readStoredAlerts();
  return storedAlerts[String(studentId)] || null;
}
