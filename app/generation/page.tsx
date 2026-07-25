"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { generateRespondentsWithAI } from "../lib/syntheticGenerator";
import { savePopulation } from "../lib/populationStorage";

const MIN_SAMPLE_SIZE = 1;
const MAX_SAMPLE_SIZE = 10_000;
const DEFAULT_SAMPLE_SIZE = 1_000;

const GENERATION_STAGES = [
  {
    title: "Анализ параметров исследования",
    description: "Проверяем тему, вопрос и настройки выборки",
    startProgress: 0,
  },
  {
    title: "Подготовка структуры популяции",
    description: "Формируем возрастные и гендерные параметры",
    startProgress: 18,
  },
  {
    title: "Генерация профилей респондентов",
    description: "Создаём индивидуальные социальные характеристики",
    startProgress: 35,
  },
  {
    title: "Формирование синтетической выборки",
    description: "Объединяем респондентов в исследовательскую популяцию",
    startProgress: 55,
  },
  {
    title: "Проверка целостности данных",
    description: "Проверяем объём и структуру сформированной выборки",
    startProgress: 75,
  },
  {
    title: "Сохранение исследования",
    description: "Подготавливаем данные для карты и дальнейшего анализа",
    startProgress: 90,
  },
];

function getCurrentStageIndex(progress: number) {
  let currentIndex = 0;

  for (let index = 0; index < GENERATION_STAGES.length; index += 1) {
    if (progress >= GENERATION_STAGES[index].startProgress) {
      currentIndex = index;
    }
  }

  return currentIndex;
}

export default function GenerationPage() {
  const [progress, setProgress] = useState(0);
  const [generated, setGenerated] = useState(false);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [size, setSize] = useState(DEFAULT_SAMPLE_SIZE);
  const [gender, setGender] = useState("Все");
  const [age, setAge] = useState("Все");

  useEffect(() => {
    setTopic(localStorage.getItem("research_topic") || "");
    setQuestion(localStorage.getItem("research_question") || "");
  }, []);

  const currentStageIndex = useMemo(() => {
    if (generated) {
      return GENERATION_STAGES.length - 1;
    }

    return getCurrentStageIndex(progress);
  }, [generated, progress]);

  const processedRespondents = useMemo(() => {
    if (generated) {
      return size;
    }

    const calculatedValue = Math.round((size * progress) / 100);

    return Math.min(size, Math.max(0, calculatedValue));
  }, [generated, progress, size]);

  function normalizeSampleSize(value: number) {
    if (!Number.isFinite(value)) {
      return MIN_SAMPLE_SIZE;
    }

    return Math.max(
      MIN_SAMPLE_SIZE,
      Math.min(MAX_SAMPLE_SIZE, Math.round(value))
    );
  }

  function handleSizeChange(value: string) {
    if (value === "") {
      setSize(MIN_SAMPLE_SIZE);
      return;
    }

    setSize(normalizeSampleSize(Number(value)));
  }

  async function startGeneration() {
    if (loading) {
      return;
    }

    const normalizedSize = normalizeSampleSize(size);

    setSize(normalizedSize);
    setStarted(true);
    setLoading(true);
    setGenerated(false);
    setError("");
    setProgress(4);

    const timer = window.setInterval(() => {
      setProgress((currentProgress) => {
        if (currentProgress >= 92) {
          return 92;
        }

        if (currentProgress < 30) {
          return Math.min(92, currentProgress + 4);
        }

        if (currentProgress < 65) {
          return Math.min(92, currentProgress + 3);
        }

        return Math.min(92, currentProgress + 1);
      });
    }, 420);

    try {
      const population = await generateRespondentsWithAI(
        normalizedSize,
        topic,
        question,
        {
          gender,
          age,
        }
      );

      localStorage.setItem(
  "research_gender",
  gender
);

localStorage.setItem(
  "research_age",
  age
);

localStorage.setItem(
  "research_sample_size",
  String(normalizedSize)
);

savePopulation(population);

setProgress(100);
setGenerated(true);
    } catch (generationError) {
      console.error(generationError);

      setError(
        generationError instanceof Error
          ? generationError.message
          : "Не удалось создать респондентов"
      );

      setStarted(false);
      setProgress(0);
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 sm:px-10 sm:py-12 lg:px-16">
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          fixed
          inset-0
          z-0
          opacity-[0.16]
          mix-blend-multiply
        "
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
          backgroundSize: "9px 9px, 13px 13px, 17px 17px",
        }}
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          fixed
          -bottom-52
          -left-32
          z-0
          h-[560px]
          w-[560px]
          rounded-full
          bg-blue-600/10
          blur-[140px]
        "
      />

      <section
        className="
          site-surface
          relative
          z-10
          mx-auto
          min-h-[calc(100vh-64px)]
          w-full
          max-w-[1380px]
          overflow-hidden
        "
      >
        <header
          className="
            flex
            items-center
            justify-between
            border-b
            border-gray-200
            px-6
            py-5
            sm:px-10
          "
        >
          <Link href="/" className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-blue-600" />

            <span className="text-sm font-black tracking-[-0.03em]">
              SYNTHETIC PLATFORM
            </span>
          </Link>

          <span className="eyebrow">03 / GENERATION</span>
        </header>

        <div
          className="
            grid
            min-h-[calc(100vh-137px)]
            lg:grid-cols-[0.88fr_1.12fr]
          "
        >
          <section
            className="
              relative
              flex
              flex-col
              justify-between
              overflow-hidden
              border-b
              border-gray-200
              bg-gray-100
              p-8
              sm:p-12
              lg:border-b-0
              lg:border-r
              lg:p-16
            "
          >
            <div className="relative z-10">
              <p className="eyebrow">Настройка популяции</p>

              <h1
                className="
                  mt-8
                  max-w-full
                  text-[34px]
                  font-black
                  leading-[0.97]
                  tracking-[-0.05em]
                  text-black
                  sm:text-[43px]
                  lg:text-[47px]
                  xl:text-[53px]
                "
              >
                Создание
                <br />
                синтетического
                <br />
                <span className="text-blue-600">исследования</span>
              </h1>

              <p
                className="
                  mt-8
                  max-w-[480px]
                  text-lg
                  leading-8
                  text-gray-700
                "
              >
                Настройте размер и характеристики выборки. После запуска
                платформа сформирует синтетическую популяцию и подготовит
                данные для дальнейшего исследования.
              </p>
            </div>

            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -bottom-16
                -right-4
                select-none
                text-[180px]
                font-black
                leading-none
                tracking-[-0.1em]
                text-blue-600/[0.07]
                sm:text-[250px]
              "
            >
              03
            </div>

            <div className="relative z-10 mt-16">
              <div className="editorial-rule" />

              <div className="mt-7 space-y-6">
                <div>
                  <p className="eyebrow">Тема</p>

                  <p
                    className="
                      mt-2
                      max-w-[460px]
                      text-xl
                      font-black
                      leading-snug
                      tracking-[-0.035em]
                    "
                  >
                    {topic || "Тема пока не указана"}
                  </p>
                </div>

                <div>
                  <p className="eyebrow">Главный вопрос</p>

                  <p className="mt-2 max-w-[460px] leading-7 text-gray-700">
                    {question || "Исследовательский вопрос пока не указан"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            className="
              flex
              items-center
              bg-white
              p-8
              sm:p-12
              lg:p-16
              xl:p-20
            "
          >
            <div className="w-full">
              {!started ? (
                <>
                  <div className="mb-10 flex items-end justify-between gap-6">
                    <div>
                      <p className="eyebrow">Параметры выборки</p>

                      <h2
                        className="
                          mt-3
                          text-3xl
                          font-black
                          tracking-[-0.045em]
                          sm:text-4xl
                        "
                      >
                        Настройте респондентов
                      </h2>
                    </div>

                    <div
                      className="
                        hidden
                        h-14
                        w-14
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-blue-600
                        text-xl
                        font-black
                        text-white
                        sm:flex
                      "
                    >
                      ↘
                    </div>
                  </div>

                  <div className="space-y-7">
                    <div>
                      <label
                        htmlFor="sample-size"
                        className="
                          block
                          text-sm
                          font-black
                          uppercase
                          tracking-[0.08em]
                          text-black
                        "
                      >
                        Размер выборки
                      </label>

                      <input
                        id="sample-size"
                        type="number"
                        min={MIN_SAMPLE_SIZE}
                        max={MAX_SAMPLE_SIZE}
                        step={1}
                        value={size}
                        onChange={(event) =>
                          handleSizeChange(event.target.value)
                        }
                        onBlur={() =>
                          setSize(normalizeSampleSize(size))
                        }
                        className="app-input mt-3"
                      />

                      <div
                        className="
                          mt-3
                          flex
                          flex-wrap
                          items-center
                          justify-between
                          gap-3
                        "
                      >
                        <p className="text-sm text-gray-500">
                          От 1 до 10 000 синтетических респондентов
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {[100, 500, 1000, 5000, 10000].map(
                            (presetSize) => (
                              <button
                                key={presetSize}
                                type="button"
                                onClick={() => setSize(presetSize)}
                                className={`
                                  rounded-full
                                  border
                                  px-3
                                  py-1.5
                                  text-xs
                                  font-black
                                  transition
                                  ${
                                    size === presetSize
                                      ? "border-blue-600 bg-blue-600 text-white"
                                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-600 hover:text-blue-600"
                                  }
                                `}
                              >
                                {presetSize.toLocaleString("ru-RU")}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-7 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="respondent-age"
                          className="
                            block
                            text-sm
                            font-black
                            uppercase
                            tracking-[0.08em]
                            text-black
                          "
                        >
                          Возраст
                        </label>

                        <select
                          id="respondent-age"
                          value={age}
                          onChange={(event) => setAge(event.target.value)}
                          className="app-input mt-3"
                        >
                          <option value="Все">Все возрасты</option>
                          <option value="18-25">18–25 лет</option>
                          <option value="26-35">26–35 лет</option>
                          <option value="36-45">36–45 лет</option>
                          <option value="46+">46 лет и старше</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="respondent-gender"
                          className="
                            block
                            text-sm
                            font-black
                            uppercase
                            tracking-[0.08em]
                            text-black
                          "
                        >
                          Пол
                        </label>

                        <select
                          id="respondent-gender"
                          value={gender}
                          onChange={(event) => setGender(event.target.value)}
                          className="app-input mt-3"
                        >
                          <option value="Все">Все</option>
                          <option value="Женщины">Женщины</option>
                          <option value="Мужчины">Мужчины</option>
                        </select>
                      </div>
                    </div>

                    <div
                      className="
                        grid
                        gap-px
                        overflow-hidden
                        rounded-[18px]
                        border
                        border-gray-200
                        bg-gray-200
                        sm:grid-cols-3
                      "
                    >
                      <div className="bg-gray-50 p-5">
                        <p className="eyebrow">Выборка</p>

                        <p className="mt-2 text-xl font-black">
                          {size.toLocaleString("ru-RU")}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-5">
                        <p className="eyebrow">Возраст</p>

                        <p className="mt-2 text-xl font-black">
                          {age === "Все" ? "Все возрасты" : age}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-5">
                        <p className="eyebrow">Пол</p>

                        <p className="mt-2 text-xl font-black">{gender}</p>
                      </div>
                    </div>

                    {size >= 5000 && (
                      <div
                        className="
                          rounded-[16px]
                          border
                          border-blue-200
                          bg-blue-50
                          p-5
                          text-sm
                          leading-6
                          text-blue-900
                        "
                      >
                        Большая выборка может генерироваться дольше. На карте
                        будет отображаться только часть точек, однако весь
                        объём респондентов будет учитываться при анализе.
                      </div>
                    )}

                    {error && (
                      <div
                        className="
                          rounded-[16px]
                          border
                          border-red-200
                          bg-red-50
                          p-5
                          leading-7
                          text-red-700
                        "
                      >
                        {error}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={startGeneration}
                      disabled={loading}
                      className="
                        app-button
                        min-h-16
                        w-full
                        px-6
                        text-lg
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      Создать исследование →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="eyebrow">
                        {generated
                          ? "Исследование завершено"
                          : "Исследовательский процесс"}
                      </p>

                      <h2
                        className="
                          mt-3
                          text-3xl
                          font-black
                          leading-tight
                          tracking-[-0.045em]
                          sm:text-4xl
                        "
                      >
                        {generated
                          ? "Популяция готова"
                          : "Формируем исследование"}
                      </h2>
                    </div>

                    <div
                      className={`
                        flex
                        h-14
                        w-14
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        text-xl
                        font-black
                        text-white
                        transition-colors
                        duration-500
                        ${generated ? "bg-black" : "bg-blue-600"}
                      `}
                    >
                      {generated ? "✓" : "↘"}
                    </div>
                  </div>

                  <div
                    className="
                      mt-8
                      grid
                      gap-px
                      overflow-hidden
                      rounded-[18px]
                      border
                      border-gray-200
                      bg-gray-200
                      sm:grid-cols-3
                    "
                  >
                    <div className="bg-gray-50 p-5">
                      <p className="eyebrow">Создано</p>

                      <p
                        className="
                          mt-2
                          text-2xl
                          font-black
                          tracking-[-0.04em]
                        "
                      >
                        {processedRespondents.toLocaleString("ru-RU")}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        из {size.toLocaleString("ru-RU")}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-5">
                      <p className="eyebrow">Прогресс</p>

                      <p
                        className="
                          mt-2
                          text-2xl
                          font-black
                          tracking-[-0.04em]
                          text-blue-600
                        "
                      >
                        {progress}%
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        выполнения
                      </p>
                    </div>

                    <div className="bg-gray-50 p-5">
                      <p className="eyebrow">Статус</p>

                      <p
                        className="
                          mt-2
                          text-lg
                          font-black
                          tracking-[-0.03em]
                        "
                      >
                        {generated ? "Готово" : "В процессе"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {generated ? "Данные сохранены" : "ИИ работает"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 space-y-3">
                    {GENERATION_STAGES.map((stage, index) => {
                      const isCompleted =
                        generated || index < currentStageIndex;

                      const isActive =
                        !generated && index === currentStageIndex;

                      return (
                        <div
                          key={stage.title}
                          className={`
                            flex
                            items-start
                            gap-4
                            rounded-[16px]
                            border
                            p-4
                            transition-all
                            duration-500
                            ${
                              isActive
                                ? "border-blue-200 bg-blue-50"
                                : isCompleted
                                  ? "border-gray-200 bg-gray-50"
                                  : "border-gray-100 bg-white"
                            }
                          `}
                        >
                          <div
                            className={`
                              mt-0.5
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                              text-sm
                              font-black
                              transition-all
                              duration-500
                              ${
                                isCompleted
                                  ? "bg-black text-white"
                                  : isActive
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-400"
                              }
                            `}
                          >
                            {isCompleted ? (
                              "✓"
                            ) : isActive ? (
                              <span
                                className="
                                  h-2.5
                                  w-2.5
                                  animate-pulse
                                  rounded-full
                                  bg-white
                                "
                              />
                            ) : (
                              String(index + 1).padStart(2, "0")
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p
                                className={`
                                  font-black
                                  tracking-[-0.025em]
                                  ${
                                    isActive
                                      ? "text-blue-700"
                                      : isCompleted
                                        ? "text-black"
                                        : "text-gray-400"
                                  }
                                `}
                              >
                                {stage.title}
                              </p>

                              {isActive && (
                                <span
                                  className="
                                    rounded-full
                                    bg-blue-600
                                    px-3
                                    py-1
                                    text-[10px]
                                    font-black
                                    uppercase
                                    tracking-[0.08em]
                                    text-white
                                  "
                                >
                                  Выполняется
                                </span>
                              )}

                              {isCompleted && !isActive && (
                                <span
                                  className="
                                    text-[10px]
                                    font-black
                                    uppercase
                                    tracking-[0.08em]
                                    text-gray-400
                                  "
                                >
                                  Завершено
                                </span>
                              )}
                            </div>

                            <p
                              className={`
                                mt-1
                                text-sm
                                leading-6
                                ${
                                  isActive || isCompleted
                                    ? "text-gray-600"
                                    : "text-gray-400"
                                }
                              `}
                            >
                              {stage.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8">
                    <div className="flex items-end justify-between gap-6">
                      <div>
                        <p className="eyebrow">
                          {generated
                            ? "Исследование сформировано"
                            : "Текущая операция"}
                        </p>

                        <p
                          className="
                            mt-2
                            text-lg
                            font-black
                            tracking-[-0.03em]
                          "
                        >
                          {generated
                            ? `${size.toLocaleString("ru-RU")} респондентов готовы`
                            : GENERATION_STAGES[currentStageIndex].title}
                        </p>
                      </div>

                      <p className="text-right text-sm leading-6 text-gray-500">
                        {progress}%
                      </p>
                    </div>

                    <div
                      className="
                        mt-5
                        h-3
                        overflow-hidden
                        rounded-full
                        bg-blue-100
                      "
                    >
                      <div
                        className="
                          h-full
                          rounded-full
                          bg-blue-600
                          transition-all
                          duration-500
                        "
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {loading && !generated && (
                    <div
                      className="
                        mt-6
                        flex
                        items-center
                        gap-3
                        border-t
                        border-gray-200
                        pt-6
                        text-sm
                        text-gray-500
                      "
                    >
                      <span
                        className="
                          h-2.5
                          w-2.5
                          animate-pulse
                          rounded-full
                          bg-blue-600
                        "
                      />

                      <span>
                        Обработано{" "}
                        <strong className="text-black">
                          {processedRespondents.toLocaleString("ru-RU")}
                        </strong>{" "}
                        из {size.toLocaleString("ru-RU")} профилей
                      </span>
                    </div>
                  )}

                  {generated && (
                    <div
                      className="
                        mt-8
                        rounded-[18px]
                        border
                        border-blue-200
                        bg-blue-50
                        p-6
                      "
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            bg-blue-600
                            font-black
                            text-white
                          "
                        >
                          ✓
                        </div>

                        <div>
                          <p className="text-lg font-black">
                            Исследование успешно создано
                          </p>

                          <p className="mt-2 leading-7 text-blue-900">
                            Сформирована синтетическая популяция из{" "}
                            {size.toLocaleString("ru-RU")} респондентов.
                            Данные сохранены и готовы к просмотру на карте.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {generated && (
                    <Link
                      href="/map"
                      className="
                        app-button
                        mt-8
                        min-h-16
                        w-full
                        px-6
                        text-lg
                      "
                    >
                      Открыть исследование →
                    </Link>
                  )}
                </>
              )}

              <div
                className="
                  mt-10
                  flex
                  items-center
                  gap-4
                  text-sm
                  text-gray-500
                "
              >
                <span className="h-px flex-1 bg-gray-200" />
                <span>03 / 03</span>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}