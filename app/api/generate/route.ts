import { NextResponse } from "next/server";
import { findRelevantResearch } from "../../lib/researchContext";

type GenerationSettings = {
  gender?: string;
  age?: string;
};

type GenerateRequestBody = {
  topic?: string;
  question?: string;
  count?: number;
  settings?: GenerationSettings;
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

type GeneratedRespondent = {
  id: number;
  name: string;
  age: number;
  city: string;
  gender: string;
  education: string;
  income: string;
  interests: string[];
  values: string[];
  opinion: string;
  answer: string;
};

function cleanJsonText(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function validateRespondents(
  value: unknown
): value is GeneratedRespondent[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((respondent) => {
    if (
      typeof respondent !== "object" ||
      respondent === null
    ) {
      return false;
    }

    const item = respondent as Record<string, unknown>;

    return (
      typeof item.id === "number" &&
      typeof item.name === "string" &&
      typeof item.age === "number" &&
      typeof item.city === "string" &&
      typeof item.gender === "string" &&
      typeof item.education === "string" &&
      typeof item.income === "string" &&
      Array.isArray(item.interests) &&
      item.interests.every(
        (interest) => typeof interest === "string"
      ) &&
      Array.isArray(item.values) &&
      item.values.every(
        (valueItem) => typeof valueItem === "string"
      ) &&
      typeof item.opinion === "string" &&
      typeof item.answer === "string"
    );
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateRequestBody;

    const topic = body.topic?.trim() || "";
    const question = body.question?.trim() || "";
    const count = Number(body.count);
    const settings = body.settings || {};

    const apiKey = process.env.GROQ_API_KEY;
    const model =
      process.env.GROQ_MODEL || "openai/gpt-oss-120b";

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Не найден GROQ_API_KEY. Проверь файл .env.local и перезапусти сервер.",
        },
        { status: 500 }
      );
    }

    if (!topic) {
      return NextResponse.json(
        { error: "Укажи тему исследования." },
        { status: 400 }
      );
    }

    if (!question) {
      return NextResponse.json(
        { error: "Укажи исследовательский вопрос." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > 50
    ) {
      return NextResponse.json(
        {
          error:
            "Количество респондентов должно быть целым числом от 1 до 50.",
        },
        { status: 400 }
      );
    }

    /*
     * Ищем релевантные исследования в нашей локальной базе.
     * Функция должна находиться в:
     * app/lib/researchContext.ts
     */
    const relevantResearch = findRelevantResearch(
      topic,
      question
    );

    const researchContext =
      relevantResearch.length > 0
        ? relevantResearch
            .map((research, index) => {
              const findings =
                research.findings.length > 0
                  ? research.findings
                      .map(
                        (finding) => `- ${finding}`
                      )
                      .join("\n")
                  : "- Основные результаты не указаны.";

              const demographicFindings =
                research.demographicFindings &&
                research.demographicFindings.length > 0
                  ? research.demographicFindings
                      .map(
                        (finding) => `- ${finding}`
                      )
                      .join("\n")
                  : "- Социально-демографические различия не указаны.";

              return `
ИСТОЧНИК ${index + 1}

Организация: ${research.organization}
Название исследования: ${research.title}
Дата: ${research.date}
Тема: ${research.topic}
Размер выборки: ${
                research.sampleSize || "не указан"
              }
Методология: ${
                research.methodology || "не указана"
              }
Ссылка: ${research.sourceUrl}

Основные результаты:
${findings}

Социально-демографические различия:
${demographicFindings}
`.trim();
            })
            .join("\n\n")
        : `
В локальной базе не найдено исследований, напрямую соответствующих теме.

В этом случае не придумывай статистические показатели, проценты,
распределения общественного мнения или ссылки на исследования.
Создавай только правдоподобные индивидуальные ответы.
`.trim();

    const prompt = `
Ты профессиональный социолог, специалист по общественному мнению,
опросным исследованиям и population simulation.

Твоя задача — создать ${count} реалистичных синтетических респондентов
для исследовательской симуляции.

ПАРАМЕТРЫ ИССЛЕДОВАНИЯ

Тема:
${topic}

Исследовательский вопрос:
${question}

Параметры выборки:
- Пол: ${settings.gender || "любой"}
- Возраст: ${settings.age || "любой совершеннолетний возраст"}

РЕАЛЬНЫЕ ИССЛЕДОВАТЕЛЬСКИЕ ДАННЫЕ

${researchContext}

ПРАВИЛА ИСПОЛЬЗОВАНИЯ ИССЛЕДОВАНИЙ

1. Используй приведённые исследования как контекст и ограничения
   для моделирования общественного мнения.

2. Не изменяй проценты, числовые значения, даты и размеры выборки,
   содержащиеся в исследовательском контексте.

3. Не придумывай новые статистические показатели.

4. Не утверждай, что конкретный синтетический респондент действительно
   участвовал в исследовании Russian Field, ФОМ или ВЦИОМ.

5. Не копируй формулировки результатов исследования дословно
   в каждый ответ.

6. Синтетические ответы должны быть разнообразными и правдоподобными,
   но в совокупности не должны явно противоречить приведённым данным.

7. Если разные источники показывают разные результаты,
   отрази разнообразие мнений, а не выбирай только один источник.

8. Учитывай, что агрегированные результаты исследования не позволяют
   точно восстановить мнение каждого отдельного человека.

ТРЕБОВАНИЯ К РЕСПОНДЕНТАМ

Для каждого респондента создай:

- id — последовательное число, начиная с 1;
- name — российское имя;
- age — возраст числом;
- city — реальный российский город или населённый пункт;
- gender — пол;
- education — уровень образования;
- income — примерный личный или семейный доход;
- interests — массив из 2–4 интересов;
- values — массив из 2–4 жизненных ценностей;
- opinion — краткая позиция по теме исследования;
- answer — естественный развёрнутый ответ на исследовательский вопрос.

Дополнительные требования:

- создай ровно ${count} респондентов;
- люди должны отличаться друг от друга;
- не повторяй имена слишком часто;
- не повторяй одинаковые биографии;
- ответы не должны быть одинаковыми;
- ответы должны состоять примерно из 3–6 предложений;
- стиль речи должен соответствовать возрасту, образованию,
  месту проживания и жизненному опыту;
- используй современный российский контекст;
- избегай карикатурных и чрезмерно стереотипных персонажей;
- не делай всех респондентов одинаково рациональными и информированными;
- допускай сомнения, противоречия, нейтральность и отсутствие интереса;
- соблюдай заданные пользователем ограничения по полу и возрасту.

ФОРМАТ ОТВЕТА

Верни только валидный JSON-объект.

Не используй Markdown.
Не добавляй пояснения до или после JSON.
Не используй блоки кода.

Формат:

{
  "respondents": [
    {
      "id": 1,
      "name": "Анна",
      "age": 23,
      "city": "Москва",
      "gender": "женщина",
      "education": "высшее",
      "income": "60–80 тыс. руб. в месяц",
      "interests": [
        "музыка",
        "технологии"
      ],
      "values": [
        "саморазвитие",
        "свобода"
      ],
      "opinion": "Краткое описание позиции",
      "answer": "Развёрнутый естественный ответ респондента."
    }
  ]
}
`.trim();

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.8,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content:
                'Ты создаёшь синтетических респондентов для социологических симуляций. Всегда возвращай только валидный JSON-объект вида {"respondents":[...]}. Не используй Markdown и не придумывай статистику, отсутствующую в переданном контексте.',
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    const groqData =
      (await groqResponse.json()) as GroqResponse;

    if (!groqResponse.ok) {
      console.error("Ошибка Groq API:", groqData);

      return NextResponse.json(
        {
          error:
            groqData.error?.message ||
            `Groq вернул ошибку ${groqResponse.status}.`,
        },
        { status: groqResponse.status }
      );
    }

    const rawText =
      groqData.choices?.[0]?.message?.content;

    if (!rawText) {
      console.error(
        "Groq не вернул содержимое:",
        groqData
      );

      return NextResponse.json(
        {
          error:
            "Нейросеть не вернула содержимое ответа.",
        },
        { status: 500 }
      );
    }

    const cleanedText = cleanJsonText(rawText);

    let parsed: unknown;

    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error(
        "Модель вернула невалидный JSON:",
        rawText
      );
      console.error(
        "Ошибка разбора JSON:",
        parseError
      );

      return NextResponse.json(
        {
          error:
            "Нейросеть вернула ответ в неправильном формате.",
          raw: rawText,
        },
        { status: 500 }
      );
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("respondents" in parsed)
    ) {
      return NextResponse.json(
        {
          error:
            'В ответе нейросети отсутствует массив "respondents".',
          raw: parsed,
        },
        { status: 500 }
      );
    }

    const respondents = (
      parsed as {
        respondents: unknown;
      }
    ).respondents;

    if (!validateRespondents(respondents)) {
      console.error(
        "Неправильная структура респондентов:",
        respondents
      );

      return NextResponse.json(
        {
          error:
            "Нейросеть вернула респондентов с неправильной структурой.",
          raw: respondents,
        },
        { status: 500 }
      );
    }

    if (respondents.length !== count) {
      console.warn(
        `Запрошено ${count} респондентов, получено ${respondents.length}.`
      );
    }

    /*
     * Фронтенд ожидает именно массив,
     * поэтому возвращаем respondents, а не весь объект.
     */
    return NextResponse.json(respondents);
  } catch (error) {
    console.error(
      "Ошибка сервера /api/generate:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Неизвестная ошибка сервера.",
      },
      { status: 500 }
    );
  }
}