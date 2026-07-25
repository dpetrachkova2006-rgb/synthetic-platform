"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

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

type AnalyzeResponse = {
  result?: GuideAnalysis;
  error?: string;
};

type ImproveResponse = {
  improvedGuide?: string;
  error?: string;
};

type SimulationGuideVersion = "original" | "improved";
type SimulationCount = 3 | 5;

export default function GuideTestPage() {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState("");
  const [guide, setGuide] = useState("");

  const [analysis, setAnalysis] = useState<GuideAnalysis | null>(null);
  const [improvedGuide, setImprovedGuide] = useState("");

  const [showSimulationSetup, setShowSimulationSetup] = useState(false);
  const [simulationCount, setSimulationCount] =
    useState<SimulationCount>(3);
  const [simulationGuide, setSimulationGuide] =
    useState<SimulationGuideVersion>("original");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setAnalysis(null);
    setImprovedGuide("");
    setShowSimulationSetup(false);
    setSimulationCount(3);
    setSimulationGuide("original");

    if (!topic.trim() || !audience.trim() || !goal.trim() || !guide.trim()) {
      setError(
        "Заполните тему, целевую аудиторию, цель исследования и текст гайда."
      );
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/test-guide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "analyze",
          title,
          topic,
          audience,
          goal,
          guide,
        }),
      });

      const data = (await response.json()) as AnalyzeResponse;

      if (!response.ok || !data.result) {
        throw new Error(data.error || "Не удалось провести тестирование гайда.");
      }

      setAnalysis(data.result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Неизвестная ошибка тестирования гайда."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleImproveGuide() {
    if (!analysis || isImproving) {
      return;
    }

    setError("");
    setIsImproving(true);

    try {
      const response = await fetch("/api/test-guide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "improve",
          title,
          topic,
          audience,
          goal,
          guide,
          analysis,
        }),
      });

      const data = (await response.json()) as ImproveResponse;

      if (!response.ok || !data.improvedGuide) {
        throw new Error(
          data.error || "Не удалось сформировать улучшенный вариант гайда."
        );
      }

      setImprovedGuide(data.improvedGuide);
      setSimulationGuide("improved");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Неизвестная ошибка улучшения гайда."
      );
    } finally {
      setIsImproving(false);
    }
  }

  function handleOpenSimulation() {
    setShowSimulationSetup(true);

    if (improvedGuide) {
      setSimulationGuide("improved");
    } else {
      setSimulationGuide("original");
    }
  }

  function handleStartSimulation() {
    const selectedGuide =
      simulationGuide === "improved" && improvedGuide
        ? improvedGuide
        : guide;

    console.log("Данные для тестирования на синтетической выборке:", {
      title,
      topic,
      audience,
      goal,
      respondentCount: simulationCount,
      guideVersion: simulationGuide,
      guide: selectedGuide,
    });

    alert(
      `Настройки готовы: ${simulationCount} респондента. На следующем шаге подключим API симуляции интервью.`
    );
  }

  function resetResults() {
    setAnalysis(null);
    setImprovedGuide("");
    setShowSimulationSetup(false);
    setSimulationCount(3);
    setSimulationGuide("original");
    setError("");
  }

  return (
    <main className="min-h-screen bg-gray-100 px-5 py-8 sm:px-10 lg:px-16">
      <section className="site-surface mx-auto w-full max-w-[1380px] overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-5 sm:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-blue-600" />

            <span className="text-sm font-black tracking-[-0.03em]">
              SYNTHETIC PLATFORM
            </span>
          </Link>

          <span className="eyebrow">GUIDE TESTING</span>
        </header>

        <div className="grid lg:grid-cols-[0.84fr_1.16fr]">
          <section className="border-b border-gray-200 bg-white p-8 sm:p-12 lg:border-b-0 lg:border-r lg:p-14">
            <p className="eyebrow">Инструмент для исследователей</p>

            <h1 className="mt-7 text-[42px] font-black leading-[0.96] tracking-[-0.055em] sm:text-[58px]">
              Тестирование
              <br />
              <span className="text-blue-600">гайда</span>
            </h1>

            <p className="mt-7 max-w-[620px] text-lg leading-8 text-gray-700">
              Проверьте гайд глубинного интервью до выхода в поле. Сначала
              платформа проведёт компактный методологический анализ. Улучшенная
              версия создаётся отдельно — только по вашему запросу.
            </p>

            <form onSubmit={handleAnalyze} className="mt-10 space-y-6">
              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Название исследования
                </span>

                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full border border-gray-300 bg-white px-4 py-4 outline-none transition focus:border-blue-600"
                  placeholder="Например, опыт использования городских сервисов"
                  maxLength={180}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Тема исследования *
                </span>

                <input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  className="w-full border border-gray-300 bg-white px-4 py-4 outline-none transition focus:border-blue-600"
                  placeholder="Что именно вы исследуете?"
                  maxLength={500}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Целевая аудитория *
                </span>

                <input
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  className="w-full border border-gray-300 bg-white px-4 py-4 outline-none transition focus:border-blue-600"
                  placeholder="Кого планируете интервьюировать?"
                  maxLength={500}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Цель исследования *
                </span>

                <textarea
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  className="min-h-28 w-full resize-y border border-gray-300 bg-white px-4 py-4 outline-none transition focus:border-blue-600"
                  placeholder="Какой результат должно дать интервью?"
                  maxLength={1500}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Текст гайда *
                </span>

                <textarea
                  value={guide}
                  onChange={(event) => setGuide(event.target.value)}
                  className="min-h-[360px] w-full resize-y border border-gray-300 bg-white px-4 py-4 font-mono text-sm leading-7 outline-none transition focus:border-blue-600"
                  placeholder={
                    "Вставьте сюда вопросы и блоки гайда...\n\nБлок 1. Знакомство\n1. Расскажите немного о себе..."
                  }
                  maxLength={16000}
                />

                <div className="mt-2 flex justify-between gap-4 text-xs text-gray-400">
                  <span>
                    Для первого теста лучше использовать гайд до 16 000
                    символов.
                  </span>

                  <span className="shrink-0">
                    {guide.length} / 16 000
                  </span>
                </div>
              </label>

              {error && (
                <div className="border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isAnalyzing || isImproving}
                className="app-button min-h-16 w-full px-7 text-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAnalyzing
                  ? "Тестируем гайд..."
                  : "Провести тестирование →"}
              </button>
            </form>
          </section>

          <aside className="bg-gray-100 p-8 sm:p-12 lg:p-14">
            {!analysis && !isAnalyzing && (
              <div className="flex min-h-[620px] flex-col justify-between">
                <div>
                  <p className="eyebrow">Что будет проверено</p>

                  <div className="mt-8 space-y-4">
                    {[
                      "Понятность и однозначность формулировок",
                      "Наводящие и социально желательные вопросы",
                      "Логика блоков и переходов",
                      "Дублирование и вопросы «два в одном»",
                      "Недостающие уточнения и темы",
                      "Ожидаемая длительность интервью",
                    ].map((item, index) => (
                      <div
                        key={item}
                        className="editorial-card flex items-start gap-4 p-5"
                      >
                        <span className="font-black text-blue-600">
                          0{index + 1}
                        </span>

                        <p className="leading-7 text-gray-700">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-10 border-t border-gray-300 pt-6 text-sm leading-6 text-gray-500">
                  На первом этапе платформа не переписывает весь документ. Это
                  снижает нагрузку на модель и позволяет получить анализ даже
                  для объёмных гайдов.
                </p>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex min-h-[620px] flex-col items-center justify-center text-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />

                <h2 className="mt-8 text-3xl font-black tracking-[-0.04em]">
                  Тестируем гайд
                </h2>

                <div className="mt-6 space-y-2 text-gray-600">
                  <p>Анализируем структуру и последовательность...</p>
                  <p>Проверяем формулировки вопросов...</p>
                  <p>Готовим компактные рекомендации...</p>
                </div>
              </div>
            )}

            {analysis && !isAnalyzing && (
              <div className="space-y-8">
                <section className="editorial-card p-7">
                  <p className="eyebrow">Общая оценка</p>

                  <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.045em]">
                    {analysis.status}
                  </h2>

                  <p className="mt-5 leading-7 text-gray-700">
                    {analysis.summary}
                  </p>

                  <p className="mt-5 text-sm font-bold text-blue-600">
                    Ожидаемая длительность: {analysis.estimatedDuration}
                  </p>
                </section>

                {analysis.strengths.length > 0 && (
                  <section>
                    <p className="eyebrow">Сильные стороны</p>

                    <div className="mt-4 space-y-3">
                      {analysis.strengths.map((item) => (
                        <div
                          key={item}
                          className="editorial-card p-5 leading-7"
                        >
                          ✓ {item}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {analysis.keyIssues.length > 0 && (
                  <section>
                    <p className="eyebrow">Основные проблемы</p>

                    <div className="mt-4 space-y-3">
                      {analysis.keyIssues.map((item) => (
                        <div
                          key={item}
                          className="border border-amber-200 bg-amber-50 p-5 leading-7"
                        >
                          ⚠ {item}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {analysis.questionAnalysis.length > 0 && (
                  <section>
                    <p className="eyebrow">Разбор вопросов</p>

                    <div className="mt-4 space-y-4">
                      {analysis.questionAnalysis.map((item, index) => (
                        <article
                          key={`${item.question}-${index}`}
                          className="editorial-card p-6"
                        >
                          <div className="flex items-start justify-between gap-5">
                            <p className="font-black">Проблемный вопрос</p>

                            <span className="app-badge">{item.severity}</span>
                          </div>

                          <p className="mt-4 font-bold leading-7">
                            {item.question}
                          </p>

                          <p className="mt-4 leading-7 text-gray-600">
                            <strong>Проблема:</strong> {item.problem}
                          </p>

                          <p className="mt-3 leading-7 text-gray-600">
                            <strong>Рекомендация:</strong> {item.recommendation}
                          </p>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {analysis.missingTopics.length > 0 && (
                  <section>
                    <p className="eyebrow">Чего не хватает</p>

                    <div className="editorial-card mt-4 p-6">
                      <ul className="space-y-3 leading-7 text-gray-700">
                        {analysis.missingTopics.map((item) => (
                          <li key={item}>— {item}</li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}

                <section className="border-t border-gray-300 pt-8">
                  <p className="eyebrow">Что сделать дальше</p>

                  <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                    Выберите следующий этап работы
                  </h3>

                  <p className="mt-4 leading-7 text-gray-600">
                    Создайте улучшенную версию гайда или проверьте, как его
                    вопросы воспринимает синтетическая выборка.
                  </p>

                  <div className="mt-7 grid gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleImproveGuide}
                      disabled={isImproving || Boolean(improvedGuide)}
                      className="app-button min-h-16 px-5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isImproving
                        ? "Формируем улучшенный гайд..."
                        : improvedGuide
                          ? "Улучшенный гайд создан"
                          : "Создать улучшенный гайд →"}
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenSimulation}
                      disabled={isImproving}
                      className="app-button-dark min-h-16 px-5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Тестирование на синтетической выборке →
                    </button>
                  </div>
                </section>

                {showSimulationSetup && (
                  <section className="border-t border-gray-300 pt-8">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="eyebrow">
                          Тестирование на синтетической выборке
                        </p>

                        <h3 className="mt-4 text-3xl font-black tracking-[-0.045em]">
                          Проведите пробное исследование
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowSimulationSetup(false)}
                        className="shrink-0 text-sm font-bold text-gray-500 transition hover:text-gray-900"
                      >
                        Закрыть
                      </button>
                    </div>

                    <p className="mt-4 leading-7 text-gray-600">
                      Платформа создаст временную синтетическую выборку под
                      целевую аудиторию исследования и проведёт интервью по
                      вашему гайду.
                    </p>

                    <div className="mt-8">
                      <p className="text-sm font-black">
                        Количество респондентов
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSimulationCount(3)}
                          className={
                            simulationCount === 3
                              ? "min-h-14 border border-blue-600 bg-blue-600 px-5 font-black text-white"
                              : "min-h-14 border border-gray-300 bg-white px-5 font-black text-gray-700 transition hover:border-blue-600"
                          }
                        >
                          3 респондента
                        </button>

                        <button
                          type="button"
                          onClick={() => setSimulationCount(5)}
                          className={
                            simulationCount === 5
                              ? "min-h-14 border border-blue-600 bg-blue-600 px-5 font-black text-white"
                              : "min-h-14 border border-gray-300 bg-white px-5 font-black text-gray-700 transition hover:border-blue-600"
                          }
                        >
                          5 респондентов
                        </button>
                      </div>
                    </div>

                    {improvedGuide && (
                      <div className="mt-8">
                        <p className="text-sm font-black">
                          Какой гайд протестировать?
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <label
                            className={
                              simulationGuide === "original"
                                ? "flex cursor-pointer items-center gap-3 border border-blue-600 bg-blue-50 p-4"
                                : "flex cursor-pointer items-center gap-3 border border-gray-300 bg-white p-4"
                            }
                          >
                            <input
                              type="radio"
                              name="simulation-guide"
                              value="original"
                              checked={simulationGuide === "original"}
                              onChange={() =>
                                setSimulationGuide("original")
                              }
                            />

                            <span className="font-bold">Исходный гайд</span>
                          </label>

                          <label
                            className={
                              simulationGuide === "improved"
                                ? "flex cursor-pointer items-center gap-3 border border-blue-600 bg-blue-50 p-4"
                                : "flex cursor-pointer items-center gap-3 border border-gray-300 bg-white p-4"
                            }
                          >
                            <input
                              type="radio"
                              name="simulation-guide"
                              value="improved"
                              checked={simulationGuide === "improved"}
                              onChange={() =>
                                setSimulationGuide("improved")
                              }
                            />

                            <span className="font-bold">Улучшенный гайд</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {!improvedGuide && (
                      <div className="mt-8 border border-gray-300 bg-white p-5">
                        <p className="text-sm font-black">
                          Будет протестирован исходный гайд
                        </p>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                          Улучшенная версия пока не создана, поэтому платформа
                          будет использовать текст, добавленный в форму.
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleStartSimulation}
                      className="app-button-dark mt-8 min-h-16 w-full px-6"
                    >
                      Начать тестирование →
                    </button>
                  </section>
                )}

                {improvedGuide && (
                  <section>
                    <p className="eyebrow">Улучшенный вариант гайда</p>

                    <pre className="mt-4 whitespace-pre-wrap border border-gray-300 bg-white p-6 font-sans text-sm leading-7 text-gray-800">
                      {improvedGuide}
                    </pre>
                  </section>
                )}

                <button
                  type="button"
                  onClick={resetResults}
                  className="app-button-dark min-h-14 w-full px-6"
                >
                  Проверить другой гайд
                </button>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}