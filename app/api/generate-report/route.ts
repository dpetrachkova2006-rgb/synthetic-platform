import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const MAX_INTERVIEWS = 120;
const MAX_ANSWER_LENGTH = 1200;
const REQUEST_TIMEOUT_MS = 60_000;

const OPINION_KEYS = [
  "fullySupport",
  "ratherSupport",
  "neutral",
  "ratherOppose",
  "fullyOppose",
  "difficultToAnswer",
  "refuseToAnswer",
] as const;

type OpinionKey = (typeof OPINION_KEYS)[number];

type OpinionDistribution = Record<OpinionKey, number>;

type DemographicGroup = {
  name: string;
  count: number;
  percent: number;
};

type Demographics = Partial<
  Record<
    | "gender"
    | "age"
    | "region"
    | "city"
    | "education"
    | "employment"
    | "income"
    | "familyStatus"
    | "settlementType"
    | "awareness",
    DemographicGroup[]
  >
>;

type ReportInterview = {
  respondentId?: number;
  name?: string;
  age?: number;
  gender?: string;
  city?: string;
  region?: string;
  education?: string;
  employment?: string;
  income?: string;
  familyStatus?: string;
  settlementType?: string;
  awareness?: string;
  confidence?: string;
  opinion?: string;
  answer?: string;
};

type GenerateReportRequest = {
  topic: string;
  question: string;
  sampleSize: number;
  opinionDistribution: OpinionDistribution;
  demographics?: Demographics;
  interviews?: ReportInterview[];
  distributionExplanation?: string;
  sourceMode?: string;
};

type ReportQuote = {
  opinion: string;
  quote: string;
  respondentDescription: string;
};

type ReportInsight = {
  title: string;
  description: string;
  confidence: "высокая" | "средняя" | "низкая";
  basis: string;
};

export type AIResearchReport = {
  title: string;
  briefConclusions: string[];
  distributionAnalysis: string;
  demographicAnalysis: string[];
  supportArguments: string[];
  opposeArguments: string[];
  neutralArguments: string[];
  quotes: ReportQuote[];
  insights: ReportInsight[];
  analyticalOverview: string;
  unexpectedFindings: string[];
  contradictions: string[];
  researchHypotheses: string[];
  furtherResearch: string[];
  methodology: {
    sampleDescription: string;
    generationMethod: string;
    analysisMethod: string;
    dataBasis: string;
  };
  limitations: string[];
};

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function cleanText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function clampNumber(value: unknown, min: number, max: number): number {
  return Math.min(max, Math.max(min, cleanNumber(value)));
}

function normalizeOpinionDistribution(
  value: unknown
): OpinionDistribution | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const normalized = {} as OpinionDistribution;

  for (const key of OPINION_KEYS) {
    normalized[key] = Number(
      clampNumber(record[key], 0, 100).toFixed(2)
    );
  }

  const total = OPINION_KEYS.reduce(
    (sum, key) => sum + normalized[key],
    0
  );

  if (total <= 0) {
    return null;
  }

  return normalized;
}

function normalizeDemographicGroups(value: unknown): DemographicGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): DemographicGroup | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = cleanText(record.name);

      if (!name) {
        return null;
      }

      return {
        name,
        count: Math.max(0, Math.round(cleanNumber(record.count))),
        percent: Number(clampNumber(record.percent, 0, 100).toFixed(2)),
      };
    })
    .filter((item): item is DemographicGroup => item !== null);
}

function normalizeDemographics(value: unknown): Demographics {
  if (!value || typeof value !== "object") {
    return {};
  }

  const source = value as Record<string, unknown>;
  const result: Demographics = {};

  const keys: Array<keyof Demographics> = [
    "gender",
    "age",
    "region",
    "city",
    "education",
    "employment",
    "income",
    "familyStatus",
    "settlementType",
    "awareness",
  ];

  for (const key of keys) {
    const groups = normalizeDemographicGroups(source[key]);
    if (groups.length > 0) {
      result[key] = groups;
    }
  }

  return result;
}

function normalizeInterview(value: unknown): ReportInterview | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const answer = cleanText(record.answer).slice(0, MAX_ANSWER_LENGTH);

  if (!answer) {
    return null;
  }

  return {
    respondentId:
      typeof record.respondentId === "number" &&
      Number.isFinite(record.respondentId)
        ? record.respondentId
        : undefined,
    name: cleanText(record.name),
    age: Math.max(0, Math.round(cleanNumber(record.age))),
    gender: cleanText(record.gender),
    city: cleanText(record.city),
    region: cleanText(record.region),
    education: cleanText(record.education),
    employment: cleanText(record.employment),
    income: cleanText(record.income),
    familyStatus: cleanText(record.familyStatus),
    settlementType: cleanText(record.settlementType),
    awareness: cleanText(record.awareness),
    confidence: cleanText(record.confidence),
    opinion: cleanText(record.opinion) || "позиция не указана",
    answer,
  };
}

function selectBalancedInterviews(value: unknown): ReportInterview[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const cleaned = value
    .map(normalizeInterview)
    .filter((item): item is ReportInterview => item !== null);

  if (cleaned.length <= MAX_INTERVIEWS) {
    return cleaned;
  }

  const groups = new Map<string, ReportInterview[]>();

  for (const interview of cleaned) {
    const opinion = cleanText(interview.opinion) || "позиция не указана";
    const group = groups.get(opinion) ?? [];
    group.push(interview);
    groups.set(opinion, group);
  }

  const queues = Array.from(groups.values());
  const selected: ReportInterview[] = [];
  let round = 0;

  while (selected.length < MAX_INTERVIEWS) {
    let added = false;

    for (const queue of queues) {
      const interview = queue[round];

      if (interview) {
        selected.push(interview);
        added = true;

        if (selected.length === MAX_INTERVIEWS) {
          break;
        }
      }
    }

    if (!added) {
      break;
    }

    round += 1;
  }

  return selected;
}

function normalizeStringArray(
  value: unknown,
  fallback: string[] = [],
  maxItems = 12
): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const result = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);

  return result.length > 0 ? result : fallback;
}

function normalizeQuotes(value: unknown): ReportQuote[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): ReportQuote | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const quote = cleanText(record.quote);

      if (!quote) {
        return null;
      }

      return {
        opinion: cleanText(record.opinion) || "Позиция не указана",
        quote,
        respondentDescription:
          cleanText(record.respondentDescription) ||
          "Синтетический респондент",
      };
    })
    .filter((item): item is ReportQuote => item !== null)
    .slice(0, 12);
}

function normalizeConfidence(
  value: unknown
): ReportInsight["confidence"] {
  return value === "высокая" || value === "низкая"
    ? value
    : "средняя";
}

function normalizeInsights(value: unknown): ReportInsight[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): ReportInsight | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title = cleanText(record.title);
      const description = cleanText(record.description);

      if (!title || !description) {
        return null;
      }

      return {
        title,
        description,
        confidence: normalizeConfidence(record.confidence),
        basis:
          cleanText(record.basis) ||
          "Вывод основан на представленных данных.",
      };
    })
    .filter((item): item is ReportInsight => item !== null)
    .slice(0, 10);
}

function normalizeMethodology(
  value: unknown,
  sampleSize: number,
  interviewsCount: number
): AIResearchReport["methodology"] {
  const fallback: AIResearchReport["methodology"] = {
    sampleDescription: `Анализ проведён на основе синтетической выборки объёмом ${sampleSize} респондентов.`,
    generationMethod:
      "Синтетическая популяция сформирована алгоритмически с учётом заданных параметров исследования и модельного распределения мнений.",
    analysisMethod: `Количественные показатели рассчитаны по всей синтетической выборке. Качественный анализ выполнен на основе ${interviewsCount} доступных интервью.`,
    dataBasis:
      "Отчёт основан на данных синтетической популяции и не является результатом реального полевого опроса.",
  };

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const record = value as Record<string, unknown>;

  return {
    sampleDescription:
      cleanText(record.sampleDescription) || fallback.sampleDescription,
    generationMethod:
      cleanText(record.generationMethod) || fallback.generationMethod,
    analysisMethod:
      cleanText(record.analysisMethod) || fallback.analysisMethod,
    dataBasis: cleanText(record.dataBasis) || fallback.dataBasis,
  };
}

function normalizeReport(
  value: unknown,
  sampleSize: number,
  interviewsCount: number
): AIResearchReport {
  if (!value || typeof value !== "object") {
    throw new Error("Модель вернула отчёт в неверном формате.");
  }

  const record = value as Record<string, unknown>;

  return {
    title: cleanText(record.title) || "Аналитический отчёт",
    briefConclusions: normalizeStringArray(
      record.briefConclusions,
      [
        "Полученные результаты требуют осторожной интерпретации, поскольку основаны на синтетической популяции.",
      ],
      6
    ),
    distributionAnalysis:
      cleanText(record.distributionAnalysis) ||
      "Распределение мнений представлено в количественной части отчёта.",
    demographicAnalysis: normalizeStringArray(
      record.demographicAnalysis,
      [
        "Недостаточно данных для содержательного социально-демографического анализа.",
      ]
    ),
    supportArguments: normalizeStringArray(record.supportArguments),
    opposeArguments: normalizeStringArray(record.opposeArguments),
    neutralArguments: normalizeStringArray(record.neutralArguments),
    quotes: normalizeQuotes(record.quotes),
    insights: normalizeInsights(record.insights),
    analyticalOverview:
      cleanText(record.analyticalOverview) ||
      cleanText(record.distributionAnalysis) ||
      "Недостаточно данных для расширенного аналитического обзора.",
    unexpectedFindings: normalizeStringArray(record.unexpectedFindings, [], 6),
    contradictions: normalizeStringArray(record.contradictions, [], 5),
    researchHypotheses: normalizeStringArray(record.researchHypotheses, [], 8),
    furtherResearch: normalizeStringArray(record.furtherResearch, [], 8),
    methodology: normalizeMethodology(
      record.methodology,
      sampleSize,
      interviewsCount
    ),
    limitations: normalizeStringArray(
      record.limitations,
      [
        "Результаты являются модельной оценкой и не заменяют реальное социологическое исследование.",
        "Содержание отчёта зависит от параметров генерации синтетической популяции и качества доступных интервью.",
      ],
      8
    ),
  };
}

function extractJson(content: string): unknown {
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Не удалось извлечь JSON из ответа модели.");
    }

    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }
}

function buildSystemPrompt(): string {
  return `
Ты — руководитель аналитического отдела исследовательской компании.

Подготовь профессиональный аналитический отчёт по результатам исследования общественного мнения.

Правила:
1. Используй исключительно переданные данные.
2. Не придумывай исследования, источники, организации, статистику, факты, аргументы или цитаты.
3. Не называй синтетическую выборку реальным репрезентативным опросом.
4. Используй только русские названия разделов.
5. Не добавляй рекомендации по воздействию на общественное мнение.
6. Отделяй наблюдения от интерпретаций.
7. Не заявляй причинно-следственные связи без достаточных оснований.
8. При недостатке данных прямо сообщай об этом.
9. Цитаты бери только дословно из переданных интервью.
10. Все числовые выводы должны соответствовать переданным данным.
11. В ограничениях укажи, что результаты являются аналитической симуляцией.
12. Не упоминай API, JSON, Groq, промпт или языковую модель.
13. Верни только корректный JSON без Markdown.

Структура JSON:
{
  "title": "Аналитический отчёт по теме исследования",
  "briefConclusions": ["Вывод"],
  "distributionAnalysis": "Анализ распределения мнений",
  "demographicAnalysis": ["Подтверждённое различие между группами"],
  "supportArguments": ["Аргумент сторонников"],
  "opposeArguments": ["Аргумент противников"],
  "neutralArguments": ["Основание нейтральной позиции"],
  "quotes": [
    {
      "opinion": "Позиция",
      "quote": "Дословная цитата",
      "respondentDescription": "Обезличенное описание"
    }
  ],
  "insights": [
    {
      "title": "Название инсайта",
      "description": "Описание закономерности",
      "confidence": "высокая",
      "basis": "Основание вывода"
    }
  ],
  "analyticalOverview": "Расширенный аналитический обзор",
  "unexpectedFindings": ["Неожиданное наблюдение"],
  "contradictions": ["Противоречие или неоднозначность"],
  "researchHypotheses": ["Проверяемая гипотеза"],
  "furtherResearch": ["Направление дальнейшего исследования"],
  "methodology": {
    "sampleDescription": "Описание выборки",
    "generationMethod": "Метод формирования популяции",
    "analysisMethod": "Метод анализа",
    "dataBasis": "Основа данных"
  },
  "limitations": ["Ограничение"]
}
  `.trim();
}

async function fetchGroqReport(
  apiKey: string,
  userPrompt: string
): Promise<GroqResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const rawText = await response.text();
    let data: GroqResponse = {};

    if (rawText) {
      try {
        data = JSON.parse(rawText) as GroqResponse;
      } catch {
        data = {};
      }
    }

    if (!response.ok) {
      console.error("Ошибка Groq:", response.status, rawText);

      const message = cleanText(data.error?.message);
      throw new Error(
        message ||
          `Не удалось сформировать аналитический отчёт. Код ответа: ${response.status}.`
      );
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Генерация отчёта заняла слишком много времени. Попробуйте ещё раз."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = cleanText(process.env.GROQ_API_KEY);

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Переменная GROQ_API_KEY не найдена в .env.local.",
        },
        { status: 500 }
      );
    }

    let body: Partial<GenerateReportRequest>;

    try {
      body = (await request.json()) as Partial<GenerateReportRequest>;
    } catch {
      return NextResponse.json(
        { error: "Не удалось прочитать данные запроса." },
        { status: 400 }
      );
    }

    const topic = cleanText(body.topic);
    const question = cleanText(body.question);
    const sampleSize = Math.max(0, Math.round(cleanNumber(body.sampleSize)));
    const opinionDistribution = normalizeOpinionDistribution(
      body.opinionDistribution
    );

    if (!topic) {
      return NextResponse.json(
        { error: "Не указана тема исследования." },
        { status: 400 }
      );
    }

    if (!question) {
      return NextResponse.json(
        { error: "Не указан исследовательский вопрос." },
        { status: 400 }
      );
    }

    if (sampleSize <= 0) {
      return NextResponse.json(
        { error: "Размер выборки должен быть больше нуля." },
        { status: 400 }
      );
    }

    if (!opinionDistribution) {
      return NextResponse.json(
        { error: "Не передано корректное распределение мнений." },
        { status: 400 }
      );
    }

    const interviewsReceived = Array.isArray(body.interviews)
      ? body.interviews.length
      : 0;
    const selectedInterviews = selectBalancedInterviews(body.interviews);

    const reportData = {
      topic,
      question,
      sampleSize,
      opinionDistribution,
      demographics: normalizeDemographics(body.demographics),
      interviews: selectedInterviews,
      interviewsAnalyzed: selectedInterviews.length,
      distributionExplanation: cleanText(body.distributionExplanation),
      sourceMode: cleanText(body.sourceMode),
    };

    const userPrompt = `
Подготовь аналитический отчёт по следующим данным:

${JSON.stringify(reportData, null, 2)}

Требования к содержанию:
- briefConclusions: 3–6 содержательных выводов.
- distributionAnalysis: минимум два содержательных абзаца.
- demographicAnalysis: только различия, подтверждённые данными.
- Аргументы и цитаты формируй только по интервью.
- Если интервью нет, верни пустые массивы аргументов и цитат.
- respondentDescription должно быть обезличенным.
- insights: до 10 наблюдаемых закономерностей, только если данных достаточно.
- analyticalOverview: самый содержательный раздел, 5–8 абзацев.
- unexpectedFindings: до 6 подтверждённых наблюдений или пустой массив.
- contradictions: до 5 подтверждённых неоднозначностей или пустой массив.
- researchHypotheses: 4–8 осторожных проверяемых гипотез.
- furtherResearch: 4–8 предложений только по дизайну следующего исследования.
- Не давай практических, политических или маркетинговых рекомендаций.
- Верни только JSON.
    `.trim();

    const groqData = await fetchGroqReport(apiKey, userPrompt);
    const content = groqData.choices?.[0]?.message?.content;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Модель вернула пустой аналитический отчёт." },
        { status: 502 }
      );
    }

    const report = normalizeReport(
      extractJson(content),
      sampleSize,
      selectedInterviews.length
    );

    return NextResponse.json({
      report,
      meta: {
        sampleSize,
        interviewsReceived,
        interviewsAnalyzed: selectedInterviews.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Ошибка в /api/generate-report:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Неизвестная ошибка при создании отчёта.",
      },
      { status: 500 }
    );
  }
}