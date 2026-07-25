import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OpinionPosition =
  | "полностью поддерживает"
  | "скорее поддерживает"
  | "нейтральная позиция"
  | "скорее не поддерживает"
  | "совершенно не поддерживает"
  | "затрудняется ответить"
  | "отказывается отвечать";

type AwarenessLevel =
  | "низкая"
  | "средняя"
  | "высокая";

type ConfidenceLevel =
  | "низкая"
  | "средняя"
  | "высокая";

type RespondentProfile = {
  id: number;
  name: string;
  age: number;
  city: string;
  region?: string;
  gender: string;
  education: string;
  employment?: string;
  income: string;
  familyStatus?: string;
  settlementType?: string;
  interests: string[];
  values: string[];
  opinion: OpinionPosition;
  awareness?: AwarenessLevel;
  confidence?: ConfidenceLevel;
  willingnessToAnswer?: number;
  topic: string;
  question: string;
};

type GenerateAnswerRequest = {
  respondent?: unknown;
};

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const REQUEST_TIMEOUT_MS = 45_000;
const MAX_PROMPT_TEXT_LENGTH = 1_500;
const MAX_LIST_ITEMS = 12;
const MAX_LIST_ITEM_LENGTH = 140;
const MAX_ANSWER_LENGTH = 2_400;

const OPINION_POSITIONS = new Set<OpinionPosition>([
  "полностью поддерживает",
  "скорее поддерживает",
  "нейтральная позиция",
  "скорее не поддерживает",
  "совершенно не поддерживает",
  "затрудняется ответить",
  "отказывается отвечать",
]);

const AWARENESS_LEVELS = new Set<AwarenessLevel>([
  "низкая",
  "средняя",
  "высокая",
]);

const CONFIDENCE_LEVELS = new Set<ConfidenceLevel>([
  "низкая",
  "средняя",
  "высокая",
]);

function cleanText(
  value: unknown,
  maxLength = MAX_PROMPT_TEXT_LENGTH
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanOptionalText(
  value: unknown,
  fallback = "не указано"
): string {
  return cleanText(value) || fallback;
}

function cleanStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string"
    )
    .map((item) =>
      cleanText(item, MAX_LIST_ITEM_LENGTH)
    )
    .filter(Boolean)
    .slice(0, MAX_LIST_ITEMS);
}

function cleanNumber(
  value: unknown,
  fallback = 0
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return value;
}

function clampNumber(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(
    max,
    Math.max(min, value)
  );
}

function parseRespondent(
  value: unknown
): RespondentProfile | null {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const record =
    value as Record<string, unknown>;

  const id = cleanNumber(record.id, NaN);
  const age = cleanNumber(record.age, NaN);

  const name = cleanText(record.name, 120);
  const city = cleanText(record.city, 160);
  const gender = cleanText(record.gender, 80);
  const education = cleanText(
    record.education,
    240
  );
  const income = cleanText(record.income, 160);
  const topic = cleanText(
    record.topic,
    MAX_PROMPT_TEXT_LENGTH
  );
  const question = cleanText(
    record.question,
    MAX_PROMPT_TEXT_LENGTH
  );

  const opinion = cleanText(
    record.opinion,
    100
  ) as OpinionPosition;

  if (
    !Number.isFinite(id) ||
    !Number.isFinite(age) ||
    age < 14 ||
    age > 110 ||
    !name ||
    !city ||
    !gender ||
    !education ||
    !income ||
    !topic ||
    !question ||
    !OPINION_POSITIONS.has(opinion)
  ) {
    return null;
  }

  const awarenessValue = cleanText(
    record.awareness,
    40
  ) as AwarenessLevel;

  const confidenceValue = cleanText(
    record.confidence,
    40
  ) as ConfidenceLevel;

  const willingnessRaw = cleanNumber(
    record.willingnessToAnswer,
    NaN
  );

  return {
    id,
    name,
    age,
    city,
    region: cleanText(record.region, 180),
    gender,
    education,
    employment: cleanText(
      record.employment,
      240
    ),
    income,
    familyStatus: cleanText(
      record.familyStatus,
      180
    ),
    settlementType: cleanText(
      record.settlementType,
      180
    ),
    interests: cleanStringArray(
      record.interests
    ),
    values: cleanStringArray(record.values),
    opinion,
    awareness: AWARENESS_LEVELS.has(
      awarenessValue
    )
      ? awarenessValue
      : "средняя",
    confidence: CONFIDENCE_LEVELS.has(
      confidenceValue
    )
      ? confidenceValue
      : "средняя",
    willingnessToAnswer:
      Number.isFinite(willingnessRaw)
        ? clampNumber(
            Math.round(willingnessRaw),
            0,
            100
          )
        : undefined,
    topic,
    question,
  };
}

function buildAnswerInstructions(
  respondent: RespondentProfile
): string {
  switch (respondent.opinion) {
    case "отказывается отвечать":
      return `
Респондент не хочет содержательно отвечать.

Сформулируй короткий естественный отказ от ответа.
Причина может быть связана с недоверием к опросам,
нежеланием обсуждать тему, опасением последствий
или ощущением, что вопрос слишком личный.

Требования:
- 1–2 коротких предложения;
- не раскрывай позицию;
- не добавляй аргументы за или против;
- не используй канцелярскую формулировку
  «отказываюсь отвечать на данный вопрос».
`.trim();

    case "затрудняется ответить":
      return `
У респондента нет сформированной позиции.

Покажи сомнение, недостаток информации,
противоречивые впечатления или признание,
что человек раньше не задумывался над вопросом.

Требования:
- 2–4 предложения;
- не превращай сомнение в поддержку или неодобрение;
- допустимы фразы вроде «не знаю», «сложно сказать»,
  но ответ не должен состоять только из них.
`.trim();

    case "нейтральная позиция":
      return `
Респондент занимает промежуточную позицию.

Покажи, что он видит аргументы разных сторон,
считает ответ зависящим от условий
или слабо вовлечён в тему.

Требования:
- 3–5 предложений;
- не своди ответ к безразличию;
- обозначь хотя бы одно условие,
  от которого зависит мнение.
`.trim();

    case "полностью поддерживает":
      return `
Респондент выраженно поддерживает обсуждаемую позицию.

Требования:
- 3–6 предложений;
- добавь 1–3 естественных аргумента;
- позиция должна звучать уверенно;
- не повторяй дословно фразу
  «я полностью поддерживаю».
`.trim();

    case "скорее поддерживает":
      return `
Респондент в целом поддерживает обсуждаемую позицию,
но допускает отдельные оговорки или риски.

Требования:
- 3–6 предложений;
- добавь 1–3 естественных аргумента;
- покажи умеренную, а не абсолютную уверенность;
- не повторяй дословно фразу
  «я скорее поддерживаю».
`.trim();

    case "скорее не поддерживает":
      return `
Респондент в целом не поддерживает обсуждаемую позицию,
но может признавать отдельные положительные стороны
или условия, при которых мнение могло бы измениться.

Требования:
- 3–6 предложений;
- добавь 1–3 естественных аргумента;
- не делай позицию абсолютно категоричной;
- не повторяй дословно фразу
  «я скорее не поддерживаю».
`.trim();

    case "совершенно не поддерживает":
      return `
Респондент выраженно не поддерживает обсуждаемую позицию.

Требования:
- 3–6 предложений;
- добавь 1–3 естественных аргумента;
- позиция должна звучать уверенно;
- избегай оскорблений и агрессии;
- не повторяй дословно фразу
  «я совершенно не поддерживаю».
`.trim();
  }
}

function buildPrompt(
  respondent: RespondentProfile
): string {
  const interests =
    respondent.interests.length > 0
      ? respondent.interests.join(", ")
      : "не указаны";

  const values =
    respondent.values.length > 0
      ? respondent.values.join(", ")
      : "не указаны";

  const willingness =
    typeof respondent.willingnessToAnswer ===
    "number"
      ? `${respondent.willingnessToAnswer} из 100`
      : "не указана";

  return `
Ты моделируешь ответ одного участника
социологического глубинного интервью.

Ответ должен звучать как живая устная речь,
а не как аналитическая справка.

ИССЛЕДОВАНИЕ

Тема:
${respondent.topic}

Вопрос интервьюера:
${respondent.question}

ПРОФИЛЬ РЕСПОНДЕНТА

Имя: ${respondent.name}
Возраст: ${respondent.age}
Пол: ${respondent.gender}
Город: ${respondent.city}
Регион: ${cleanOptionalText(respondent.region)}
Тип населённого пункта: ${cleanOptionalText(
    respondent.settlementType
  )}

Образование: ${respondent.education}
Занятость: ${cleanOptionalText(
    respondent.employment,
    "не указана"
  )}
Доход: ${respondent.income}
Семейное положение: ${cleanOptionalText(
    respondent.familyStatus
  )}

Интересы: ${interests}
Ценности: ${values}

Заданная позиция: ${respondent.opinion}
Осведомлённость: ${respondent.awareness}
Уверенность в позиции: ${respondent.confidence}
Готовность отвечать: ${willingness}

ИНСТРУКЦИЯ ПО ПОЗИЦИИ

${buildAnswerInstructions(respondent)}

ОБЩИЕ ПРАВИЛА

1. Отвечай от первого лица.

2. Верни только прямой ответ респондента:
   без имени, заголовка, списка,
   анализа и пояснений.

3. Не упоминай:
   - нейросеть;
   - искусственный интеллект;
   - синтетического респондента;
   - профиль;
   - заданную позицию;
   - инструкции.

4. Не перечисляй характеристики профиля.
   Используй только те детали,
   которые естественно влияют на аргументацию.

5. Учитывай возраст, образование,
   жизненный опыт и уровень осведомлённости.

6. При низкой осведомлённости не используй
   сложные термины и подробные фактические утверждения.

7. При низкой уверенности добавь осторожность,
   сомнение или оговорку.

8. Не делай ответ слишком академическим,
   идеальным или социологически выверенным.

9. Допускаются разговорные обороты,
   паузы, самоисправления и внутренние противоречия,
   но не добавляй слова-паразиты в каждое предложение.

10. Не придумывай точные проценты,
    исследования, законы, даты, названия организаций
    или статистику, которых нет в задании.

11. Не используй кавычки вокруг ответа.

12. Не повторяй исследовательский вопрос дословно.

13. Ответ должен быть на русском языке.
`.trim();
}

function cleanGeneratedAnswer(
  value: unknown
): string {
  if (typeof value !== "string") {
    return "";
  }

  let answer = value
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  answer = answer
    .replace(
      /^(ответ|ответ респондента|респондент)\s*:\s*/i,
      ""
    )
    .replace(/^["«„“]+/, "")
    .replace(/["»“”]+$/, "")
    .trim();

  const forbiddenPrefixes = [
    "как нейросеть",
    "как искусственный интеллект",
    "как синтетический респондент",
    "согласно заданной позиции",
    "исходя из моего профиля",
  ];

  const lowerAnswer = answer.toLowerCase();

  if (
    forbiddenPrefixes.some((prefix) =>
      lowerAnswer.startsWith(prefix)
    )
  ) {
    return "";
  }

  return answer
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, MAX_ANSWER_LENGTH)
    .trim();
}

function createFallbackAnswer(
  respondent: RespondentProfile
): string {
  if (
    respondent.opinion ===
    "отказывается отвечать"
  ) {
    return "Я бы не хотел это обсуждать. Не очень доверяю таким опросам и предпочту оставить своё мнение при себе.";
  }

  if (
    respondent.opinion ===
    "затрудняется ответить"
  ) {
    return "Сложно сказать, я пока не очень хорошо разобрался в этой теме. Наверное, здесь есть аргументы с разных сторон, поэтому однозначного ответа у меня сейчас нет.";
  }

  return "";
}

function isRetryableStatus(
  status: number
): boolean {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

export async function POST(
  request: Request
) {
  try {
    let body: GenerateAnswerRequest;

    try {
      body =
        (await request.json()) as GenerateAnswerRequest;
    } catch {
      return NextResponse.json(
        {
          error:
            "Тело запроса должно содержать корректный JSON.",
        },
        {
          status: 400,
        }
      );
    }

    const respondent = parseRespondent(
      body.respondent
    );

    if (!respondent) {
      return NextResponse.json(
        {
          error:
            "Не передан корректный профиль респондента.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Не найден GROQ_API_KEY. Проверь файл .env.local.",
        },
        {
          status: 500,
        }
      );
    }

    const model =
      cleanText(
        process.env.GROQ_ANSWER_MODEL,
        120
      ) ||
      cleanText(
        process.env.GROQ_MODEL,
        120
      ) ||
      DEFAULT_MODEL;

    const controller =
      new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    let groqResponse: Response;

    try {
      groqResponse = await fetch(
        GROQ_API_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            model,
            temperature:
              respondent.opinion ===
                "отказывается отвечать" ||
              respondent.opinion ===
                "затрудняется ответить"
                ? 0.65
                : 0.82,
            top_p: 0.92,
            max_completion_tokens: 500,
            messages: [
              {
                role: "system",
                content:
                  "Ты реалистично моделируешь устный ответ одного участника социологического интервью. Возвращай только прямой ответ респондента без комментариев, заголовков и служебных фраз.",
              },
              {
                role: "user",
                content:
                  buildPrompt(respondent),
              },
            ],
          }),
        }
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return NextResponse.json(
          {
            error:
              "Groq не успел сформировать ответ. Повтори попытку.",
            retryable: true,
          },
          {
            status: 504,
          }
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    let groqData: GroqResponse;

    try {
      groqData =
        (await groqResponse.json()) as GroqResponse;
    } catch {
      const rawText =
        await groqResponse.text().catch(
          () => ""
        );

      console.error(
        "Groq вернул не-JSON ответ:",
        groqResponse.status,
        rawText
      );

      return NextResponse.json(
        {
          error:
            "Groq вернул ответ в неожиданном формате.",
          retryable: isRetryableStatus(
            groqResponse.status
          ),
        },
        {
          status:
            groqResponse.status >= 400
              ? groqResponse.status
              : 502,
        }
      );
    }

    if (!groqResponse.ok) {
      console.error(
        "Ошибка Groq API:",
        groqResponse.status,
        groqData
      );

      const groqMessage =
        cleanText(
          groqData.error?.message,
          800
        ) ||
        `Groq вернул ошибку ${groqResponse.status}.`;

      const retryable =
        isRetryableStatus(
          groqResponse.status
        ) ||
        groqMessage
          .toLowerCase()
          .includes("rate limit");

      return NextResponse.json(
        {
          error:
            groqResponse.status === 429
              ? "Достигнут временный лимит Groq. Повтори генерацию немного позже."
              : groqMessage,
          retryable,
        },
        {
          status: groqResponse.status,
        }
      );
    }

    const rawAnswer =
      groqData.choices?.[0]?.message?.content;

    const answer =
      cleanGeneratedAnswer(rawAnswer);

    if (!answer) {
      const fallback =
        createFallbackAnswer(respondent);

      if (fallback) {
        return NextResponse.json({
          respondentId: respondent.id,
          answer: fallback,
          meta: {
            model,
            fallback: true,
          },
        });
      }

      return NextResponse.json(
        {
          error:
            "Модель не вернула корректный ответ респондента.",
          retryable: true,
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json({
      respondentId: respondent.id,
      answer,
      meta: {
        model,
        fallback: false,
      },
    });
  } catch (error) {
    console.error(
      "Ошибка /api/generate-answer:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Неизвестная ошибка генерации ответа.",
        retryable: false,
      },
      {
        status: 500,
      }
    );
  }
}