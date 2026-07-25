import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GuideIssue = {
  question: string;
  problem: string;
  recommendation: string;
  severity: "низкая" | "средняя" | "высокая";
};

type GuideAnalysis = {
  status:
    | "Гайд готов к проведению"
    | "Требует небольшой доработки"
    | "Рекомендуется переработка";
  summary: string;
  strengths: string[];
  keyIssues: string[];
  questionAnalysis: GuideIssue[];
  missingTopics: string[];
  estimatedDuration: string;
};

type TestGuideRequest = {
  action?: unknown;
  title?: unknown;
  topic?: unknown;
  audience?: unknown;
  goal?: unknown;
  guide?: unknown;
  analysis?: unknown;
};

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GUIDE_MODEL = "llama-3.3-70b-versatile";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_GUIDE_LENGTH = 16_000;

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function removeCodeFence(value: string): string {
  return value
    .replace(/^```(?:json|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseModelJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = removeCodeFence(value);

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }
}

function cleanStringArray(value: unknown, limit = 10): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 500))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeAnalysis(value: unknown): GuideAnalysis | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const allowedStatuses = new Set([
    "Гайд готов к проведению",
    "Требует небольшой доработки",
    "Рекомендуется переработка",
  ]);

  const rawStatus = cleanText(record.status, 100);
  const status = allowedStatuses.has(rawStatus)
    ? (rawStatus as GuideAnalysis["status"])
    : "Требует небольшой доработки";

  const summary = cleanText(record.summary, 1800);
  const estimatedDuration =
    cleanText(record.estimatedDuration, 120) || "не определена";

  const questionAnalysis = Array.isArray(record.questionAnalysis)
    ? record.questionAnalysis
        .map((item) => {
          if (typeof item !== "object" || item === null) {
            return null;
          }

          const questionRecord = item as Record<string, unknown>;
          const question = cleanText(questionRecord.question, 900);
          const problem = cleanText(questionRecord.problem, 1000);
          const recommendation = cleanText(
            questionRecord.recommendation,
            1200
          );
          const rawSeverity = cleanText(questionRecord.severity, 30);
          const severity =
            rawSeverity === "низкая" ||
            rawSeverity === "средняя" ||
            rawSeverity === "высокая"
              ? rawSeverity
              : "средняя";

          if (!question || !problem || !recommendation) {
            return null;
          }

          return {
            question,
            problem,
            recommendation,
            severity,
          };
        })
        .filter((item): item is GuideIssue => item !== null)
        .slice(0, 18)
    : [];

  if (!summary) {
    return null;
  }

  return {
    status,
    summary,
    strengths: cleanStringArray(record.strengths, 8),
    keyIssues: cleanStringArray(record.keyIssues, 10),
    questionAnalysis,
    missingTopics: cleanStringArray(record.missingTopics, 8),
    estimatedDuration,
  };
}

function normalizeAnalysisFromRequest(value: unknown): GuideAnalysis | null {
  return normalizeAnalysis(value);
}

function buildAnalysisPrompt(input: {
  title: string;
  topic: string;
  audience: string;
  goal: string;
  guide: string;
}): string {
  return `
Ты — методолог качественных исследований.

Протестируй гайд глубинного интервью перед реальным полем.

Контекст:
Название: ${input.title || "не указано"}
Тема: ${input.topic}
Аудитория: ${input.audience}
Цель: ${input.goal}

Гайд:
${input.guide}

Проверь:
- соответствие цели и аудитории;
- понятность и нейтральность;
- двойные, наводящие и повторяющиеся вопросы;
- риск односложных и социально желательных ответов;
- логику блоков и переходов;
- недостающие темы и уточнения;
- примерную длительность.

Не переписывай весь гайд.
Не утверждай, что опрашивал реальных респондентов.
Комментируй только действительно проблемные вопросы.

Верни только JSON:
{
  "status": "Гайд готов к проведению" | "Требует небольшой доработки" | "Рекомендуется переработка",
  "summary": "краткий вывод",
  "strengths": ["сильная сторона"],
  "keyIssues": ["ключевая проблема"],
  "questionAnalysis": [
    {
      "question": "исходный вопрос",
      "problem": "проблема",
      "recommendation": "исправление или probe",
      "severity": "низкая" | "средняя" | "высокая"
    }
  ],
  "missingTopics": ["чего не хватает"],
  "estimatedDuration": "45–60 минут"
}
`.trim();
}

function buildImprovePrompt(input: {
  title: string;
  topic: string;
  audience: string;
  goal: string;
  guide: string;
  analysis: GuideAnalysis;
}): string {
  const compactAnalysis = JSON.stringify({
    status: input.analysis.status,
    keyIssues: input.analysis.keyIssues,
    questionAnalysis: input.analysis.questionAnalysis,
    missingTopics: input.analysis.missingTopics,
  });

  return `
Ты — методолог качественных исследований.

Перепиши гайд глубинного интервью с учётом анализа ниже.

Контекст:
Название: ${input.title || "не указано"}
Тема: ${input.topic}
Аудитория: ${input.audience}
Цель: ${input.goal}

Исходный гайд:
${input.guide}

Результаты тестирования:
${compactAnalysis}

Требования:
- сохрани исследовательскую цель и полезные исходные вопросы;
- исправь наводящие, двойные, абстрактные и повторяющиеся вопросы;
- выстрой логичные блоки и переходы;
- добавь probes только там, где они нужны;
- сделай документ пригодным для реального интервью;
- не добавляй отчёт, пояснения и комментарии к правкам;
- верни только полный улучшенный гайд обычным текстом.
`.trim();
}

async function callGroq(input: {
  apiKey: string;
  model: string;
  prompt: string;
  maxCompletionTokens: number;
  temperature: number;
  jsonMode: boolean;
}): Promise<{ content: string } | { error: string; status: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        model: input.model,
        temperature: input.temperature,
        top_p: 0.9,
        max_completion_tokens: input.maxCompletionTokens,
        ...(input.jsonMode
          ? {
              response_format: {
                type: "json_object",
              },
            }
          : {}),
        messages: [
          {
            role: "system",
            content: input.jsonMode
              ? "Ты методолог качественных исследований. Возвращай только корректный JSON."
              : "Ты методолог качественных исследований. Возвращай только готовый текст гайда.",
          },
          {
            role: "user",
            content: input.prompt,
          },
        ],
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        error: "Модель не успела обработать гайд. Повторите попытку.",
        status: 504,
      };
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const rawText = await response.text();

  let data: GroqResponse;

  try {
    data = JSON.parse(rawText) as GroqResponse;
  } catch {
    console.error("Groq вернул не-JSON ответ:", response.status, rawText);

    return {
      error: "Groq вернул ответ в неожиданном формате.",
      status: 502,
    };
  }

  if (!response.ok) {
    const message =
      cleanText(data.error?.message, 1000) ||
      `Groq вернул ошибку ${response.status}.`;

    console.error("Ошибка Groq API:", response.status, data);

    return {
      error:
        response.status === 429
          ? "Лимит Groq временно превышен. Подождите немного или сократите гайд."
          : message,
      status: response.status,
    };
  }

  const content = cleanText(data.choices?.[0]?.message?.content, 40_000);

  if (!content) {
    return {
      error: "Модель вернула пустой ответ.",
      status: 502,
    };
  }

  return { content };
}

export async function POST(request: Request) {
  try {
    let body: TestGuideRequest;

    try {
      body = (await request.json()) as TestGuideRequest;
    } catch {
      return NextResponse.json(
        { error: "Тело запроса должно содержать корректный JSON." },
        { status: 400 }
      );
    }

    const action = cleanText(body.action, 30);
    const title = cleanText(body.title, 180);
    const topic = cleanText(body.topic, 500);
    const audience = cleanText(body.audience, 500);
    const goal = cleanText(body.goal, 1500);
    const guide = cleanText(body.guide, MAX_GUIDE_LENGTH);

    if (
      (action !== "analyze" && action !== "improve") ||
      !topic ||
      !audience ||
      !goal ||
      !guide
    ) {
      return NextResponse.json(
        {
          error:
            "Не переданы корректные данные для тестирования гайда.",
        },
        { status: 400 }
      );
    }

    if (guide.length < 80) {
      return NextResponse.json(
        {
          error:
            "Текст гайда слишком короткий для содержательного тестирования.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Не найден GROQ_API_KEY. Проверь файл .env.local." },
        { status: 500 }
      );
    }

    // Важно: не используем общий GROQ_MODEL, чтобы случайно не взять
    // openai/gpt-oss-120b с более жёстким TPM-лимитом.
    const model =
      cleanText(process.env.GROQ_GUIDE_MODEL, 120) ||
      DEFAULT_GUIDE_MODEL;

    if (action === "analyze") {
      const groqResult = await callGroq({
        apiKey,
        model,
        prompt: buildAnalysisPrompt({
          title,
          topic,
          audience,
          goal,
          guide,
        }),
        maxCompletionTokens: 1600,
        temperature: 0.2,
        jsonMode: true,
      });

      if ("error" in groqResult) {
        return NextResponse.json(
          { error: groqResult.error },
          { status: groqResult.status }
        );
      }

      const parsed = parseModelJson(groqResult.content);
      const result = normalizeAnalysis(parsed);

      if (!result) {
        return NextResponse.json(
          {
            error:
              "Модель вернула неполный результат тестирования. Повторите попытку.",
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        result,
        meta: { model },
      });
    }

    const analysis = normalizeAnalysisFromRequest(body.analysis);

    if (!analysis) {
      return NextResponse.json(
        {
          error:
            "Не переданы результаты первого этапа тестирования.",
        },
        { status: 400 }
      );
    }

    const groqResult = await callGroq({
      apiKey,
      model,
      prompt: buildImprovePrompt({
        title,
        topic,
        audience,
        goal,
        guide,
        analysis,
      }),
      maxCompletionTokens: 2800,
      temperature: 0.35,
      jsonMode: false,
    });

    if ("error" in groqResult) {
      return NextResponse.json(
        { error: groqResult.error },
        { status: groqResult.status }
      );
    }

    const improvedGuide = removeCodeFence(groqResult.content).slice(0, 30_000);

    if (!improvedGuide) {
      return NextResponse.json(
        {
          error:
            "Модель не сформировала улучшенный вариант гайда.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      improvedGuide,
      meta: { model },
    });
  } catch (error) {
    console.error("Ошибка /api/test-guide:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Неизвестная ошибка тестирования гайда.",
      },
      { status: 500 }
    );
  }
}