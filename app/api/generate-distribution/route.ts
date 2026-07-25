import { NextResponse } from "next/server";

export const runtime = "nodejs";

type OpinionDistribution = {
  fullySupport: number;
  ratherSupport: number;
  neutral: number;
  ratherOppose: number;
  fullyOppose: number;
  difficultToAnswer: number;
  refuseToAnswer: number;
};

type DistributionResponse = {
  distribution: OpinionDistribution;
  explanation: string;
  sourceMode: "ai-estimate";
};

const FALLBACK_DISTRIBUTION: OpinionDistribution = {
  fullySupport: 14,
  ratherSupport: 25,
  neutral: 14,
  ratherOppose: 20,
  fullyOppose: 11,
  difficultToAnswer: 13,
  refuseToAnswer: 3,
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readNumber(
  value: unknown
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return Math.max(0, value);
}

function normalizeDistribution(
  value: unknown
): OpinionDistribution {
  if (!isRecord(value)) {
    return FALLBACK_DISTRIBUTION;
  }

  const rawValues = {
    fullySupport:
      readNumber(value.fullySupport) ?? 0,

    ratherSupport:
      readNumber(value.ratherSupport) ?? 0,

    neutral:
      readNumber(value.neutral) ?? 0,

    ratherOppose:
      readNumber(value.ratherOppose) ?? 0,

    fullyOppose:
      readNumber(value.fullyOppose) ?? 0,

    difficultToAnswer:
      readNumber(value.difficultToAnswer) ?? 0,

    refuseToAnswer:
      readNumber(value.refuseToAnswer) ?? 0,
  };

  const total = Object.values(
    rawValues
  ).reduce(
    (sum, current) => sum + current,
    0
  );

  if (total <= 0) {
    return FALLBACK_DISTRIBUTION;
  }

  const normalizedEntries = Object.entries(
    rawValues
  ).map(([key, current]) => [
    key,
    (current / total) * 100,
  ]) as Array<
    [keyof OpinionDistribution, number]
  >;

  const rounded: OpinionDistribution = {
    fullySupport: 0,
    ratherSupport: 0,
    neutral: 0,
    ratherOppose: 0,
    fullyOppose: 0,
    difficultToAnswer: 0,
    refuseToAnswer: 0,
  };

  let roundedTotal = 0;

  for (
    let index = 0;
    index < normalizedEntries.length;
    index += 1
  ) {
    const [key, current] =
      normalizedEntries[index];

    if (
      index ===
      normalizedEntries.length - 1
    ) {
      rounded[key] = Math.max(
        0,
        100 - roundedTotal
      );

      continue;
    }

    const roundedValue =
      Math.round(current);

    rounded[key] = roundedValue;
    roundedTotal += roundedValue;
  }

  return rounded;
}

function parseModelResponse(
  content: string
): DistributionResponse {
  const cleanedContent = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed: unknown =
    JSON.parse(cleanedContent);

  if (!isRecord(parsed)) {
    throw new Error(
      "Модель вернула некорректный объект."
    );
  }

  const explanation =
    typeof parsed.explanation === "string"
      ? parsed.explanation.trim()
      : "";

  return {
    distribution:
      normalizeDistribution(
        parsed.distribution
      ),

    explanation:
      explanation ||
      "Распределение построено моделью на основе темы и формулировки исследовательского вопроса.",

    sourceMode: "ai-estimate",
  };
}

export async function POST(
  request: Request
) {
  try {
    const body: unknown =
      await request.json();

    if (!isRecord(body)) {
      return NextResponse.json(
        {
          error:
            "Некорректное тело запроса.",
        },
        {
          status: 400,
        }
      );
    }

    const topic =
      typeof body.topic === "string"
        ? body.topic.trim()
        : "";

    const question =
      typeof body.question === "string"
        ? body.question.trim()
        : "";

    if (!topic) {
      return NextResponse.json(
        {
          error:
            "Не указана тема исследования.",
        },
        {
          status: 400,
        }
      );
    }

    if (!question) {
      return NextResponse.json(
        {
          error:
            "Не указан исследовательский вопрос.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey =
      process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Переменная GROQ_API_KEY не найдена.",
        },
        {
          status: 500,
        }
      );
    }

    const prompt = `
Ты — аналитик общественного мнения и исследователь массовых установок.

Тебе нужно оценить вероятное распределение мнений среди взрослого населения России по заданной теме.

Тема исследования:
"${topic}"

Исследовательский вопрос:
"${question}"

Построй правдоподобное модельное распределение ответов.

Учитывай:
- неоднородность российского общества;
- различия по возрасту, доходу, образованию, месту проживания и уровню информированности;
- социально желательные ответы;
- долю людей, которые мало знают о теме;
- долю людей, затрудняющихся ответить;
- чувствительность темы;
- возможность отказа от ответа;
- политическую, экономическую, культурную или бытовую специфику вопроса.

Не утверждай, что это реальные результаты опроса.
Это должна быть аналитическая модельная оценка.

Верни только JSON без Markdown и без дополнительного текста:

{
  "distribution": {
    "fullySupport": число,
    "ratherSupport": число,
    "neutral": число,
    "ratherOppose": число,
    "fullyOppose": число,
    "difficultToAnswer": число,
    "refuseToAnswer": число
  },
  "explanation": "Краткое объяснение логики распределения в 2–4 предложениях"
}

Требования:
- все значения должны быть неотрицательными;
- сумма значений должна быть равна 100;
- используй целые числа;
- не добавляй других полей;
- не заключай JSON в блок кода.
`;

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model:
            "llama-3.3-70b-versatile",

          temperature: 0.35,

          max_completion_tokens: 900,

          response_format: {
            type: "json_object",
          },

          messages: [
            {
              role: "system",
              content:
                "Ты возвращаешь только валидный JSON. Не используй Markdown и не добавляй текст за пределами JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!groqResponse.ok) {
      const errorText =
        await groqResponse.text();

      console.error(
        "Ошибка Groq:",
        groqResponse.status,
        errorText
      );

      return NextResponse.json(
        {
          error:
            "Не удалось получить AI-распределение мнений.",

          distribution:
            FALLBACK_DISTRIBUTION,

          explanation:
            "Использовано резервное распределение, поскольку модель временно недоступна.",

          sourceMode: "fallback",
        },
        {
          status: 200,
        }
      );
    }

    const groqData: unknown =
      await groqResponse.json();

    if (!isRecord(groqData)) {
      throw new Error(
        "Groq вернул некорректный ответ."
      );
    }

    const choices =
      groqData.choices;

    if (
      !Array.isArray(choices) ||
      choices.length === 0 ||
      !isRecord(choices[0]) ||
      !isRecord(choices[0].message) ||
      typeof choices[0].message
        .content !== "string"
    ) {
      throw new Error(
        "В ответе Groq отсутствует содержимое."
      );
    }

    const result =
      parseModelResponse(
        choices[0].message.content
      );

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Ошибка generate-distribution:",
      error
    );

    return NextResponse.json(
      {
        distribution:
          FALLBACK_DISTRIBUTION,

        explanation:
          "Использовано резервное распределение из-за ошибки при обработке ответа модели.",

        sourceMode: "fallback",
      },
      {
        status: 200,
      }
    );
  }
}