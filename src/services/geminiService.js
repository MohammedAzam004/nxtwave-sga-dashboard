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

export function isGeminiConfigured() {
  return Boolean(GEMINI_PROXY_URL || GEMINI_API_KEY);
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

// --- Prompt Builders ---

function buildPrompt(student) {
  return `
You are an empathetic school attendance support assistant for the Student Guidance & Attendance (SGA) team.

Write one polite, professional message to ${student.parentName}, the parent or guardian of ${student.name}.

Context:
- Attendance percentage: ${student.attendancePercentage}%
- Classes attended: ${student.attendedClasses} out of ${student.totalClasses}
- Risk level: ${getRiskLabel(student.riskLevel)}
- This alert is being sent because the student's attendance session was not confirmed during the 9-10 AM window and the subsequent grace period.

Requirements:
- Address the parent by role ("Dear Parent/Guardian")
- Clearly state the student's current attendance standing
- Mention that the SGA team is reaching out regarding session attendance
- Suggest 1 or 2 constructive next steps
- Keep the message between 3 to 5 sentences
- Do not use bullet points or markdown
- End with a short professional sign-off from the Student Guidance & Attendance Team
  `.trim();
}

function buildFallbackMessage(student) {
  return `Dear Parent/Guardian, we are reaching out from the SGA team regarding ${student.name}'s attendance. Their current attendance stands at ${student.attendancePercentage}% (${student.attendedClasses} of ${student.totalClasses} classes), which places them in the ${getRiskLabel(student.riskLevel).toLowerCase()} category. We encourage you to connect with us so we can work together to support consistent attendance. Kind regards, Student Guidance & Attendance Team`;
}

function buildAbsenceAlertPrompt(student, slot) {
  return `
You are writing an official session-based attendance alert from the SGA team to a parent.

Context:
- Student name: ${student.name}
- Missed session slot: ${slot} AM
- Current attendance: ${student.attendancePercentage}% (${student.attendedClasses} of ${student.totalClasses} classes)
- Current risk level: ${getRiskLabel(student.riskLevel)}
- Reason: Attendance was not recorded during the ${slot} AM session window or the grace period that followed.

Requirements:
- Start with "Dear Parent/Guardian,"
- Mention the specific missed session slot (${slot} AM)
- State that attendance was not confirmed during the allowed time window and grace period
- Include the current attendance percentage
- Ask for timely attendance in future sessions
- End with "Regards, SGA Team"
- Keep it to 3 to 5 sentences, professional and clear
- Do not use markdown or bullet points
  `.trim();
}

function buildAbsenceAlertFallback(student, slot) {
  return `Dear Parent/Guardian,\n\nYour child ${student.name} was marked absent for the ${slot} AM session as attendance was not recorded within the allowed time. Despite a grace period for manual updates, attendance was not confirmed. Their current attendance is ${student.attendancePercentage}%. Please ensure timely attendance in future sessions.\n\nRegards,\nSGA Team`;
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
- Keep the response to 3 to 5 sentences.
- Start with "Dear Parent/Guardian,"
- End with "Regards, SGA Team"
- Do not use bullet points or markdown.
  `.trim();
}

function buildWeeklyReportFallback(student, weeklySummary) {
  if (!weeklySummary.hasSessions) {
    return `Dear Parent/Guardian,\n\nThis is a weekly attendance summary from the SGA team for ${student.name}. No attendance sessions were recorded in the current reporting window (${weeklySummary.periodLabel}), so a weekly attendance percentage could not be fully assessed. We recommend continuing to monitor attendance closely.\n\nRegards, SGA Team`;
  }

  return `Dear Parent/Guardian,\n\nThis is a weekly attendance update from the SGA team for ${student.name}. Your child recorded ${weeklySummary.presentCount} present sessions out of ${weeklySummary.totalSessions} total sessions this week, resulting in a weekly attendance of ${weeklySummary.attendancePercentage}%. This falls under the ${getRiskLabel(weeklySummary.riskLevel).toLowerCase()} category, and ${weeklySummary.missedSessions} session${weeklySummary.missedSessions === 1 ? "" : "s"} were missed. We recommend encouraging regular attendance in the coming week.\n\nRegards, SGA Team`;
}

export function detectIntent(query) {
  const normalizedQuery = query.trim().toLowerCase();

  // Greeting detection
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|greetings)\b/i.test(normalizedQuery)) {
    return "greeting";
  }

  // Irrelevant topic detection
  if (
    /\b(weather|joke|funny|cricket|movie|recipe|news|politics|game|song|music|capital of|who is the president|tell me a)\b/.test(
      normalizedQuery,
    )
  ) {
    return "irrelevant";
  }

  if (/\b(why|reason|cause|explain|explaining)\b/.test(normalizedQuery)) {
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
  if (intent === "greeting") {
    return `
INTENT TYPE: greeting
- The parent has greeted. Respond politely and warmly.
- Acknowledge them and ask how you can help regarding their child ${student.name}'s attendance or performance.
- Keep the reply to 1-2 sentences only.
    `.trim();
  }

  if (intent === "irrelevant") {
    return `
INTENT TYPE: irrelevant
- The parent has asked something unrelated to student attendance or performance.
- Respond with EXACTLY: "This assistant is only for student-related information. Please ask about your child's attendance or performance."
- Do NOT answer the irrelevant question.
- Do NOT add any other information.
    `.trim();
  }

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

function buildParentResponsePrompt(student, question, intent) {
  return `
You are a strict and helpful school attendance assistant AI.
You ONLY answer questions related to a specific student's attendance, performance, and academic status.

STUDENT DATA (SOURCE OF TRUTH):
Student Name: ${student.name}
Attendance Percentage: ${student.attendancePercentage}%
Classes Attended: ${student.attendedClasses} of ${student.totalClasses}
Risk Level: ${getRiskLabel(student.riskLevel)}

PARENT QUESTION:
${question}

${getIntentPromptInstructions(intent, student)}

STRICT RULES:
1. If the user greets (hello, hi, good morning), respond politely and ask how you can help regarding the student.
2. If the question is about the student, answer using the provided student data ONLY. Include the student name, attendance %, and risk level when relevant.
3. If the question asks for suggestions, give simple advice (improve attendance, regular participation, etc.).
4. If the question is irrelevant (weather, jokes, general topics, anything not about the student), respond with EXACTLY: "This assistant is only for student-related information. Please ask about your child's attendance or performance."
5. Do NOT make up data. Do NOT answer outside student context.
6. Do NOT use bullet points or markdown in the final answer.

RESPONSE STYLE:
- Formal and polite tone
- 2 to 5 sentences maximum
- Clear, structured, and helpful
- Mention the student name when relevant
- Give a suggestion if attendance is low
  `.trim();
}

function buildParentResponseFallback(student, question, intent) {
  // Handle greetings
  if (intent === "greeting") {
    return `Hello! Welcome to the student attendance assistant. How can I help you regarding ${student.name}'s attendance or academic status?`;
  }

  // Handle irrelevant queries
  if (intent === "irrelevant") {
    return "This assistant is only for student-related information. Please ask about your child's attendance or performance.";
  }

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

  if (asksForMissingDetails || intent === "why") {
    return `${detailsLine} I currently only have attendance-related information. ${suggestionLine}`;
  }

  return `${detailsLine} ${suggestionLine}`;
}

// --- API Layer ---

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
    headers: { "Content-Type": "application/json" },
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
            text: "You are a school attendance assistant for the SGA team. Use only the provided student data, stay supportive and professional, and never invent missing facts. Always respond in 3 to 5 complete sentences.",
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
  if (!isGeminiConfigured()) {
    throw new Error("Gemini is not configured. AI responses will use fallback templates.");
  }

  let responseData;

  if (GEMINI_PROXY_URL) {
    responseData = await requestThroughProxy(prompt, student, options.generationConfig);
  } else {
    responseData = await requestDirectly(prompt, options.generationConfig);
  }

  const message = extractMessage(responseData);

  if (!message) {
    throw new Error("Gemini returned an empty message.");
  }

  return message;
}

// --- Public API ---

export async function generateMessage(student) {
  const normalizedStudent = normalizeStudent(student);
  const prompt = buildPrompt(normalizedStudent);

  try {
    const message = await requestGemini(prompt, normalizedStudent, {
      generationConfig: {
        temperature: 0.4,
        topP: 0.85,
        maxOutputTokens: 320,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    return {
      message,
      isFallback: false,
      errorMessage: "",
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      message: buildFallbackMessage(normalizedStudent),
      isFallback: true,
      errorMessage: error.message || "Unable to generate the message.",
      generatedAt: new Date().toISOString(),
    };
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
        thinkingConfig: { thinkingBudget: 0 },
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
        thinkingConfig: { thinkingBudget: 0 },
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
        thinkingConfig: { thinkingBudget: 0 },
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
