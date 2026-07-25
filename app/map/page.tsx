"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

import {
  getPopulation,
  savePopulation,
} from "../lib/populationStorage";

import {
  generateAIResearchReport,
  prepareAIReportPayload,
} from "../lib/reportGenerator";

import type {
  AIResearchReport,
  AIReportMeta,
  ReportRespondent,
} from "../lib/reportGenerator";

import type {
  AwarenessLevel,
  ConfidenceLevel,
  Gender,
  OpinionPosition,
  SyntheticRespondent,
} from "../lib/syntheticGenerator";

type Respondent = Omit<SyntheticRespondent, "region"> & {
  region: string;
  segment?: string;
};

type GenerateAnswerResponse = {
  respondentId?: number;
  answer?: string;
  error?: string;
  retryable?: boolean;
};

type PointPosition = {
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
};

const MAX_VISIBLE_POINTS = 160;
const MAX_MOBILE_RESPONDENTS = 40;

const ANALYSIS_STAGES = [
  "Подготовка данных выборки",
  "Анализ распределения мнений",
  "Анализ социально-демографических групп",
  "Кластеризация интервью",
  "Выделение основных аргументов",
  "Поиск закономерностей и инсайтов",
  "Формирование аналитического отчёта",
];

export default function MapPage() {
  const [population, setPopulation] = useState<
    Respondent[]
  >([]);

  const [selected, setSelected] =
    useState<Respondent | null>(null);

  const [topic, setTopic] = useState("");
  const [question, setQuestion] =
    useState("");

  const [report, setReport] =
    useState<AIResearchReport | null>(null);

  const [reportMeta, setReportMeta] =
    useState<AIReportMeta | null>(null);

  const [
    isGeneratingReport,
    setIsGeneratingReport,
  ] = useState(false);

  const [reportError, setReportError] =
    useState<string | null>(null);

  const [
    activeAnalysisStage,
    setActiveAnalysisStage,
  ] = useState(0);

  const [
    isGeneratingAnswer,
    setIsGeneratingAnswer,
  ] = useState(false);

  const [answerError, setAnswerError] =
    useState<string | null>(null);

  useEffect(() => {
    const storedPopulation =
      getPopulation();

    const safePopulation =
      Array.isArray(storedPopulation)
        ? storedPopulation
        : [];

    const normalizedPopulation: Respondent[] =
      safePopulation.map((item) => {
        const person =
          item as Partial<Respondent>;

        return {
          id:
            typeof person.id === "number"
              ? person.id
              : 0,

          name:
            typeof person.name === "string"
              ? person.name
              : "Без имени",

          age:
            typeof person.age === "number"
              ? person.age
              : 18,

          city:
            typeof person.city === "string"
              ? person.city
              : "Не указан",

          region:
            typeof person.region === "string" &&
            person.region.trim()
              ? person.region
              : typeof person.city === "string" &&
                  person.city.trim()
                ? person.city
                : "Регион не указан",

          gender:
            person.gender === "мужчина" ||
            person.gender === "женщина"
              ? (person.gender as Gender)
              : "женщина",

          segment:
            typeof person.segment === "string"
              ? person.segment
              : undefined,

          education:
            typeof person.education ===
              "string" &&
            person.education.trim()
              ? person.education
              : "не указано",

          employment:
            typeof person.employment ===
              "string" &&
            person.employment.trim()
              ? person.employment
              : "не указано",

          income:
            typeof person.income ===
              "string" &&
            person.income.trim()
              ? person.income
              : "не указано",

          familyStatus:
            typeof person.familyStatus ===
              "string" &&
            person.familyStatus.trim()
              ? person.familyStatus
              : "не указано",

          settlementType:
            typeof person.settlementType ===
              "string" &&
            person.settlementType.trim()
              ? person.settlementType
              : "не указано",

          interests: Array.isArray(
            person.interests
          )
            ? person.interests.filter(
                (
                  item
                ): item is string =>
                  typeof item === "string"
              )
            : [],

          values: Array.isArray(
            person.values
          )
            ? person.values.filter(
                (
                  item
                ): item is string =>
                  typeof item === "string"
              )
            : [],

          opinion: [
            "полностью поддерживает",
            "скорее поддерживает",
            "нейтральная позиция",
            "скорее не поддерживает",
            "совершенно не поддерживает",
            "затрудняется ответить",
            "отказывается отвечать",
          ].includes(String(person.opinion))
            ? (person.opinion as OpinionPosition)
            : "нейтральная позиция",

          awareness: [
            "низкая",
            "средняя",
            "высокая",
          ].includes(
            String(person.awareness)
          )
            ? (person.awareness as AwarenessLevel)
            : "средняя",

          confidence: [
            "низкая",
            "средняя",
            "высокая",
          ].includes(
            String(person.confidence)
          )
            ? (person.confidence as ConfidenceLevel)
            : "средняя",

          willingnessToAnswer:
            typeof person.willingnessToAnswer ===
              "number" &&
            Number.isFinite(
              person.willingnessToAnswer
            )
              ? person.willingnessToAnswer
              : 0.5,

          topic:
            typeof person.topic === "string"
              ? person.topic
              : "",

          question:
            typeof person.question ===
              "string"
              ? person.question
              : "",

          answer:
            typeof person.answer ===
              "string" &&
            person.answer.trim()
              ? person.answer
              : null,
        };
      });

    const savedTopic =
      localStorage.getItem(
        "research_topic"
      ) || "";

    const savedQuestion =
      localStorage.getItem(
        "research_question"
      ) || "";

    setPopulation(normalizedPopulation);
    setTopic(savedTopic);
    setQuestion(savedQuestion);
  }, []);

  const visiblePopulation = useMemo(() => {
    if (population.length <= MAX_VISIBLE_POINTS) {
      return population;
    }

    const step = population.length / MAX_VISIBLE_POINTS;

    return Array.from(
      { length: MAX_VISIBLE_POINTS },
      (_, index) =>
        population[Math.floor(index * step)]
    ).filter(Boolean);
  }, [population]);

  const mobilePopulation = useMemo(() => {
    if (population.length <= MAX_MOBILE_RESPONDENTS) {
      return population;
    }

    const step =
      population.length / MAX_MOBILE_RESPONDENTS;

    return Array.from(
      { length: MAX_MOBILE_RESPONDENTS },
      (_, index) =>
        population[Math.floor(index * step)]
    ).filter(Boolean);
  }, [population]);

  const respondentsForReport =
    useMemo<ReportRespondent[]>(() => {
      return population.map((person) => ({
        id: person.id,
        name: person.name,
        age: person.age,
        city: person.city,
        region: person.region,
        gender: person.gender,
        segment:
          person.segment ||
          getRespondentSegment(person),
        education: person.education,
        employment: person.employment,
        income: person.income,
        familyStatus:
          person.familyStatus,
        settlementType:
          person.settlementType,
        interests: person.interests,
        values: person.values,
        opinion: person.opinion,
        awareness: person.awareness,
        confidence: person.confidence,
        answer: person.answer || "",
      }));
    }, [population]);

  const reportPayload = useMemo(() => {
    if (respondentsForReport.length === 0) {
      return null;
    }

    return prepareAIReportPayload(
      {
        topic:
          topic ||
          "Тема исследования не указана",
        question:
          question ||
          "Исследовательский вопрос не указан",
      },
      respondentsForReport
    );
  }, [
    respondentsForReport,
    topic,
    question,
  ]);

  const opinionDistribution =
    reportPayload?.opinionDistribution;

  const positivePercent =
    (opinionDistribution?.fullySupport ??
      0) +
    (opinionDistribution?.ratherSupport ??
      0);

  const neutralPercent =
    (opinionDistribution?.neutral ?? 0) +
    (opinionDistribution
      ?.difficultToAnswer ?? 0) +
    (opinionDistribution
      ?.refuseToAnswer ?? 0);

  const negativePercent =
    (opinionDistribution
      ?.ratherOppose ?? 0) +
    (opinionDistribution
      ?.fullyOppose ?? 0);

  useEffect(() => {
    if (!isGeneratingReport) {
      return;
    }

    setActiveAnalysisStage(0);

    const interval =
      window.setInterval(() => {
        setActiveAnalysisStage(
          (current) => {
            if (
              current >=
              ANALYSIS_STAGES.length - 1
            ) {
              return current;
            }

            return current + 1;
          }
        );
      }, 1300);

    return () => {
      window.clearInterval(interval);
    };
  }, [isGeneratingReport]);

  function getRespondentSegment(
    person: Respondent
  ): string {
    if (person.segment) {
      return person.segment;
    }

    if (
      person.opinion ===
        "полностью поддерживает" ||
      person.opinion ===
        "скорее поддерживает"
    ) {
      return "Поддерживает";
    }

    if (
      person.opinion ===
        "совершенно не поддерживает" ||
      person.opinion ===
        "скорее не поддерживает"
    ) {
      return "Не поддерживает";
    }

    if (
      person.opinion ===
      "затрудняется ответить"
    ) {
      return "Не определился";
    }

    if (
      person.opinion ===
      "отказывается отвечать"
    ) {
      return "Отказ от ответа";
    }

    return "Нейтральная позиция";
  }

  async function createAIReport() {
  if (
    isGeneratingReport ||
    population.length === 0
  ) {
    return;
  }

  setIsGeneratingReport(true);
  setReportError(null);
  setReport(null);
  setReportMeta(null);
  setActiveAnalysisStage(0);

  try {
    let updatedPopulation = [...population];

    const existingInterviews =
      updatedPopulation.filter(
        (person) => person.answer
      );

    if (existingInterviews.length < 5) {
      const missing =
        5 - existingInterviews.length;

      const candidates =
        updatedPopulation.filter(
          (person) => !person.answer
        );

      for (
        let i = 0;
        i <
        Math.min(
          missing,
          candidates.length
        );
        i++
      ) {
        try {
          const generated =
            await generateInterviewForRespondent(
              candidates[i]
            );

          updatedPopulation =
            updatedPopulation.map((person) =>
              person.id === generated.id
                ? generated
                : person
            );
        } catch (error) {
          console.warn(
            `Не удалось автоматически создать интервью для респондента ${candidates[i].id}:`,
            error
          );
        }
      }

      setPopulation(updatedPopulation);
      savePopulation(updatedPopulation);
    }

    const result =
      await generateAIResearchReport(
        {
          topic:
            topic ||
            "Тема исследования не указана",

          question:
            question ||
            "Исследовательский вопрос не указан",
        },
        updatedPopulation.map((person) => ({
          id: person.id,
          name: person.name,
          age: person.age,
          city: person.city,
          region: person.region,
          gender: person.gender,
          segment:
            person.segment ||
            getRespondentSegment(person),
          education: person.education,
          employment: person.employment,
          income: person.income,
          familyStatus:
            person.familyStatus,
          settlementType:
            person.settlementType,
          interests: person.interests,
          values: person.values,
          opinion: person.opinion,
          awareness: person.awareness,
          confidence: person.confidence,
          answer: person.answer || "",
        }))
      );

      setReport(result.report);
      setReportMeta(result.meta);

      localStorage.setItem(
        "latest_ai_research_report",
        JSON.stringify(result)
      );

      setActiveAnalysisStage(
        ANALYSIS_STAGES.length - 1
      );
    } catch (error) {
      setReportError(
        error instanceof Error
          ? error.message
          : "Не удалось сформировать аналитический отчёт."
      );
    } finally {
      setIsGeneratingReport(false);
    }
  }

  function openRespondent(
    person: Respondent
  ) {
    setSelected(person);
    setAnswerError(null);
  }

  function closeRespondent() {
    if (isGeneratingAnswer) {
      return;
    }

    setSelected(null);
    setAnswerError(null);
  }

  function getPointPosition(
    person: Respondent,
    index: number
  ): PointPosition {
    const seed =
      Math.abs(
        person.id * 97 +
          index * 53 +
          person.age * 17
      ) || index + 1;

    return {
      left: 5 + ((seed * 37) % 88),
      top: 7 + ((seed * 61) % 82),
      size: 13 + ((seed * 13) % 12),
      duration:
        3.4 +
        ((seed * 7) % 25) / 10,
      delay:
        -((seed * 11) % 30) / 10,
    };
  }

  function getPointClass(
    person: Respondent
  ): string {
    const segment =
      getRespondentSegment(
        person
      ).toLowerCase();

    if (
      segment.includes("не поддерж") ||
      segment.includes("крит")
    ) {
      return person.answer
        ? "border-black bg-black shadow-[0_0_22px_rgba(0,0,0,0.45)]"
        : "border-gray-700 bg-gray-700 shadow-[0_0_16px_rgba(31,41,55,0.30)]";
    }

    if (
      segment.includes("поддерж") ||
      segment.includes("позит")
    ) {
      return person.answer
        ? "border-blue-600 bg-blue-600 shadow-[0_0_26px_rgba(49,84,255,0.60)]"
        : "border-blue-500 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.42)]";
    }

    return person.answer
      ? "border-violet-600 bg-violet-600 shadow-[0_0_23px_rgba(124,58,237,0.48)]"
      : "border-sky-500 bg-sky-500 shadow-[0_0_18px_rgba(14,165,233,0.38)]";
  }

  function getInitials(
    name: string
  ): string {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return "—";
    }

    if (parts.length === 1) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
async function generateInterviewForRespondent(
  respondent: Respondent
): Promise<Respondent> {
  const respondentForRequest = {
    ...respondent,

    topic:
      respondent.topic ||
      topic ||
      "Не указана",

    question:
      respondent.question ||
      question ||
      "Не указан",

    region:
      respondent.region ||
      respondent.city,

    education:
      respondent.education ||
      "не указано",

    employment:
      respondent.employment ||
      "не указано",

    income:
      respondent.income ||
      "не указано",

    familyStatus:
      respondent.familyStatus ||
      "не указано",

    settlementType:
      respondent.settlementType ||
      "не указано",

    interests:
      respondent.interests || [],

    values:
      respondent.values || [],

    opinion:
      respondent.opinion ||
      respondent.segment ||
      "нейтральная позиция",
  };

  const response = await fetch(
    "/api/generate-answer",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        respondent: respondentForRequest,
      }),
    }
  );

  const data =
    (await response.json()) as GenerateAnswerResponse;

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Не удалось сгенерировать интервью."
    );
  }

  if (
    typeof data.answer !== "string" ||
    !data.answer.trim()
  ) {
    throw new Error(
      "Сервер не вернул интервью."
    );
  }

  return {
    ...respondent,
    topic: respondent.topic || topic,
    question:
      respondent.question || question,
    answer: data.answer.trim(),
  };
}
  async function generateAnswer() {
  if (!selected || isGeneratingAnswer) {
    return;
  }

  setIsGeneratingAnswer(true);
  setAnswerError(null);

  try {
    const updatedSelected =
      await generateInterviewForRespondent(
        selected
      );

    const updatedPopulation =
      population.map((person) =>
        person.id === updatedSelected.id
          ? updatedSelected
          : person
      );

    setPopulation(updatedPopulation);
    setSelected(updatedSelected);
    savePopulation(updatedPopulation);

    setReport(null);
    setReportMeta(null);
    setReportError(null);

    localStorage.removeItem(
      "latest_ai_research_report"
    );
  } catch (error) {
    setAnswerError(
      error instanceof Error
        ? error.message
        : "Произошла неизвестная ошибка."
    );
  } finally {
    setIsGeneratingAnswer(false);
  }
}

  const completedInterviews =
    population.filter(
      (person) => person.answer
    ).length;

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 sm:px-10 sm:py-12 lg:px-16">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.16] mix-blend-multiply"
        style={{
          backgroundImage: `
            radial-gradient(
              circle at 20% 20%,
              rgba(17, 17, 17, 0.16) 0.45px,
              transparent 0.55px
            ),
            radial-gradient(
              circle at 80% 30%,
              rgba(17, 17, 17, 0.11) 0.4px,
              transparent 0.55px
            ),
            radial-gradient(
              circle at 45% 75%,
              rgba(49, 84, 255, 0.08) 0.45px,
              transparent 0.6px
            )
          `,
          backgroundSize:
            "9px 9px, 13px 13px, 17px 17px",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-32 -top-52 z-0 h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[150px]"
      />

      <section className="site-surface relative z-10 mx-auto min-h-[calc(100vh-64px)] w-full max-w-[1720px] overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-5 sm:px-10">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <span className="h-3 w-3 rounded-full bg-blue-600" />

            <span className="text-sm font-black tracking-[-0.03em]">
              SYNTHETIC PLATFORM
            </span>
          </Link>

          <span className="eyebrow">
            04 / RESULTS
          </span>
        </header>

        <div className="grid min-h-[calc(100vh-137px)] xl:grid-cols-[minmax(0,1.15fr)_minmax(500px,0.85fr)]">
          <section className="relative overflow-hidden border-b border-gray-200 bg-gray-100 xl:border-b-0 xl:border-r">
            <div className="p-8 sm:p-12 lg:p-14 xl:p-16">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="eyebrow">
                    Синтетическая популяция
                  </p>

                  <h1 className="mt-5 max-w-[760px] text-[42px] font-black leading-[0.94] tracking-[-0.055em] text-black sm:text-[56px] lg:text-[66px] xl:text-[70px] 2xl:text-[78px]">
                    Результаты
                    <br />

                    {/*
                     * Здесь специально сброшены
                     * фон, скругление, тень и
                     * псевдоэлементы.
                     *
                     * Белого овала возле слова
                     * больше быть не должно.
                     */}
                    <span
                      className="inline border-0 bg-transparent p-0 text-blue-600 shadow-none outline-none [border-radius:0] before:hidden after:hidden"
                      style={{
                        background:
                          "transparent",
                        borderRadius: 0,
                        boxShadow: "none",
                      }}
                    >
                      исследования
                    </span>
                  </h1>
                </div>

                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-gray-200 bg-gray-200 lg:w-[330px]">
                  <div className="bg-white p-5">
                    <p className="eyebrow">
                      Выборка
                    </p>

                    <p className="mt-2 text-3xl font-black tracking-[-0.05em]">
                      {population.length}
                    </p>
                  </div>

                  <div className="bg-white p-5">
                    <p className="eyebrow">
                      Интервью
                    </p>

                    <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-blue-600">
                      {completedInterviews}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 grid gap-8 border-t border-gray-300 pt-8 lg:grid-cols-2">
                <div>
                  <p className="eyebrow">
                    Тема
                  </p>

                  <p className="mt-3 max-w-[600px] text-xl font-black leading-snug tracking-[-0.035em]">
                    {topic ||
                      "Тема исследования не указана"}
                  </p>
                </div>

                <div>
                  <p className="eyebrow">
                    Исследовательский вопрос
                  </p>

                  <p className="mt-3 max-w-[600px] leading-7 text-gray-700">
                    {question ||
                      "Исследовательский вопрос не указан"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-white">
              <div className="flex items-center justify-between gap-6 px-8 py-5 sm:px-12 lg:px-14 xl:px-16">
                <div>
                  <p className="eyebrow">
                    Карта респондентов
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Нажмите на любую точку, чтобы открыть профиль респондента.
                  </p>
                </div>

                <div className="hidden items-center gap-5 text-xs text-gray-500 sm:flex">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 min-h-3 min-w-3 shrink-0 rounded-full bg-blue-600 shadow-[0_0_12px_rgba(49,84,255,0.55)] [border-radius:9999px]" />
                    Поддерживает
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 min-h-3 min-w-3 shrink-0 rounded-full bg-black shadow-[0_0_10px_rgba(0,0,0,0.35)] [border-radius:9999px]" />
                    Критическая позиция
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 min-h-3 min-w-3 shrink-0 rounded-full bg-violet-600 shadow-[0_0_10px_rgba(124,58,237,0.40)] [border-radius:9999px]" />
                    Нейтральная позиция
                  </span>
                </div>
              </div>

              {population.length === 0 ? (
                <div className="m-8 border border-gray-200 bg-gray-50 p-10 text-center sm:m-12">
                  <p className="text-2xl font-black tracking-[-0.04em]">
                    Выборка пока не найдена
                  </p>

                  <p className="mx-auto mt-4 max-w-[500px] leading-7 text-gray-500">
                    Вернитесь на страницу
                    генерации и создайте
                    синтетических респондентов.
                  </p>

                  <Link
                    href="/generation"
                    className="app-button mt-7 inline-flex"
                  >
                    Перейти к генерации →
                  </Link>
                </div>
              ) : (
                <>
                  <div
                    className="relative hidden h-[700px] overflow-hidden border-y border-gray-200 bg-white md:block"
                    style={{
                      backgroundImage: `
                        linear-gradient(
                          rgba(17, 17, 17, 0.045) 1px,
                          transparent 1px
                        ),
                        linear-gradient(
                          90deg,
                          rgba(17, 17, 17, 0.045) 1px,
                          transparent 1px
                        )
                      `,
                      backgroundSize:
                        "70px 70px",
                    }}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-600/10"
                    />

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-600/[0.07]"
                    />

                    {visiblePopulation
                      .map(
                        (
                          person,
                          index
                        ) => {
                          const point =
                            getPointPosition(
                              person,
                              index
                            );

                          return (
                            <button
                              type="button"
                              key={`${person.id}-${index}`}
                              onClick={() =>
                                openRespondent(
                                  person
                                )
                              }
                              className={`
                                group
                                absolute
                                z-10
                                -translate-x-1/2
                                -translate-y-1/2
                                animate-pulse
                                rounded-full
                                border
                                shadow-[0_0_0_7px_rgba(255,255,255,0.90)]
                                transition-[filter,box-shadow,transform]
                                duration-200
                                hover:z-30
                                hover:animate-none
                                hover:scale-[1.9]
                                hover:brightness-110
                                focus:z-30
                                focus:animate-none
                                focus:scale-[1.9]
                                focus:outline-none
                                focus:ring-4
                                focus:ring-blue-600/20
                                motion-reduce:animate-none
                                ${getPointClass(
                                  person
                                )}
                              `}
                              style={{
                                left: `${point.left}%`,
                                top: `${point.top}%`,
                                width: `${point.size}px`,
                                height: `${point.size}px`,
                                animationDuration: `${point.duration}s`,
                                animationDelay: `${point.delay}s`,
                              }}
                              aria-label={`Открыть профиль: ${person.name}`}
                            >
                              <span className="pointer-events-none absolute bottom-[calc(100%+16px)] left-1/2 hidden w-[200px] -translate-x-1/2 rounded-[14px] border border-gray-200 bg-white p-4 text-left text-black shadow-xl group-hover:block group-focus:block">
                                <span className="block text-sm font-black">
                                  {
                                    person.name
                                  }
                                </span>

                                <span className="mt-1 block text-xs text-gray-500">
                                  {
                                    person.age
                                  }{" "}
                                  лет ·{" "}
                                  {
                                    person.city
                                  }
                                </span>

                                <span className="mt-3 block text-[10px] font-black uppercase tracking-[0.08em] text-blue-600">
                                  {getRespondentSegment(
                                    person
                                  )}
                                </span>

                                <span className="mt-2 block text-[10px] font-medium uppercase tracking-[0.06em] text-gray-400">
                                  {person.answer
                                    ? "Интервью создано"
                                    : "Интервью не создано"}
                                </span>
                              </span>
                            </button>
                          );
                        }
                      )}

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-6 left-8 text-[120px] font-black leading-none tracking-[-0.09em] text-blue-600/[0.035]"
                    >
                      04
                    </div>
                  </div>

                  <div className="grid gap-px bg-gray-200 md:hidden">
                    {mobilePopulation
                      .map(
                        (
                          person,
                          index
                        ) => (
                          <button
                            type="button"
                            key={`${person.id}-${index}`}
                            onClick={() =>
                              openRespondent(
                                person
                              )
                            }
                            className="flex items-center justify-between gap-5 bg-white p-5 text-left transition hover:bg-gray-50"
                          >
                            <div className="flex min-w-0 items-center gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-black">
                                {getInitials(
                                  person.name
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-black">
                                  {
                                    person.name
                                  }
                                </p>

                                <p className="mt-1 text-sm text-gray-500">
                                  {
                                    person.age
                                  }{" "}
                                  лет ·{" "}
                                  {
                                    person.city
                                  }
                                </p>
                              </div>
                            </div>

                            <span
                              className={`h-3.5 w-3.5 shrink-0 rounded-full ${
                                person.answer
                                  ? "bg-blue-600"
                                  : "bg-sky-500"
                              }`}
                            />
                          </button>
                        )
                      )}
                  </div>

                  <div className="flex flex-col gap-4 px-8 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-12 lg:px-14 xl:px-16">
                    <p className="text-sm leading-6 text-gray-500">
                      Показано{" "}
                      {visiblePopulation.length}{" "}
                      респондентов из{" "}
                      {population.length}. Точки отобраны
                      равномерно по всей выборке, чтобы карта
                      оставалась быстрой.
                    </p>

                    <p className="text-sm font-black">
                      {completedInterviews}{" "}
                      интервью сформировано
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>

          <aside className="bg-white xl:min-w-0">
            <div className="z-20 border-b border-gray-200 bg-white px-8 py-7 sm:px-10 xl:px-10 2xl:px-12">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
                    04
                  </span>

                  <div>
                    <p className="eyebrow">Аналитика исследования</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {report ? "Отчёт готов" : isGeneratingReport ? "Идёт анализ данных" : "Готово к анализу"}
                    </p>
                  </div>
                </div>

                {report && (
                  <Link
                    href="/report"
                    className="rounded-full border border-gray-200 px-4 py-2 text-xs font-black transition hover:border-black hover:bg-black hover:text-white"
                  >
                    Полный отчёт ↗
                  </Link>
                )}
              </div>
            </div>

            <div className="p-8 sm:p-10 xl:p-10 2xl:p-12">
              <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-gray-950 text-white shadow-[0_20px_60px_rgba(17,17,17,0.12)]">
                <div className="relative p-7 sm:p-8">
                  <div aria-hidden="true" className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-600/40 blur-3xl" />

                  <div className="relative">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-300">
                      AI-анализ популяции
                    </p>

                    <h2 className="mt-4 max-w-[520px] text-[34px] font-black leading-[0.98] tracking-[-0.055em] sm:text-[42px]">
                      Что думают респонденты
                    </h2>

                    <p className="mt-4 max-w-[560px] text-sm leading-6 text-gray-300">
                      Сводка позиций, аргументов, различий между группами и ключевых исследовательских инсайтов.
                    </p>

                    <div className="mt-7 grid grid-cols-3 gap-2">
                      <div className="rounded-[16px] border border-white/10 bg-white/[0.06] p-4">
                        <p className="text-2xl font-black tracking-[-0.04em]">{population.length}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400">Респондентов</p>
                      </div>

                      <div className="rounded-[16px] border border-white/10 bg-white/[0.06] p-4">
                        <p className="text-2xl font-black tracking-[-0.04em] text-blue-300">{completedInterviews}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400">Интервью</p>
                      </div>

                      <div className="rounded-[16px] border border-white/10 bg-white/[0.06] p-4">
                        <p className="text-2xl font-black tracking-[-0.04em]">{positivePercent}%</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400">Поддержка</p>
                      </div>
                    </div>

                    {!report && !isGeneratingReport && (
                      <button
                        type="button"
                        onClick={createAIReport}
                        disabled={population.length === 0}
                        className="mt-6 flex min-h-16 w-full items-center justify-between rounded-[18px] bg-blue-600 px-6 text-left font-black transition hover:bg-blue-500 hover:shadow-[0_12px_35px_rgba(49,84,255,0.35)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span>
                          <span className="block text-base">Сформировать отчёт</span>
                          <span className="mt-1 block text-xs font-medium text-blue-100">Анализ займёт один запуск модели</span>
                        </span>
                        <span className="text-2xl">→</span>
                      </button>
                    )}

                    {report && (
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <Link
                          href="/report"
                          className="flex min-h-14 items-center justify-between rounded-[16px] bg-blue-600 px-5 font-black transition hover:bg-blue-500"
                        >
                          Открыть отчёт <span>→</span>
                        </Link>

                        <button
                          type="button"
                          onClick={createAIReport}
                          disabled={isGeneratingReport}
                          className="min-h-14 rounded-[16px] border border-white/20 px-5 font-black transition hover:border-white hover:bg-white hover:text-black disabled:opacity-50"
                        >
                          Обновить анализ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {population.length > 0 && (
                <section className="mt-6 rounded-[24px] border border-gray-200 bg-gray-50 p-5 sm:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="eyebrow">Баланс мнений</p>
                      <p className="mt-2 text-sm text-gray-500">Распределение позиций в выборке</p>
                    </div>
                    <span className="text-xs font-black text-gray-400">100%</span>
                  </div>

                  <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-gray-200">
                    <div className="bg-blue-600 transition-all" style={{ width: `${positivePercent}%` }} />
                    <div className="bg-gray-400 transition-all" style={{ width: `${neutralPercent}%` }} />
                    <div className="bg-black transition-all" style={{ width: `${negativePercent}%` }} />
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-[16px] bg-white p-4 shadow-sm ring-1 ring-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.07em] text-gray-500">Поддержка</span>
                      </div>
                      <p className="mt-3 text-2xl font-black tracking-[-0.05em] text-blue-600">{positivePercent}%</p>
                    </div>

                    <div className="rounded-[16px] bg-white p-4 shadow-sm ring-1 ring-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.07em] text-gray-500">Нейтрально</span>
                      </div>
                      <p className="mt-3 text-2xl font-black tracking-[-0.05em]">{neutralPercent}%</p>
                    </div>

                    <div className="rounded-[16px] bg-white p-4 shadow-sm ring-1 ring-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-black" />
                        <span className="text-[10px] font-black uppercase tracking-[0.07em] text-gray-500">Неподдержка</span>
                      </div>
                      <p className="mt-3 text-2xl font-black tracking-[-0.05em]">{negativePercent}%</p>
                    </div>
                  </div>
                </section>
              )}

            {isGeneratingReport && (
              <section className="mt-8 border border-blue-200 bg-blue-50/60 p-7">
                <p className="eyebrow text-blue-600">
                  Анализ данных
                </p>

                <h3 className="mt-3 text-2xl font-black tracking-[-0.04em]">
                  Формируем отчёт
                </h3>

                <div className="mt-6 space-y-4">
                  {ANALYSIS_STAGES.map(
                    (stage, index) => {
                      const completed =
                        index <
                        activeAnalysisStage;

                      const active =
                        index ===
                        activeAnalysisStage;

                      return (
                        <div
                          key={stage}
                          className="flex items-start gap-3"
                        >
                          <span
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                              completed
                                ? "bg-blue-600 text-white"
                                : active
                                  ? "border-2 border-blue-600 bg-white text-blue-600"
                                  : "border border-gray-300 bg-white text-gray-400"
                            }`}
                          >
                            {completed
                              ? "✓"
                              : index +
                                1}
                          </span>

                          <p
                            className={`text-sm leading-6 ${
                              completed ||
                              active
                                ? "font-bold text-gray-900"
                                : "text-gray-400"
                            }`}
                          >
                            {stage}
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>
            )}

            {reportError && (
              <section className="mt-8 rounded-[18px] border border-red-200 bg-red-50 p-6 text-red-700">
                <p className="font-black">
                  Не удалось сформировать
                  отчёт
                </p>

                <p className="mt-2 text-sm leading-6">
                  {reportError}
                </p>

                <button
                  type="button"
                  onClick={createAIReport}
                  className="mt-5 text-sm font-black underline"
                >
                  Попробовать снова
                </button>
              </section>
            )}

            {report && (
              <>
                <section className="mt-10 border-t border-gray-200 pt-8">
                  <p className="eyebrow">
                    Краткие выводы
                    исследования
                  </p>

                  <div className="mt-5 space-y-0">
                    {report.briefConclusions.map(
                      (item, index) => (
                        <div
                          key={`${item}-${index}`}
                          className="grid grid-cols-[34px_1fr] gap-4 border-t border-gray-200 py-5 first:border-t-0 first:pt-0"
                        >
                          <span className="text-sm font-black text-blue-600">
                            {String(
                              index + 1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </span>

                          <p className="text-sm leading-6 text-gray-700">
                            {item}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </section>

                <section className="mt-10 border-t border-gray-200 pt-8">
                  <p className="eyebrow">
                    Анализ распределения
                    мнений
                  </p>

                  <p className="mt-4 whitespace-pre-line leading-7 text-gray-700">
                    {
                      report.distributionAnalysis
                    }
                  </p>
                </section>

                {report.demographicAnalysis
                  .length > 0 && (
                  <ReportList
                    title="Социально-демографический анализ"
                    items={
                      report.demographicAnalysis
                    }
                  />
                )}

                {report.supportArguments
                  .length > 0 && (
                  <ReportList
                    title="Аргументы сторонников"
                    items={
                      report.supportArguments
                    }
                  />
                )}

                {report.opposeArguments
                  .length > 0 && (
                  <ReportList
                    title="Аргументы противников"
                    items={
                      report.opposeArguments
                    }
                  />
                )}

                {report.neutralArguments
                  .length > 0 && (
                  <ReportList
                    title="Нейтральные и неопределённые позиции"
                    items={
                      report.neutralArguments
                    }
                  />
                )}

                {report.quotes.length >
                  0 && (
                  <section className="mt-10 border-t border-gray-200 pt-8">
                    <p className="eyebrow">
                      Высказывания
                      респондентов
                    </p>

                    <div className="mt-6 space-y-5">
                      {report.quotes.map(
                        (
                          item,
                          index
                        ) => (
                          <blockquote
                            key={`${item.quote}-${index}`}
                            className="border-l-4 border-blue-600 bg-gray-50 p-6"
                          >
                            <p className="text-lg leading-8 text-gray-800">
                              «
                              {
                                item.quote
                              }
                              »
                            </p>

                            <footer className="mt-4 text-xs font-bold uppercase tracking-[0.05em] text-gray-500">
                              {
                                item.respondentDescription
                              }
                              {" · "}
                              {
                                item.opinion
                              }
                            </footer>
                          </blockquote>
                        )
                      )}
                    </div>
                  </section>
                )}

                {report.insights.length >
                  0 && (
                  <section className="mt-10 border-t border-gray-200 pt-8">
                    <p className="eyebrow">
                      Ключевые инсайты
                    </p>

                    <div className="mt-6 space-y-5">
                      {report.insights.map(
                        (
                          insight,
                          index
                        ) => (
                          <article
                            key={`${insight.title}-${index}`}
                            className="border border-gray-200 p-6"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="font-black">
                                {
                                  insight.title
                                }
                              </h3>

                              <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.06em] text-blue-600">
                                Уверенность:{" "}
                                {
                                  insight.confidence
                                }
                              </span>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-gray-700">
                              {
                                insight.description
                              }
                            </p>

                            <p className="mt-4 border-t border-gray-200 pt-4 text-xs leading-5 text-gray-500">
                              Основание:{" "}
                              {
                                insight.basis
                              }
                            </p>
                          </article>
                        )
                      )}
                    </div>
                  </section>
                )}

                <section className="mt-10 border-t border-gray-200 pt-8">
                  <p className="eyebrow">
                    Методология
                  </p>

                  <div className="mt-5 space-y-5 text-sm leading-6 text-gray-700">
                    <MethodologyItem
                      label="Описание выборки"
                      text={
                        report
                          .methodology
                          .sampleDescription
                      }
                    />

                    <MethodologyItem
                      label="Формирование популяции"
                      text={
                        report
                          .methodology
                          .generationMethod
                      }
                    />

                    <MethodologyItem
                      label="Метод анализа"
                      text={
                        report
                          .methodology
                          .analysisMethod
                      }
                    />

                    <MethodologyItem
                      label="Основа данных"
                      text={
                        report
                          .methodology
                          .dataBasis
                      }
                    />
                  </div>
                </section>

                <ReportList
                  title="Ограничения исследования"
                  items={
                    report.limitations
                  }
                />

                {reportMeta && (
                  <div className="mt-8 border-t border-gray-200 pt-5 text-xs leading-5 text-gray-400">
                    Проанализировано интервью:{" "}
                    {
                      reportMeta.interviewsAnalyzed
                    }{" "}
                    из{" "}
                    {
                      reportMeta.interviewsReceived
                    }
                    .
                  </div>
                )}

                <Link
                  href="/report"
                  className="app-button mt-8 flex min-h-14 w-full items-center justify-center text-center"
                >
                  Открыть полный отчёт →
                </Link>

                <button
                  type="button"
                  onClick={createAIReport}
                  disabled={
                    isGeneratingReport
                  }
                  className="mt-3 min-h-14 w-full border border-gray-300 px-5 font-black transition hover:border-black disabled:opacity-50"
                >
                  Сформировать отчёт заново
                </button>
              </>
            )}

              <div className="mt-10 flex items-center gap-4 text-sm text-gray-500">
                <span className="h-px flex-1 bg-gray-200" />
                <span>04 / 04</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {selected && (
        <div
          className="respondent-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm sm:p-8"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeRespondent();
            }
          }}
        >
          <article className="respondent-modal-card relative max-h-[92vh] w-full max-w-[1120px] overflow-y-auto rounded-[26px] bg-white shadow-2xl">
            <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white/95 px-6 py-5 backdrop-blur sm:px-10">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-blue-600" />

                <div>
                  <span className="eyebrow">
                    Профиль респондента
                  </span>

                  {population[0]?.id === selected.id && (
                    <p className="mt-1 text-xs font-bold text-blue-600">
                      Первый профиль из выборки
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={closeRespondent}
                disabled={
                  isGeneratingAnswer
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-2xl leading-none text-gray-500 transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Закрыть карточку"
              >
                ×
              </button>
            </header>

            <div className="grid lg:grid-cols-[minmax(300px,0.62fr)_minmax(0,1.38fr)]">
              <section className="border-b border-gray-200 bg-gray-100 p-7 sm:p-10 lg:border-b-0 lg:border-r">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-xl font-black text-white">
                  {getInitials(
                    selected.name
                  )}
                </div>

                <h2 className="mt-7 text-4xl font-black leading-[0.96] tracking-[-0.055em]">
                  {selected.name}
                </h2>

                <p className="mt-4 text-gray-600">
                  {selected.age} лет ·{" "}
                  {selected.city}
                </p>

                <div className="mt-8 border-t border-gray-300 pt-7">
                  <p className="eyebrow">
                    Позиция
                  </p>

                  <p className="mt-3 text-lg font-black leading-snug">
                    {selected.opinion ||
                      getRespondentSegment(
                        selected
                      )}
                  </p>
                </div>

                <dl className="mt-8 space-y-5">
                  <ProfileItem
                    label="Пол"
                    value={
                      selected.gender
                    }
                  />

                  <ProfileItem
                    label="Образование"
                    value={
                      selected.education
                    }
                  />

                  <ProfileItem
                    label="Занятость"
                    value={
                      selected.employment
                    }
                  />

                  <ProfileItem
                    label="Доход"
                    value={
                      selected.income
                    }
                  />

                  <ProfileItem
                    label="Семейное положение"
                    value={
                      selected.familyStatus
                    }
                  />
                </dl>
              </section>

              <section className="p-7 sm:p-10 lg:p-12">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="eyebrow">
                      Цифровое интервью
                    </p>

                    <h3 className="mt-3 text-3xl font-black tracking-[-0.045em]">
                      Ответ респондента
                    </h3>
                  </div>

                  <span
                    className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${
                      selected.answer
                        ? "bg-blue-600"
                        : "bg-sky-500"
                    }`}
                  />
                </div>

                <div className="mt-6 rounded-[18px] border border-blue-100 bg-blue-50/70 p-5">
                  <p className="eyebrow text-blue-600">
                    Превью интервью
                  </p>

                  <p className="mt-3 text-sm leading-6 text-blue-950">
                    {selected.answer
                      ? selected.answer.length > 220
                        ? `${selected.answer.slice(0, 220).trim()}…`
                        : selected.answer
                      : "Интервью для этого профиля ещё не создано. Его можно сгенерировать одной кнопкой ниже."}
                  </p>
                </div>

                <div className="mt-8 border-y border-gray-200 py-8">
                  {selected.answer ? (
                    <p className="whitespace-pre-wrap text-lg leading-8 tracking-[-0.01em] text-gray-800">
                      {selected.answer}
                    </p>
                  ) : (
                    <div>
                      <p className="text-xl font-black tracking-[-0.035em]">
                        Интервью ещё не
                        создано
                      </p>

                      <p className="mt-4 max-w-[560px] leading-7 text-gray-500">
                        Нейросеть сформирует
                        развёрнутый ответ на
                        основе социального
                        профиля, ценностей,
                        интересов и позиции
                        респондента.
                      </p>
                    </div>
                  )}
                </div>

                {selected.interests
                  .length > 0 && (
                  <TagSection
                    title="Интересы"
                    items={
                      selected.interests
                    }
                  />
                )}

                {selected.values.length >
                  0 && (
                  <TagSection
                    title="Ценности"
                    items={
                      selected.values
                    }
                    highlighted
                  />
                )}

                {answerError && (
                  <div className="mt-8 rounded-[18px] border border-red-200 bg-red-50 p-5 text-red-700">
                    <p className="font-black">
                      Не удалось получить
                      ответ
                    </p>

                    <p className="mt-2 text-sm leading-6">
                      {answerError}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={generateAnswer}
                  disabled={
                    isGeneratingAnswer
                  }
                  className="app-button mt-8 min-h-16 w-full px-6 text-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGeneratingAnswer
                    ? "Генерируем ответ…"
                    : selected.answer
                      ? "Сгенерировать заново →"
                      : "Сгенерировать интервью →"}
                </button>

                <p className="mt-4 text-center text-xs leading-5 text-gray-400">
                  После изменения интервью
                  аналитический отчёт
                  потребуется сформировать
                  заново.
                </p>
              </section>
            </div>
          </article>
        </div>
      )}

      <style jsx>{`
        .respondent-modal-backdrop {
          animation: respondentBackdropIn 180ms ease-out both;
        }

        .respondent-modal-card {
          animation: respondentCardIn 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes respondentBackdropIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes respondentCardIn {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </main>
  );
}

function ReportList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <p className="eyebrow">{title}</p>

      <div className="mt-5 space-y-0">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="grid grid-cols-[28px_1fr] gap-3 border-t border-gray-200 py-4 first:border-t-0 first:pt-0"
          >
            <span className="text-sm font-black text-blue-600">
              —
            </span>

            <p className="text-sm leading-6 text-gray-700">
              {item}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MethodologyItem({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div>
      <p className="font-black text-gray-900">
        {label}
      </p>

      <p className="mt-1">{text}</p>
    </div>
  );
}

function ProfileItem({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <dt className="eyebrow">{label}</dt>

      <dd className="mt-2 leading-6">
        {value}
      </dd>
    </div>
  );
}

function TagSection({
  title,
  items,
  highlighted = false,
}: {
  title: string;
  items: string[];
  highlighted?: boolean;
}) {
  return (
    <div className="mt-8">
      <p className="eyebrow">{title}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={
              highlighted
                ? "rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"
                : "rounded-full border border-gray-200 px-4 py-2 text-sm"
            }
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}