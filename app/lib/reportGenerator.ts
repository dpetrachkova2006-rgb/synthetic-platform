export type ReportInput = {
  topic: string;
  question: string;

  distributionExplanation?: string;
  sourceMode?: string;
};

export type ReportRespondent = {
  id: number;
  name: string;
  age: number;
  city: string;
  gender: string;

  region?: string;
  segment?: string;

  education?: string;
  employment?: string;
  income?: string;
  familyStatus?: string;
  settlementType?: string;

  awareness?: string;
  confidence?: string;

  interests?: string[];
  values?: string[];

  opinion: string;
  answer?: string;
};

export type OpinionDistribution = {
  fullySupport: number;
  ratherSupport: number;
  neutral: number;
  ratherOppose: number;
  fullyOppose: number;
  difficultToAnswer: number;
  refuseToAnswer: number;
};

export type DemographicGroup = {
  name: string;
  count: number;
  percent: number;
};

export type AIReportQuote = {
  opinion: string;
  quote: string;
  respondentDescription: string;
};

export type AIReportInsight = {
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

  quotes: AIReportQuote[];

  insights: AIReportInsight[];

  methodology: {
    sampleDescription: string;
    generationMethod: string;
    analysisMethod: string;
    dataBasis: string;
  };

  limitations: string[];
};

export type AIReportMeta = {
  sampleSize: number;
  interviewsReceived: number;
  interviewsAnalyzed: number;
  generatedAt: string;
};

export type AIReportResponse = {
  report: AIResearchReport;
  meta: AIReportMeta;
};

/**
 * Старый тип отчёта временно оставляем,
 * чтобы существующая страница карты не сломалась
 * до её следующего обновления.
 */
export type ResearchReport = {
  summary: string;
  audience: string;

  positives: string[];
  negatives: string[];
  insights: string[];

  statistics: {
    positive: number;
    neutral: number;
    negative: number;
  };

  opinionDistribution: OpinionDistribution;

  demographics: {
    averageAge: number;
    cities: string[];
    segments: string[];

    gender: {
      male: number;
      female: number;
      other: number;
    };
  };
};

type OpinionCategory = keyof OpinionDistribution;

type DemographicsPayload = {
  gender: DemographicGroup[];
  age: DemographicGroup[];
  region: DemographicGroup[];
  city: DemographicGroup[];
  education: DemographicGroup[];
  employment: DemographicGroup[];
  income: DemographicGroup[];
  familyStatus: DemographicGroup[];
  settlementType: DemographicGroup[];
  awareness: DemographicGroup[];
};

type ReportInterview = {
  respondentId: number;
  name: string;
  age: number;
  gender: string;
  city: string;
  region: string;
  education: string;
  employment: string;
  income: string;
  familyStatus: string;
  settlementType: string;
  awareness: string;
  confidence: string;
  opinion: string;
  answer: string;
};

type GenerateReportPayload = {
  topic: string;
  question: string;
  sampleSize: number;

  opinionDistribution: OpinionDistribution;

  demographics: DemographicsPayload;

  interviews: ReportInterview[];

  distributionExplanation?: string;
  sourceMode?: string;
};

const MAX_INTERVIEWS_FOR_REPORT = 120;
const MAX_INTERVIEW_LENGTH = 1200;

function calculatePercent(
  value: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е");
}

function safeText(
  value: string | undefined,
  fallback = "Не указано"
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return fallback;
  }

  return value.trim();
}

function detectOpinionCategory(
  opinion: string
): OpinionCategory {
  const normalized = normalizeText(opinion);

  if (
    normalized.includes("полностью поддерживает") ||
    normalized.includes("полностью согласен") ||
    normalized.includes("полностью согласна")
  ) {
    return "fullySupport";
  }

  if (
    normalized.includes("скорее поддерживает") ||
    normalized.includes("скорее согласен") ||
    normalized.includes("скорее согласна")
  ) {
    return "ratherSupport";
  }

  if (
    normalized.includes("совершенно не поддерживает") ||
    normalized.includes("полностью не поддерживает") ||
    normalized.includes("категорически не поддерживает")
  ) {
    return "fullyOppose";
  }

  if (
    normalized.includes("скорее не поддерживает") ||
    normalized.includes("скорее не согласен") ||
    normalized.includes("скорее не согласна")
  ) {
    return "ratherOppose";
  }

  if (
    normalized.includes("затрудняется ответить") ||
    normalized.includes("затрудняюсь ответить") ||
    normalized.includes("не знает") ||
    normalized.includes("не определился") ||
    normalized.includes("не определилась")
  ) {
    return "difficultToAnswer";
  }

  if (
    normalized.includes("отказывается отвечать") ||
    normalized.includes("отказ от ответа") ||
    normalized.includes("не хочет отвечать")
  ) {
    return "refuseToAnswer";
  }

  return "neutral";
}

function normalizeGender(
  gender: string
): "male" | "female" | "other" {
  const normalized = normalizeText(gender);

  if (
    normalized === "мужчина" ||
    normalized === "мужской" ||
    normalized === "male" ||
    normalized === "м"
  ) {
    return "male";
  }

  if (
    normalized === "женщина" ||
    normalized === "женский" ||
    normalized === "female" ||
    normalized === "ж"
  ) {
    return "female";
  }

  return "other";
}

function getUniqueValues(
  values: Array<string | undefined>
): string[] {
  return [
    ...new Set(
      values
        .map((value) => value?.trim())
        .filter(
          (value): value is string =>
            Boolean(value)
        )
    ),
  ];
}

function getTopValues(
  values: Array<string | undefined>,
  limit: number
): string[] {
  const frequencies = new Map<string, number>();

  for (const rawValue of values) {
    const value = rawValue?.trim();

    if (!value) {
      continue;
    }

    frequencies.set(
      value,
      (frequencies.get(value) ?? 0) + 1
    );
  }

  return [...frequencies.entries()]
    .sort((first, second) => {
      return second[1] - first[1];
    })
    .slice(0, limit)
    .map(([value]) => value);
}

function getDominantOpinionText(
  distribution: OpinionDistribution
): string {
  const options: Array<{
    label: string;
    value: number;
  }> = [
    {
      label: "полная поддержка",
      value: distribution.fullySupport,
    },
    {
      label: "скорее поддержка",
      value: distribution.ratherSupport,
    },
    {
      label: "нейтральная позиция",
      value: distribution.neutral,
    },
    {
      label: "скорее неподдержка",
      value: distribution.ratherOppose,
    },
    {
      label: "полная неподдержка",
      value: distribution.fullyOppose,
    },
    {
      label: "затруднение с ответом",
      value: distribution.difficultToAnswer,
    },
    {
      label: "отказ от ответа",
      value: distribution.refuseToAnswer,
    },
  ];

  return options.sort(
    (first, second) =>
      second.value - first.value
  )[0]?.label ?? "нейтральная позиция";
}

function calculateOpinionDistribution(
  respondents: ReportRespondent[]
): {
  counts: Record<OpinionCategory, number>;
  distribution: OpinionDistribution;
} {
  const total = respondents.length;

  const counts: Record<OpinionCategory, number> = {
    fullySupport: 0,
    ratherSupport: 0,
    neutral: 0,
    ratherOppose: 0,
    fullyOppose: 0,
    difficultToAnswer: 0,
    refuseToAnswer: 0,
  };

  for (const respondent of respondents) {
    const category = detectOpinionCategory(
      respondent.opinion
    );

    counts[category] += 1;
  }

  return {
    counts,

    distribution: {
      fullySupport: calculatePercent(
        counts.fullySupport,
        total
      ),

      ratherSupport: calculatePercent(
        counts.ratherSupport,
        total
      ),

      neutral: calculatePercent(
        counts.neutral,
        total
      ),

      ratherOppose: calculatePercent(
        counts.ratherOppose,
        total
      ),

      fullyOppose: calculatePercent(
        counts.fullyOppose,
        total
      ),

      difficultToAnswer: calculatePercent(
        counts.difficultToAnswer,
        total
      ),

      refuseToAnswer: calculatePercent(
        counts.refuseToAnswer,
        total
      ),
    },
  };
}

function buildGroups(
  values: string[],
  total: number
): DemographicGroup[] {
  const frequencies = new Map<string, number>();

  for (const rawValue of values) {
    const value = safeText(rawValue);

    frequencies.set(
      value,
      (frequencies.get(value) ?? 0) + 1
    );
  }

  return [...frequencies.entries()]
    .map(([name, count]) => ({
      name,
      count,
      percent: calculatePercent(count, total),
    }))
    .sort((first, second) => {
      return second.count - first.count;
    });
}

function getAgeGroup(age: number): string {
  if (!Number.isFinite(age) || age <= 0) {
    return "Возраст не указан";
  }

  if (age <= 24) {
    return "18–24 года";
  }

  if (age <= 34) {
    return "25–34 года";
  }

  if (age <= 44) {
    return "35–44 года";
  }

  if (age <= 54) {
    return "45–54 года";
  }

  if (age <= 64) {
    return "55–64 года";
  }

  return "65 лет и старше";
}

function buildDemographics(
  respondents: ReportRespondent[]
): DemographicsPayload {
  const total = respondents.length;

  return {
    gender: buildGroups(
      respondents.map((respondent) => {
        const category = normalizeGender(
          respondent.gender
        );

        if (category === "male") {
          return "Мужчины";
        }

        if (category === "female") {
          return "Женщины";
        }

        return "Другое или не указано";
      }),
      total
    ),

    age: buildGroups(
      respondents.map((respondent) => {
        return getAgeGroup(respondent.age);
      }),
      total
    ),

    region: buildGroups(
      respondents.map((respondent) => {
        return safeText(
          respondent.region,
          "Регион не указан"
        );
      }),
      total
    ),

    city: buildGroups(
      respondents.map((respondent) => {
        return safeText(
          respondent.city,
          "Город не указан"
        );
      }),
      total
    ),

    education: buildGroups(
      respondents.map((respondent) => {
        return safeText(respondent.education);
      }),
      total
    ),

    employment: buildGroups(
      respondents.map((respondent) => {
        return safeText(respondent.employment);
      }),
      total
    ),

    income: buildGroups(
      respondents.map((respondent) => {
        return safeText(respondent.income);
      }),
      total
    ),

    familyStatus: buildGroups(
      respondents.map((respondent) => {
        return safeText(respondent.familyStatus);
      }),
      total
    ),

    settlementType: buildGroups(
      respondents.map((respondent) => {
        return safeText(
          respondent.settlementType
        );
      }),
      total
    ),

    awareness: buildGroups(
      respondents.map((respondent) => {
        return safeText(respondent.awareness);
      }),
      total
    ),
  };
}

function convertToReportInterview(
  respondent: ReportRespondent
): ReportInterview | null {
  const answer =
    typeof respondent.answer === "string"
      ? respondent.answer.trim()
      : "";

  if (!answer) {
    return null;
  }

  return {
    respondentId: respondent.id,
    name: safeText(
      respondent.name,
      "Синтетический респондент"
    ),
    age: respondent.age,
    gender: safeText(respondent.gender),
    city: safeText(
      respondent.city,
      "Город не указан"
    ),
    region: safeText(
      respondent.region,
      "Регион не указан"
    ),
    education: safeText(
      respondent.education
    ),
    employment: safeText(
      respondent.employment
    ),
    income: safeText(respondent.income),
    familyStatus: safeText(
      respondent.familyStatus
    ),
    settlementType: safeText(
      respondent.settlementType
    ),
    awareness: safeText(
      respondent.awareness
    ),
    confidence: safeText(
      respondent.confidence
    ),
    opinion: safeText(
      respondent.opinion,
      "Нейтральная позиция"
    ),
    answer: answer.slice(
      0,
      MAX_INTERVIEW_LENGTH
    ),
  };
}

function selectBalancedInterviews(
  respondents: ReportRespondent[]
): ReportInterview[] {
  const groups = new Map<
    OpinionCategory,
    ReportInterview[]
  >();

  for (const respondent of respondents) {
    const interview =
      convertToReportInterview(respondent);

    if (!interview) {
      continue;
    }

    const category = detectOpinionCategory(
      respondent.opinion
    );

    const group = groups.get(category) ?? [];

    group.push(interview);
    groups.set(category, group);
  }

  const nonEmptyGroups = [...groups.values()].filter(
    (group) => group.length > 0
  );

  if (nonEmptyGroups.length === 0) {
    return [];
  }

  const perGroup = Math.max(
    1,
    Math.floor(
      MAX_INTERVIEWS_FOR_REPORT /
        nonEmptyGroups.length
    )
  );

  const selected: ReportInterview[] = [];

  for (const group of nonEmptyGroups) {
    selected.push(...group.slice(0, perGroup));
  }

  if (
    selected.length <
    MAX_INTERVIEWS_FOR_REPORT
  ) {
    const selectedIds = new Set(
      selected.map(
        (interview) =>
          interview.respondentId
      )
    );

    const remaining = nonEmptyGroups
      .flat()
      .filter((interview) => {
        return !selectedIds.has(
          interview.respondentId
        );
      });

    selected.push(
      ...remaining.slice(
        0,
        MAX_INTERVIEWS_FOR_REPORT -
          selected.length
      )
    );
  }

  return selected.slice(
    0,
    MAX_INTERVIEWS_FOR_REPORT
  );
}

export function prepareAIReportPayload(
  input: ReportInput,
  respondents: ReportRespondent[]
): GenerateReportPayload {
  const { distribution } =
    calculateOpinionDistribution(respondents);

  return {
    topic: input.topic,
    question: input.question,
    sampleSize: respondents.length,

    opinionDistribution: distribution,

    demographics:
      buildDemographics(respondents),

    interviews:
      selectBalancedInterviews(respondents),

    distributionExplanation:
      input.distributionExplanation,

    sourceMode: input.sourceMode,
  };
}

function isAIReportResponse(
  value: unknown
): value is AIReportResponse {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const record =
    value as Record<string, unknown>;

  return (
    typeof record.report === "object" &&
    record.report !== null &&
    typeof record.meta === "object" &&
    record.meta !== null
  );
}

export async function generateAIResearchReport(
  input: ReportInput,
  respondents: ReportRespondent[]
): Promise<AIReportResponse> {
  if (!input.topic.trim()) {
    throw new Error(
      "Не указана тема исследования."
    );
  }

  if (!input.question.trim()) {
    throw new Error(
      "Не указан исследовательский вопрос."
    );
  }

  if (respondents.length === 0) {
    throw new Error(
      "Невозможно сформировать отчёт: выборка пуста."
    );
  }

  const payload = prepareAIReportPayload(
    input,
    respondents
  );

  const response = await fetch(
    "/api/generate-report",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data: unknown = await response.json();

  if (!response.ok) {
    let message =
      "Не удалось сформировать аналитический отчёт.";

    if (
      typeof data === "object" &&
      data !== null
    ) {
      const record =
        data as Record<string, unknown>;

      if (typeof record.error === "string") {
        message = record.error;
      }
    }

    throw new Error(message);
  }

  if (!isAIReportResponse(data)) {
    throw new Error(
      "Сервер вернул аналитический отчёт в неверном формате."
    );
  }

  return data;
}

/**
 * Временный локальный отчёт.
 *
 * Он нужен только для совместимости с текущей
 * страницей карты. После подключения AI-отчёта
 * эта функция больше не понадобится.
 */
export function generateResearchReport(
  input: ReportInput,
  respondents: ReportRespondent[]
): ResearchReport {
  const total = respondents.length;

  const {
    counts: opinionCounts,
    distribution: opinionDistribution,
  } = calculateOpinionDistribution(
    respondents
  );

  const positiveCount =
    opinionCounts.fullySupport +
    opinionCounts.ratherSupport;

  const negativeCount =
    opinionCounts.ratherOppose +
    opinionCounts.fullyOppose;

  const neutralCount =
    opinionCounts.neutral +
    opinionCounts.difficultToAnswer +
    opinionCounts.refuseToAnswer;

  const positivePercent =
    calculatePercent(
      positiveCount,
      total
    );

  const negativePercent =
    calculatePercent(
      negativeCount,
      total
    );

  const neutralPercent =
    calculatePercent(
      neutralCount,
      total
    );

  const validAges = respondents
    .map((respondent) => respondent.age)
    .filter((age) => {
      return (
        Number.isFinite(age) &&
        age > 0
      );
    });

  const averageAge =
    validAges.length > 0
      ? Math.round(
          validAges.reduce(
            (sum, age) => sum + age,
            0
          ) / validAges.length
        )
      : 0;

  const cities = getTopValues(
    respondents.map(
      (respondent) => respondent.city
    ),
    5
  );

  const segments = getUniqueValues(
    respondents.map(
      (respondent) =>
        respondent.segment
    )
  );

  const genderCounts = {
    male: 0,
    female: 0,
    other: 0,
  };

  for (const respondent of respondents) {
    const genderCategory =
      normalizeGender(
        respondent.gender
      );

    genderCounts[genderCategory] += 1;
  }

  const genderDistribution = {
    male: calculatePercent(
      genderCounts.male,
      total
    ),

    female: calculatePercent(
      genderCounts.female,
      total
    ),

    other: calculatePercent(
      genderCounts.other,
      total
    ),
  };

  const dominantOpinion =
    getDominantOpinionText(
      opinionDistribution
    );

  const uncertaintyPercent =
    opinionDistribution.difficultToAnswer +
    opinionDistribution.refuseToAnswer;

  const citiesText =
    cities.length > 0
      ? cities.join(", ")
      : "данные не указаны";

  const segmentsText =
    segments.length > 0
      ? segments.join(", ")
      : "сегментация не применялась";

  const positives: string[] = [];

  if (positivePercent > 0) {
    positives.push(
      `${positivePercent}% респондентов демонстрируют положительное отношение к исследуемой теме.`
    );
  }

  if (
    opinionDistribution.fullySupport >
    0
  ) {
    positives.push(
      `${opinionDistribution.fullySupport}% выборки занимают позицию полной поддержки.`
    );
  }

  const negatives: string[] = [];

  if (negativePercent > 0) {
    negatives.push(
      `${negativePercent}% респондентов выражают критическое или отрицательное отношение.`
    );
  }

  if (
    opinionDistribution.fullyOppose >
    0
  ) {
    negatives.push(
      `${opinionDistribution.fullyOppose}% выборки занимают позицию полного неприятия.`
    );
  }

  if (uncertaintyPercent > 0) {
    negatives.push(
      `${uncertaintyPercent}% респондентов затруднились ответить или отказались от ответа.`
    );
  }

  const insights = [
    `Наиболее распространённая позиция в выборке — ${dominantOpinion}.`,

    `Совокупная доля поддержки составляет ${positivePercent}%, доля неподдержки — ${negativePercent}%.`,

    `Средний возраст синтетических респондентов составляет ${averageAge} лет.`,

    uncertaintyPercent >= 20
      ? "Значительная доля респондентов не имеет определённой позиции по исследовательскому вопросу."
      : "Большинство респондентов имеют сформированную позицию по исследовательскому вопросу.",
  ];

  return {
    summary: `Исследование по теме «${input.topic}» и вопросу «${input.question}» проведено на выборке из ${total} синтетических респондентов.

Положительное отношение демонстрируют ${positivePercent}% участников, нейтральную или неопределённую позицию — ${neutralPercent}%, отрицательное отношение — ${negativePercent}%.

Наиболее распространённой категорией ответа является «${dominantOpinion}». Проценты рассчитаны непосредственно по позициям сгенерированных респондентов.`,

    audience: `В исследовании участвовало ${total} синтетических респондентов.

Средний возраст участников — ${averageAge} лет.

Наиболее представленные города: ${citiesText}.

Сегменты аудитории: ${segmentsText}.

Гендерное распределение: мужчины — ${genderDistribution.male}%, женщины — ${genderDistribution.female}%, другие или неуказанные категории — ${genderDistribution.other}%.`,

    positives,
    negatives,
    insights,

    statistics: {
      positive: positivePercent,
      neutral: neutralPercent,
      negative: negativePercent,
    },

    opinionDistribution,

    demographics: {
      averageAge,
      cities,
      segments,
      gender: genderDistribution,
    },
  };
}