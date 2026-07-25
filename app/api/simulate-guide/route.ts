import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SimulationRequest = {
  title?: unknown;
  topic?: unknown;
  audience?: unknown;
  goal?: unknown;
  guide?: unknown;
  respondentCount?: unknown;
  guideVersion?: unknown;
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

type RawRespondent = {
  name?: unknown;
  age?: unknown;
  city?: unknown;
  occupation?: unknown;
  description?: unknown;
};

type RawInterviewTurn = {
  question?: unknown;
  answer?: unknown;
};

type RawInterview = {
  respondentName?: unknown;
  turns?: unknown;
};

type RawFinding = {
  question?: unknown;
  finding?: unknown;
  recommendation?: unknown;
};

type RawSimulationResult = {
  verdict?: unknown;
  respondents?: unknown;
  interviews?: unknown;
  findings?: unknown;
  workingQuestions?: unknown;
  problematicQuestions?: unknown;
};

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_MODEL = "openai/gpt-oss-20b";
const REQUEST_TIMEOUT_MS = 90_000;
const MAX_GUIDE_LENGTH = 16_000;

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function parseJsonContent(content: string): unknown {
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      return JSON.parse(
        cleaned.slice(firstBrace, lastBrace + 1)
      );
    } catch {
      return null;
    }
  }
}

function normalizeStringArray(
  value: unknown,
  maxItems: number
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string"
    )
    .map((item) => item.trim().slice(0, 1_000))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeSimulation(
  value: unknown,
  respondentCount: number
) {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const raw = value as RawSimulationResult;

  if (!Array.isArray(raw.respondents)) {
    return null;
  }

  const respondents = raw.respondents
    .map((item, index) => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        return null;
      }

      const respondent = item as RawRespondent;

      const name = cleanText(respondent.name, 100);
      const city = cleanText(respondent.city, 120);
      const occupation = cleanText(
        respondent.occupation,
        180
      );
      const description = cleanText(
        respondent.description,
        700
      );

      const age =
        typeof respondent.age === "number"
          ? Math.round(respondent.age)
          : Number(respondent.age);

      if (
        !name ||
        !city ||
        !occupation ||
        !Number.isFinite(age) ||
        age < 14 ||
        age > 100
      ) {
        return null;
      }

      return {
        id: index + 1,
        name,
        age,
        city,
        occupation,
        description,
      };
    })
    .filter(
      (
        respondent
      ): respondent is NonNullable<
        typeof respondent
      > => Boolean(respondent)
    )
    .slice(0, respondentCount);

  if (respondents.length === 0) {
    return null;
  }

  const respondentByName = new Map(
    respondents.map((respondent) => [
      respondent.name.toLowerCase(),
      respondent,
    ])
  );

  const interviews = Array.isArray(raw.interviews)
    ? raw.interviews
        .map((item) => {
          if (
            typeof item !== "object" ||
            item === null
          ) {
            return null;
          }

          const interview = item as RawInterview;

          const respondentName = cleanText(
            interview.respondentName,
            100
          );

          const respondent = respondentByName.get(
            respondentName.toLowerCase()
          );

          if (
            !respondent ||
            !Array.isArray(interview.turns)
          ) {
            return null;
          }

          const turns = interview.turns
            .map((turn) => {
              if (
                typeof turn !== "object" ||
                turn === null
              ) {
                return null;
              }

              const rawTurn =
                turn as RawInterviewTurn;

              const question = cleanText(
                rawTurn.question,
                1_200
              );

              const answer = cleanText(
                rawTurn.answer,
                2_500
              );

              if (!question || !answer) {
                return null;
              }

              return {
                question,
                answer,
              };
            })
            .filter(
              (
                turn
              ): turn is NonNullable<
                typeof turn
              > => Boolean(turn)
            )
            .slice(0, 7);

          if (turns.length === 0) {
            return null;
          }

          return {
            respondent,
            turns,
          };
        })
        .filter(
          (
            interview
          ): interview is NonNullable<
            typeof interview
          > => Boolean(interview)
        )
    : [];

  const findings = Array.isArray(raw.findings)
    ? raw.findings
        .map((item) => {
          if (
            typeof item !== "object" ||
            item === null
          ) {
            return null;
          }

          const finding = item as RawFinding;

          const question = cleanText(
            finding.question,
            1_200
          );

          const findingText = cleanText(
            finding.finding,
            1_500
          );

          const recommendation = cleanText(
            finding.recommendation,
            1_500
          );

          if (
            !question ||
            !findingText ||
            !recommendation
          ) {
            return null;
          }

          return {
            question,
            finding: findingText,
            recommendation,
          };
        })
        .filter(
          (
            finding
          ): finding is NonNullable<
            typeof finding
          > => Boolean(finding)
        )
        .slice(0, 12)
    : [];

  const verdict = cleanText(
    raw.verdict,
    2_500
  );

  if (
    !verdict ||
    interviews.length === 0
  ) {
    return null;
  }

  return {
    verdict,
    respondents,
    interviews,
    findings,
    workingQuestions: normalizeStringArray(
      raw.workingQuestions,
      10
    ),
    problematicQuestions: normalizeStringArray(
      raw.problematicQuestions,
      10
    ),
  };
}

function buildPrompt(input: {
  title: string;
  topic: string;
  audience: string;
  goal: string;
  guide: string;
  respondentCount: number;
}) {
  return `
Ты проводишь предварительное тестирование гайда глубинного интервью на временной синтетической выборке.

ВАЖНО:
Это не реальное полевое исследование.
Нельзя делать статистические выводы или утверждать, что ответы отражают мнение всей целевой аудитории.
Цель симуляции — проверить, как могут работать вопросы гайда.

КОНТЕКСТ ИССЛЕДОВАНИЯ

Название:
${input.title || "Не указано"}

Тема:
${input.topic}

Целевая аудитория:
${input.audience}

Цель:
${input.goal}

Гайд:
${input.guide}

ЗАДАЧА

1. Определи не более 6 ключевых содержательных вопросов из гайда.

2. Создай ${input.respondentCount} разных синтетических респондентов, соответствующих указанной целевой аудитории.

Респонденты должны отличаться:
- возрастом;
- занятостью;
- жизненной ситуацией;
- опытом по теме исследования;
- отношением к исследуемому предмету;
- манерой речи.

Не создавай карикатурных персонажей.
Не делай всех респондентов одинаковыми.
Не делай ответы академическими.

3. Проведи отдельное короткое интервью с каждым респондентом.

Для каждого вопроса:
- используй формулировку из гайда;
- дай естественный ответ от первого лица;
- допускай сомнения, паузы, непонимание и неполные ответы;
- не пытайся обязательно дать исследователю идеальный материал;
- ответы разных респондентов должны действительно различаться.

4. Сравни полученные интервью и определи:
- какие вопросы дают содержательные ответы;
- какие вопросы непонятны;
- какие вызывают односложные ответы;
- какие понимаются респондентами по-разному;
- какие провоцируют социально желательные ответы;
- какие повторяют уже полученную информацию;
- где необходим уточняющий вопрос;
- где формулировка слишком сложная или абстрактная.

5. Сформулируй заключение без числовой оценки и без баллов.

ВЕРНИ ТОЛЬКО КОРРЕКТНЫЙ JSON СТРОГО ТАКОЙ СТРУКТУРЫ:

{
  "verdict": "краткое заключение о том, как гайд проявил себя в ходе синтетического пилотирования",
  "respondents": [
    {
      "name": "имя",
      "age": 25,
      "city": "город",
      "occupation": "занятость",
      "description": "краткий жизненный контекст и отношение к теме"
    }
  ],
  "interviews": [
    {
      "respondentName": "имя должно полностью совпадать с именем в respondents",
      "turns": [
        {
          "question": "вопрос из гайда",
          "answer": "естественный ответ респондента"
        }
      ]
    }
  ],
  "findings": [
    {
      "question": "вопрос из гайда",
      "finding": "что обнаружилось при сравнении ответов",
      "recommendation": "как изменить вопрос или какой probe добавить"
    }
  ],
  "workingQuestions": [
    "вопросы, которые дали содержательные и различающиеся ответы"
  ],
  "problematicQuestions": [
    "вопросы, которые стоит изменить"
  ]
}

Не используй markdown.
Не добавляй текст перед JSON или после JSON.
`.trim();
}

export async function POST(request: Request) {
  try {
    let body: SimulationRequest;

    try {
      body =
        (await request.json()) as SimulationRequest;
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

    const title = cleanText(body.title, 180);
    const topic = cleanText(body.topic, 500);
    const audience = cleanText(
      body.audience,
      500
    );
    const goal = cleanText(body.goal, 1_500);
    const guide = cleanText(
      body.guide,
      MAX_GUIDE_LENGTH
    );

    const respondentCount =
      body.respondentCount === 5 ? 5 : 3;

    if (
      !topic ||
      !audience ||
      !goal ||
      !guide
    ) {
      return NextResponse.json(
        {
          error:
            "Не переданы тема, аудитория, цель или текст гайда.",
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
        process.env.GROQ_SIMULATION_MODEL,
        150
      ) ||
      cleanText(
        process.env.GROQ_GUIDE_MODEL,
        150
      ) ||
      DEFAULT_MODEL;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    let groqResponse: Response;

    try {
      groqResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0.75,
          top_p: 0.9,
          max_completion_tokens:
            respondentCount === 5
              ? 4_500
              : 3_200,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content:
                "Ты профессиональный исследователь качественных методов. Ты моделируешь пилотные глубинные интервью и проверяешь работу гайда. Возвращай только корректный JSON.",
            },
            {
              role: "user",
              content: buildPrompt({
                title,
                topic,
                audience,
                goal,
                guide,
                respondentCount,
              }),
            },
          ],
        }),
      });
    } catch (requestError) {
      if (
        requestError instanceof Error &&
        requestError.name === "AbortError"
      ) {
        return NextResponse.json(
          {
            error:
              "Симуляция заняла слишком много времени. Попробуйте выбрать 3 респондентов.",
          },
          {
            status: 504,
          }
        );
      }

      throw requestError;
    } finally {
      clearTimeout(timeoutId);
    }

    const rawResponse =
      await groqResponse.text();

    let groqData: GroqResponse;

    try {
      groqData = JSON.parse(
        rawResponse
      ) as GroqResponse;
    } catch {
      console.error(
        "Groq вернул некорректный ответ:",
        rawResponse
      );

      return NextResponse.json(
        {
          error:
            "Groq вернул ответ в неожиданном формате.",
        },
        {
          status: 502,
        }
      );
    }

    if (!groqResponse.ok) {
      const groqError = cleanText(
        groqData.error?.message,
        1_500
      );

      console.error(
        "Ошибка Groq:",
        groqResponse.status,
        groqError
      );

      if (groqResponse.status === 429) {
        return NextResponse.json(
          {
            error:
              "Лимит Groq временно превышен. Попробуйте выбрать 3 респондентов или сократить гайд.",
          },
          {
            status: 429,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            groqError ||
            `Groq вернул ошибку ${groqResponse.status}.`,
        },
        {
          status: groqResponse.status,
        }
      );
    }

    const content =
      groqData.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        {
          error:
            "Модель не вернула результат симуляции.",
        },
        {
          status: 502,
        }
      );
    }

    const parsed = parseJsonContent(content);

    const result = normalizeSimulation(
      parsed,
      respondentCount
    );

    if (!result) {
      console.error(
        "Не удалось нормализовать симуляцию:",
        content
      );

      return NextResponse.json(
        {
          error:
            "Модель вернула неполную симуляцию. Повторите попытку с 3 респондентами.",
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json({
      result,
      meta: {
        model,
        respondentCount,
      },
    });
  } catch (error) {
    console.error(
      "Ошибка /api/simulate-guide:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Неизвестная ошибка симуляции интервью.",
      },
      {
        status: 500,
      }
    );
  }
}