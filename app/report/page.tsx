"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getPopulation } from "../lib/populationStorage";

import type {
  AIReportMeta,
  AIResearchReport,
  OpinionDistribution,
} from "../lib/reportGenerator";

type StoredReport = {
  report: AIResearchReport;
  meta: AIReportMeta;
  topic?: string;
  question?: string;
  opinionDistribution?: OpinionDistribution | null;
};

type PopulationItem = {
  id?: number;
  name?: string;
  age?: number;
  city?: string;
  region?: string;
  gender?: string;
  education?: string;
  employment?: string;
  income?: string;
  familyStatus?: string;
  settlementType?: string;
  awareness?: string;
  confidence?: string;
  opinion?: string;
  answer?: string | null;
};

type DistributionItem = {
  name: string;
  count: number;
  percent: number;
};

const REPORT_STORAGE_KEY = "latest_ai_research_report";

export default function ReportPage() {
  const [data, setData] =
    useState<StoredReport | null>(null);

  const [population, setPopulation] =
    useState<PopulationItem[]>([]);

  const [topic, setTopic] = useState("");
  const [question, setQuestion] =
    useState("");

  const [isLoaded, setIsLoaded] =
    useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(
        REPORT_STORAGE_KEY
      );

      const storedTopic =
        localStorage.getItem(
          "research_topic"
        ) || "";

      const storedQuestion =
        localStorage.getItem(
          "research_question"
        ) || "";

      const storedPopulation =
        getPopulation();

      setPopulation(
        Array.isArray(storedPopulation)
          ? (storedPopulation as PopulationItem[])
          : []
      );

      setTopic(storedTopic);
      setQuestion(storedQuestion);

      if (raw) {
        const parsed =
          JSON.parse(raw) as StoredReport;

        setData(parsed);

        if (
          typeof parsed.topic === "string" &&
          parsed.topic.trim()
        ) {
          setTopic(parsed.topic);
        }

        if (
          typeof parsed.question === "string" &&
          parsed.question.trim()
        ) {
          setQuestion(parsed.question);
        }
      }
    } catch (error) {
      console.error(
        "Не удалось открыть сохранённый отчёт:",
        error
      );
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const calculatedOpinionDistribution =
    useMemo(
      () =>
        calculateOpinionDistribution(
          population
        ),
      [population]
    );

  const opinionDistribution =
    data?.opinionDistribution ||
    calculatedOpinionDistribution;

  const positive =
    (opinionDistribution.fullySupport ??
      0) +
    (opinionDistribution.ratherSupport ??
      0);

  const neutral =
    (opinionDistribution.neutral ?? 0) +
    (opinionDistribution
      .difficultToAnswer ?? 0) +
    (opinionDistribution.refuseToAnswer ??
      0);

  const negative =
    (opinionDistribution.ratherOppose ??
      0) +
    (opinionDistribution.fullyOppose ??
      0);

  const genderDistribution = useMemo(
    () =>
      buildDistribution(
        population.map((person) =>
          normalizeGender(person.gender)
        )
      ),
    [population]
  );

  const ageDistribution = useMemo(
    () =>
      buildDistribution(
        population.map((person) =>
          getAgeGroup(person.age)
        )
      ),
    [population]
  );

  const educationDistribution = useMemo(
    () =>
      buildDistribution(
        population.map(
          (person) =>
            cleanValue(
              person.education,
              "Не указано"
            )
        )
      ),
    [population]
  );

  const incomeDistribution = useMemo(
    () =>
      buildDistribution(
        population.map(
          (person) =>
            cleanValue(
              person.income,
              "Не указано"
            )
        )
      ),
    [population]
  );

  const settlementDistribution =
    useMemo(
      () =>
        buildDistribution(
          population.map(
            (person) =>
              cleanValue(
                person.settlementType,
                "Не указано"
              )
          )
        ),
      [population]
    );

  const regionDistribution = useMemo(
    () =>
      buildDistribution(
        population.map(
          (person) =>
            cleanValue(
              person.region ||
                person.city,
              "Не указано"
            )
        )
      ).slice(0, 8),
    [population]
  );

  const interviewLengths = useMemo(
    () =>
      population
        .map((person) =>
          typeof person.answer === "string"
            ? person.answer.trim().length
            : 0
        )
        .filter((length) => length > 0),
    [population]
  );

  const averageInterviewLength =
    interviewLengths.length > 0
      ? Math.round(
          interviewLengths.reduce(
            (sum, value) => sum + value,
            0
          ) / interviewLengths.length
        )
      : 0;

  const interviewCoverage =
    population.length > 0
      ? Math.round(
          (interviewLengths.length /
            population.length) *
            100
        )
      : 0;

  const polarizationIndex =
    calculatePolarization(
      positive,
      neutral,
      negative
    );

  const consensusIndex =
    Math.max(
      positive,
      neutral,
      negative
    );

  const qualityIndex =
    calculateQualityIndex({
      sampleSize:
        data?.meta.sampleSize ||
        population.length,
      interviewsAnalyzed:
        data?.meta.interviewsAnalyzed ||
        interviewLengths.length,
      interviewCoverage,
      averageInterviewLength,
      demographicGroups:
        [
          genderDistribution,
          ageDistribution,
          educationDistribution,
          incomeDistribution,
          settlementDistribution,
        ].filter(
          (groups) =>
            groups.length > 1
        ).length,
    });

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-5xl rounded-[30px] bg-white p-10 text-lg">
          Загружаем отчёт…
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-100 px-5 py-10 sm:px-10">
        <section className="mx-auto max-w-4xl rounded-[32px] border border-gray-200 bg-white p-10 sm:p-16">
          <p className="eyebrow">
            Аналитический отчёт
          </p>

          <h1 className="mt-5 text-5xl font-black tracking-[-0.06em]">
            Отчёт пока не сформирован
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Вернитесь к карте респондентов и
            нажмите «Сформировать отчёт».
            После завершения анализа он
            появится на этой странице.
          </p>

          <Link
            href="/map"
            className="app-button mt-8 inline-flex"
          >
            Вернуться к результатам →
          </Link>
        </section>
      </main>
    );
  }

  const { report, meta } = data;

  return (
    <main className="report-shell min-h-screen bg-gray-100 px-4 py-6 sm:px-8 sm:py-10">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }

          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .report-shell {
            padding: 0 !important;
            background: white !important;
          }

          .report-document {
            max-width: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .report-cover {
            min-height: 245mm;
            break-after: page;
          }

          .report-section,
          blockquote,
          article,
          .research-card {
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-5 flex max-w-[1240px] items-center justify-between gap-4">
        <Link
          href="/map"
          className="text-sm font-black"
        >
          ← Вернуться к карте
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="app-button min-h-12 px-6"
        >
          Сохранить в PDF
        </button>
      </div>

      <article className="report-document mx-auto max-w-[1240px] overflow-hidden rounded-[34px] border border-gray-200 bg-white shadow-[0_30px_100px_rgba(17,17,17,0.10)]">
        <header className="report-cover relative flex min-h-[820px] flex-col justify-between overflow-hidden bg-black p-8 text-white sm:p-14 lg:p-20">
          <div
            aria-hidden="true"
            className="absolute -right-40 -top-48 h-[650px] w-[650px] rounded-full bg-blue-600/40 blur-[150px]"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-52 -left-36 h-[520px] w-[520px] rounded-full bg-violet-600/25 blur-[160px]"
          />

          <div className="relative flex items-center justify-between gap-6">
            <span className="text-xs font-black uppercase tracking-[0.18em]">
              Synthetic Platform
            </span>

            <span className="text-xs uppercase tracking-[0.12em] text-white/50">
              Исследовательский отчёт
            </span>
          </div>

          <div className="relative max-w-5xl">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-300">
              {report.title ||
                "Аналитический отчёт"}
            </p>

            <h1 className="mt-8 text-[48px] font-black leading-[0.93] tracking-[-0.07em] sm:text-[72px] lg:text-[92px]">
              {topic ||
                "Тема исследования"}
            </h1>

            <p className="mt-9 max-w-4xl text-xl leading-9 text-white/70 sm:text-2xl sm:leading-10">
              {question ||
                "Исследовательский вопрос не указан"}
            </p>
          </div>

          <div className="relative grid gap-px overflow-hidden rounded-[22px] bg-white/15 sm:grid-cols-4">
            <CoverStat
              label="Размер выборки"
              value={formatNumber(
                meta.sampleSize ||
                  population.length
              )}
            />

            <CoverStat
              label="Интервью"
              value={formatNumber(
                meta.interviewsAnalyzed
              )}
            />

            <CoverStat
              label="Поддержка"
              value={`${positive}%`}
            />

            <CoverStat
              label="Дата"
              value={formatDate(
                meta.generatedAt
              )}
            />
          </div>
        </header>

        <div className="p-6 sm:p-10 lg:p-16">
          <section className="report-section">
            <SectionHeader
              number="01"
              eyebrow="Паспорт исследования"
              title="Исследование в цифрах"
              description="Основные показатели выборки, интервью и структуры общественного мнения."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <LargeMetric
                value={formatNumber(
                  meta.sampleSize ||
                    population.length
                )}
                label="респондентов"
                note="Объём синтетической выборки"
                accent
              />

              <LargeMetric
                value={formatNumber(
                  meta.interviewsAnalyzed
                )}
                label="интервью"
                note={`Из ${formatNumber(
                  meta.interviewsReceived
                )} доступных`}
              />

              <LargeMetric
                value={`${qualityIndex}/100`}
                label="качество данных"
                note={getQualityLabel(
                  qualityIndex
                )}
              />

              <LargeMetric
                value={`${polarizationIndex}/100`}
                label="поляризация"
                note={getPolarizationLabel(
                  polarizationIndex
                )}
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-[26px] border border-gray-200 bg-gray-950 p-6 text-white sm:p-8">
              <div className="grid gap-7 lg:grid-cols-[1fr_300px] lg:items-center">
                <div>
                  <div className="flex h-5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="bg-blue-600"
                      style={{
                        width: `${positive}%`,
                      }}
                    />

                    <div
                      className="bg-gray-500"
                      style={{
                        width: `${neutral}%`,
                      }}
                    />

                    <div
                      className="bg-white"
                      style={{
                        width: `${negative}%`,
                      }}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <OpinionMetric
                      label="Поддержка"
                      value={positive}
                      markerClass="bg-blue-600"
                    />

                    <OpinionMetric
                      label="Нейтрально"
                      value={neutral}
                      markerClass="bg-gray-500"
                    />

                    <OpinionMetric
                      label="Неподдержка"
                      value={negative}
                      markerClass="bg-white"
                    />
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/45">
                    Доминирующая позиция
                  </p>

                  <p className="mt-3 text-4xl font-black tracking-[-0.055em] text-blue-300">
                    {consensusIndex}%
                  </p>

                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Доля наиболее крупного
                    блока мнений в выборке.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <ReportSection
            number="01"
            title="Резюме исследования"
            description="Ключевые выводы, которые позволяют быстро понять общую картину."
          >
            <div className="rounded-[28px] bg-blue-50 p-7 sm:p-10">
              <p className="max-w-4xl text-xl font-medium leading-9 tracking-[-0.02em] text-gray-900 sm:text-[25px] sm:leading-[1.55]">
                {report.analyticalOverview ||
                  report.distributionAnalysis}
              </p>
            </div>

            <div className="mt-8">
              <NumberedList
                items={
                  report.briefConclusions
                }
              />
            </div>
          </ReportSection>

          <ReportSection
            number="02"
            title="Структура общественного мнения"
            description="Соотношение поддержки, нейтральных позиций и неподдержки."
          >
            <div className="grid gap-5 lg:grid-cols-3">
              <PositionCard
                title="Поддержка"
                value={positive}
                text="Полностью или скорее поддерживают."
                accent
              />

              <PositionCard
                title="Нейтральная позиция"
                value={neutral}
                text="Нейтральны, затрудняются или отказываются отвечать."
              />

              <PositionCard
                title="Неподдержка"
                value={negative}
                text="Скорее или полностью не поддерживают."
                dark
              />
            </div>

            <div className="mt-8 rounded-[24px] border border-gray-200 p-7 sm:p-9">
              <LongText
                text={
                  report.distributionAnalysis
                }
              />
            </div>
          </ReportSection>

          <ReportSection
            number="03"
            title="Профиль выборки"
            description="Структура синтетической популяции по основным социально-демографическим признакам."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <DistributionCard
                title="Пол"
                items={
                  genderDistribution
                }
              />

              <DistributionCard
                title="Возраст"
                items={ageDistribution}
              />

              <DistributionCard
                title="Образование"
                items={
                  educationDistribution
                }
              />

              <DistributionCard
                title="Доход"
                items={
                  incomeDistribution
                }
              />

              <DistributionCard
                title="Тип населённого пункта"
                items={
                  settlementDistribution
                }
              />

              <DistributionCard
                title="Основные регионы"
                items={
                  regionDistribution
                }
              />
            </div>
          </ReportSection>

          {report.demographicAnalysis
            .length > 0 && (
            <ReportSection
              number="04"
              title="Социально-демографические различия"
              description="Группы, между которыми обнаруживаются наиболее заметные различия."
            >
              <ResearchList
                items={
                  report.demographicAnalysis
                }
              />
            </ReportSection>
          )}

          <ReportSection
            number="05"
            title="Карта аргументов"
            description="Главные объяснения, которыми респонденты обосновывают свои позиции."
          >
            <div className="grid gap-6 lg:grid-cols-3">
              <ArgumentColumn
                title="Аргументы сторонников"
                items={
                  report.supportArguments
                }
                variant="positive"
              />

              <ArgumentColumn
                title="Аргументы противников"
                items={
                  report.opposeArguments
                }
                variant="negative"
              />

              <ArgumentColumn
                title="Нейтральные позиции"
                items={
                  report.neutralArguments
                }
                variant="neutral"
              />
            </div>
          </ReportSection>

          {report.insights.length >
            0 && (
            <ReportSection
              number="06"
              title="Ключевые инсайты"
              description="Наиболее содержательные закономерности и интерпретации."
            >
              <div className="grid gap-5 md:grid-cols-2">
                {report.insights.map(
                  (insight, index) => (
                    <article
                      key={`${insight.title}-${index}`}
                      className="research-card rounded-[24px] border border-gray-200 p-7"
                    >
                      <div className="flex items-start justify-between gap-5">
                        <span className="text-sm font-black text-blue-600">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-blue-700">
                          Уверенность:{" "}
                          {
                            insight.confidence
                          }
                        </span>
                      </div>

                      <h3 className="mt-7 text-2xl font-black leading-tight tracking-[-0.04em]">
                        {insight.title}
                      </h3>

                      <p className="mt-4 text-lg leading-8 text-gray-700">
                        {
                          insight.description
                        }
                      </p>

                      <p className="mt-6 border-t border-gray-200 pt-5 text-sm leading-6 text-gray-500">
                        Основание:{" "}
                        {insight.basis}
                      </p>
                    </article>
                  )
                )}
              </div>
            </ReportSection>
          )}

          {hasTextArray(
            report.unexpectedFindings
          ) && (
            <ReportSection
              number="07"
              title="Неожиданные наблюдения"
              description="Результаты, которые не следуют напрямую из общего распределения мнений."
            >
              <AccentList
                items={
                  report.unexpectedFindings
                }
              />
            </ReportSection>
          )}

          {hasTextArray(
            report.contradictions
          ) && (
            <ReportSection
              number="08"
              title="Противоречия и неоднозначности"
              description="Сочетания установок, которые указывают на сложность и внутреннюю неоднородность мнений."
            >
              <ResearchList
                items={
                  report.contradictions
                }
              />
            </ReportSection>
          )}

          {report.quotes.length > 0 && (
            <ReportSection
              number="09"
              title="Голоса респондентов"
              description="Фрагменты интервью, иллюстрирующие основные позиции."
            >
              <div className="space-y-6">
                {report.quotes.map(
                  (item, index) => (
                    <blockquote
                      key={`${item.quote}-${index}`}
                      className="rounded-[26px] border border-gray-200 bg-gray-50 p-7 sm:p-10"
                    >
                      <span className="text-5xl font-black leading-none text-blue-600">
                        “
                      </span>

                      <p className="mt-3 text-xl leading-9 tracking-[-0.015em] text-gray-800 sm:text-2xl sm:leading-10">
                        {item.quote}
                      </p>

                      <footer className="mt-7 flex flex-col gap-2 border-t border-gray-200 pt-5 text-xs font-black uppercase tracking-[0.07em] text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          {
                            item.respondentDescription
                          }
                        </span>

                        <span className="text-blue-600">
                          {item.opinion}
                        </span>
                      </footer>
                    </blockquote>
                  )
                )}
              </div>
            </ReportSection>
          )}

          {hasTextArray(
            report.researchHypotheses
          ) && (
            <ReportSection
              number="10"
              title="Гипотезы для проверки"
              description="Предположения, которые следует проверить на дополнительных данных."
            >
              <NumberedList
                items={
                  report.researchHypotheses
                }
              />
            </ReportSection>
          )}

          {hasTextArray(
            report.furtherResearch
          ) && (
            <ReportSection
              number="11"
              title="Направления дальнейшего исследования"
              description="Вопросы, требующие дополнительного количественного или качественного анализа."
            >
              <ResearchList
                items={
                  report.furtherResearch
                }
              />
            </ReportSection>
          )}

          <ReportSection
            number="12"
            title="Методология"
            description="Как была сформирована выборка и проведён анализ."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <MethodCard
                number="01"
                label="Описание выборки"
                text={
                  report.methodology
                    .sampleDescription
                }
              />

              <MethodCard
                number="02"
                label="Формирование популяции"
                text={
                  report.methodology
                    .generationMethod
                }
              />

              <MethodCard
                number="03"
                label="Метод анализа"
                text={
                  report.methodology
                    .analysisMethod
                }
              />

              <MethodCard
                number="04"
                label="Основа данных"
                text={
                  report.methodology
                    .dataBasis
                }
              />
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <SmallMetric
                label="Покрытие интервью"
                value={`${interviewCoverage}%`}
              />

              <SmallMetric
                label="Средняя длина"
                value={
                  averageInterviewLength > 0
                    ? `${averageInterviewLength} зн.`
                    : "Нет данных"
                }
              />

              <SmallMetric
                label="Групп профиля"
                value={String(
                  [
                    genderDistribution,
                    ageDistribution,
                    educationDistribution,
                    incomeDistribution,
                    settlementDistribution,
                  ].filter(
                    (groups) =>
                      groups.length > 1
                  ).length
                )}
              />
            </div>
          </ReportSection>

          <ReportSection
            number="13"
            title="Ограничения исследования"
            description="Условия, которые необходимо учитывать при интерпретации результатов."
          >
            <div className="rounded-[26px] bg-gray-950 p-7 text-white sm:p-10">
              <ResearchList
                items={
                  report.limitations
                }
                inverted
              />

              <p className="mt-8 border-t border-white/10 pt-6 text-sm leading-7 text-white/50">
                Результаты отражают
                модельное поведение
                синтетической популяции и не
                заменяют реальное полевое
                исследование.
              </p>
            </div>
          </ReportSection>

          <footer className="mt-20 flex flex-col gap-5 border-t border-black pt-7 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-black text-black">
              Synthetic Platform
            </span>

            <span>
              Проанализировано{" "}
              {meta.interviewsAnalyzed} из{" "}
              {meta.interviewsReceived}{" "}
              доступных интервью
            </span>
          </footer>
        </div>
      </article>
    </main>
  );
}

function SectionHeader({
  number,
  eyebrow,
  title,
  description,
}: {
  number: string;
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="grid gap-5 border-t border-black pt-6 sm:grid-cols-[80px_1fr]">
      <p className="text-sm font-black text-blue-600">
        {number}
      </p>

      <div>
        {eyebrow && (
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-gray-400">
            {eyebrow}
          </p>
        )}

        <h2 className="mt-2 text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
          {title}
        </h2>

        {description && (
          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function ReportSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="report-section mt-20">
      <SectionHeader
        number={number}
        title={title}
        description={description}
      />

      <div className="mt-10">
        {children}
      </div>
    </section>
  );
}

function CoverStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-black/35 p-5 backdrop-blur">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white/45">
        {label}
      </p>

      <p className="mt-2 text-xl font-black">
        {value}
      </p>
    </div>
  );
}

function LargeMetric({
  value,
  label,
  note,
  accent = false,
}: {
  value: string;
  label: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <article className="research-card rounded-[24px] border border-gray-200 p-6">
      <p
        className={`text-[42px] font-black leading-none tracking-[-0.065em] sm:text-[52px] ${
          accent
            ? "text-blue-600"
            : "text-black"
        }`}
      >
        {value}
      </p>

      <p className="mt-4 text-sm font-black uppercase tracking-[0.07em]">
        {label}
      </p>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {note}
      </p>
    </article>
  );
}

function OpinionMetric({
  label,
  value,
  markerClass,
}: {
  label: string;
  value: number;
  markerClass: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${markerClass}`}
        />

        <span className="text-[10px] font-black uppercase tracking-[0.07em] text-white/45">
          {label}
        </span>
      </div>

      <p className="mt-2 text-3xl font-black tracking-[-0.05em]">
        {value}%
      </p>
    </div>
  );
}

function PositionCard({
  title,
  value,
  text,
  accent = false,
  dark = false,
}: {
  title: string;
  value: number;
  text: string;
  accent?: boolean;
  dark?: boolean;
}) {
  return (
    <article
      className={`research-card rounded-[26px] border p-7 ${
        dark
          ? "border-black bg-black text-white"
          : accent
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-gray-200 bg-white text-black"
      }`}
    >
      <p className="text-[64px] font-black leading-none tracking-[-0.075em]">
        {value}%
      </p>

      <h3 className="mt-6 text-xl font-black">
        {title}
      </h3>

      <p
        className={`mt-3 leading-7 ${
          accent || dark
            ? "text-white/65"
            : "text-gray-500"
        }`}
      >
        {text}
      </p>
    </article>
  );
}

function DistributionCard({
  title,
  items,
}: {
  title: string;
  items: DistributionItem[];
}) {
  const visibleItems = items.slice(0, 7);

  return (
    <article className="research-card rounded-[26px] border border-gray-200 p-7">
      <h3 className="text-2xl font-black tracking-[-0.04em]">
        {title}
      </h3>

      {visibleItems.length > 0 ? (
        <div className="mt-7 space-y-5">
          {visibleItems.map((item) => (
            <div key={item.name}>
              <div className="flex items-end justify-between gap-4">
                <p className="text-sm font-bold">
                  {item.name}
                </p>

                <p className="text-sm font-black">
                  {item.percent}%
                </p>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{
                    width: `${item.percent}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-gray-500">
          Недостаточно данных.
        </p>
      )}
    </article>
  );
}

function NumberedList({
  items,
}: {
  items: string[];
}) {
  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className="grid gap-4 border-t border-gray-200 py-7 first:border-t-0 first:pt-0 sm:grid-cols-[70px_1fr]"
        >
          <span className="text-3xl font-black tracking-[-0.05em] text-blue-600">
            {String(index + 1).padStart(
              2,
              "0"
            )}
          </span>

          <p className="max-w-4xl text-xl leading-9 text-gray-800">
            {item}
          </p>
        </div>
      ))}
    </div>
  );
}

function ResearchList({
  items,
  inverted = false,
}: {
  items: string[];
  inverted?: boolean;
}) {
  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className={`grid gap-4 border-t py-6 first:border-t-0 first:pt-0 sm:grid-cols-[34px_1fr] ${
            inverted
              ? "border-white/10"
              : "border-gray-200"
          }`}
        >
          <span
            className={`text-xl font-black ${
              inverted
                ? "text-blue-400"
                : "text-blue-600"
            }`}
          >
            —
          </span>

          <p
            className={`text-lg leading-8 ${
              inverted
                ? "text-white/75"
                : "text-gray-700"
            }`}
          >
            {item}
          </p>
        </div>
      ))}
    </div>
  );
}

function AccentList({
  items,
}: {
  items: string[];
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {items.map((item, index) => (
        <article
          key={`${item}-${index}`}
          className="research-card rounded-[24px] bg-blue-50 p-7"
        >
          <p className="text-sm font-black text-blue-600">
            Наблюдение{" "}
            {String(index + 1).padStart(
              2,
              "0"
            )}
          </p>

          <p className="mt-5 text-xl leading-9 text-gray-800">
            {item}
          </p>
        </article>
      ))}
    </div>
  );
}

function ArgumentColumn({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant:
    | "positive"
    | "negative"
    | "neutral";
}) {
  const headerClass =
    variant === "positive"
      ? "bg-blue-600 text-white"
      : variant === "negative"
        ? "bg-black text-white"
        : "bg-gray-200 text-black";

  return (
    <article className="research-card overflow-hidden rounded-[26px] border border-gray-200">
      <div className={`p-6 ${headerClass}`}>
        <h3 className="text-xl font-black">
          {title}
        </h3>

        <p className="mt-2 text-sm opacity-60">
          {items.length} смысловых блоков
        </p>
      </div>

      <div className="p-6">
        {items.length > 0 ? (
          <div className="space-y-5">
            {items.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="border-t border-gray-200 pt-5 first:border-t-0 first:pt-0"
              >
                <p className="text-base leading-7 text-gray-700">
                  {item}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="leading-7 text-gray-500">
            Недостаточно интервью для
            выделения аргументов.
          </p>
        )}
      </div>
    </article>
  );
}

function MethodCard({
  number,
  label,
  text,
}: {
  number: string;
  label: string;
  text: string;
}) {
  return (
    <article className="research-card rounded-[24px] border border-gray-200 p-7">
      <span className="text-sm font-black text-blue-600">
        {number}
      </span>

      <h3 className="mt-7 text-xl font-black tracking-[-0.03em]">
        {label}
      </h3>

      <p className="mt-4 text-lg leading-8 text-gray-700">
        {text}
      </p>
    </article>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] bg-gray-100 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-gray-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-black tracking-[-0.04em]">
        {value}
      </p>
    </div>
  );
}

function LongText({
  text,
}: {
  text: string;
}) {
  return (
    <div className="max-w-4xl whitespace-pre-line text-lg leading-9 text-gray-700 sm:text-xl sm:leading-10">
      {text}
    </div>
  );
}

function buildDistribution(
  values: string[]
): DistributionItem[] {
  const cleaned = values.filter(Boolean);
  const total = cleaned.length;

  if (total === 0) {
    return [];
  }

  const counts = new Map<string, number>();

  for (const value of cleaned) {
    counts.set(
      value,
      (counts.get(value) || 0) + 1
    );
  }

  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      percent: Math.round(
        (count / total) * 100
      ),
    }))
    .sort(
      (first, second) =>
        second.count - first.count
    );
}

function calculateOpinionDistribution(
  population: PopulationItem[]
): OpinionDistribution {
  const counts = {
    fullySupport: 0,
    ratherSupport: 0,
    neutral: 0,
    ratherOppose: 0,
    fullyOppose: 0,
    difficultToAnswer: 0,
    refuseToAnswer: 0,
  };

  for (const person of population) {
    const opinion = cleanValue(
      person.opinion,
      ""
    ).toLowerCase();

    if (
      opinion.includes(
        "полностью поддерживает"
      )
    ) {
      counts.fullySupport += 1;
    } else if (
      opinion.includes(
        "скорее поддерживает"
      )
    ) {
      counts.ratherSupport += 1;
    } else if (
      opinion.includes(
        "совершенно не поддерживает"
      ) ||
      opinion.includes(
        "полностью не поддерживает"
      )
    ) {
      counts.fullyOppose += 1;
    } else if (
      opinion.includes(
        "скорее не поддерживает"
      )
    ) {
      counts.ratherOppose += 1;
    } else if (
      opinion.includes(
        "затрудняется"
      )
    ) {
      counts.difficultToAnswer += 1;
    } else if (
      opinion.includes(
        "отказывается"
      )
    ) {
      counts.refuseToAnswer += 1;
    } else {
      counts.neutral += 1;
    }
  }

  const total = population.length;

  const percent = (value: number) =>
    total > 0
      ? Math.round(
          (value / total) * 100
        )
      : 0;

  return {
    fullySupport: percent(
      counts.fullySupport
    ),
    ratherSupport: percent(
      counts.ratherSupport
    ),
    neutral: percent(counts.neutral),
    ratherOppose: percent(
      counts.ratherOppose
    ),
    fullyOppose: percent(
      counts.fullyOppose
    ),
    difficultToAnswer: percent(
      counts.difficultToAnswer
    ),
    refuseToAnswer: percent(
      counts.refuseToAnswer
    ),
  };
}

function normalizeGender(
  value?: string
): string {
  const gender = cleanValue(
    value,
    "Не указано"
  ).toLowerCase();

  if (
    gender.includes("муж") ||
    gender === "м"
  ) {
    return "Мужчины";
  }

  if (
    gender.includes("жен") ||
    gender === "ж"
  ) {
    return "Женщины";
  }

  return "Не указано";
}

function getAgeGroup(
  age?: number
): string {
  if (
    typeof age !== "number" ||
    !Number.isFinite(age)
  ) {
    return "Не указано";
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

function calculatePolarization(
  positive: number,
  neutral: number,
  negative: number
): number {
  const opposedBlocks =
    Math.min(positive, negative);

  const balanceBonus =
    100 -
    Math.abs(positive - negative);

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        opposedBlocks * 1.4 +
          balanceBonus * 0.3 -
          neutral * 0.25
      )
    )
  );
}

function calculateQualityIndex({
  sampleSize,
  interviewsAnalyzed,
  interviewCoverage,
  averageInterviewLength,
  demographicGroups,
}: {
  sampleSize: number;
  interviewsAnalyzed: number;
  interviewCoverage: number;
  averageInterviewLength: number;
  demographicGroups: number;
}): number {
  const sampleScore = Math.min(
    25,
    Math.log10(
      Math.max(sampleSize, 1)
    ) * 7
  );

  const interviewScore = Math.min(
    30,
    interviewsAnalyzed * 2.2
  );

  const coverageScore = Math.min(
    15,
    interviewCoverage * 0.5
  );

  const lengthScore = Math.min(
    15,
    averageInterviewLength / 80
  );

  const profileScore = Math.min(
    15,
    demographicGroups * 3
  );

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        sampleScore +
          interviewScore +
          coverageScore +
          lengthScore +
          profileScore
      )
    )
  );
}

function getQualityLabel(
  value: number
): string {
  if (value >= 80) {
    return "Высокая аналитическая наполненность";
  }

  if (value >= 60) {
    return "Достаточно для первичного анализа";
  }

  if (value >= 40) {
    return "Требуется больше интервью";
  }

  return "Недостаточно данных";
}

function getPolarizationLabel(
  value: number
): string {
  if (value >= 70) {
    return "Высокая поляризация";
  }

  if (value >= 45) {
    return "Умеренная поляризация";
  }

  return "Низкая поляризация";
}

function cleanValue(
  value: string | undefined,
  fallback: string
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return fallback;
  }

  return value.trim();
}

function formatNumber(
  value: number
): string {
  return new Intl.NumberFormat(
    "ru-RU"
  ).format(value || 0);
}

function formatDate(
  value: string
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return new Date().toLocaleDateString(
      "ru-RU"
    );
  }

  return date.toLocaleDateString(
    "ru-RU"
  );
}

function hasTextArray(
  value: unknown
): value is string[] {
  return (
    Array.isArray(value) &&
    value.some(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0
    )
  );
}