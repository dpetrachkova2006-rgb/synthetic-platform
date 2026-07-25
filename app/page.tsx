"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [hasResearch, setHasResearch] = useState(false);
  const [topic, setTopic] = useState("");

  useEffect(() => {
    const savedTopic = localStorage.getItem("research_topic");

    if (savedTopic) {
      setHasResearch(true);
      setTopic(savedTopic);
    }
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 sm:px-10 sm:py-12 lg:px-16">
      {/* Бумажная зернистость */}
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

      {/* Мягкое синее пятно на фоне */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          fixed
          -right-40
          -top-40
          z-0
          h-[520px]
          w-[520px]
          rounded-full
          bg-blue-600/10
          blur-[130px]
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
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-blue-600" />

            <span className="text-sm font-black tracking-[-0.03em]">
              SYNTHETIC PLATFORM
            </span>
          </div>

          <span className="eyebrow">RESEARCH AI</span>
        </header>

        <div
          className="
            grid
            min-h-[calc(100vh-137px)]
            lg:grid-cols-[1.28fr_0.72fr]
          "
        >
          {/* Главный блок */}
          <section
            className="
              relative
              flex
              flex-col
              justify-between
              overflow-hidden
              border-b
              border-gray-200
              bg-white
              p-8
              sm:p-12
              lg:border-b-0
              lg:border-r
              lg:p-16
              xl:p-20
            "
          >
            <div className="relative z-10">
              <p className="eyebrow">
                Платформа синтетических респондентов
              </p>

              <h1
                className="
                  mt-8
                  max-w-full
                  text-[44px]
                  font-black
                  leading-[0.94]
                  tracking-[-0.06em]
                  text-black
                  sm:text-[58px]
                  lg:text-[68px]
                  xl:text-[80px]
                "
              >
                Платформа
                <br />
                синтетических
                <br />
                <span className="text-blue-600">респондентов</span>
              </h1>

              <p
                className="
                  mt-8
                  max-w-[690px]
                  text-lg
                  leading-8
                  text-gray-700
                  sm:text-xl
                "
              >
                Создавайте цифровые выборки, проводите исследования и
                анализируйте общественное мнение с помощью синтетической
                популяции.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/research"
                  className="
                    app-button
                    min-h-16
                    px-7
                    text-lg
                  "
                >
                  Новое исследование →
                </Link>

                <Link
                  href="/guide-test"
                  className="
                    app-button-secondary
                    min-h-16
                    px-7
                    text-lg
                  "
                >
                  Тестирование гайда →
                </Link>

                {hasResearch && (
                  <Link
                    href="/map"
                    className="
                      app-button-secondary
                      min-h-16
                      px-7
                      text-lg
                    "
                  >
                    Открыть последнее
                  </Link>
                )}
              </div>
            </div>

            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -bottom-20
                -right-6
                select-none
                text-[190px]
                font-black
                leading-none
                tracking-[-0.1em]
                text-blue-600/[0.055]
                sm:text-[280px]
                xl:text-[360px]
              "
            >
              01
            </div>

            <div className="relative z-10 mt-20">
              <div className="editorial-rule" />

              <div
                className="
                  grid
                  gap-8
                  pt-8
                  sm:grid-cols-2
                  xl:grid-cols-4
                "
              >
                <div>
                  <p className="text-3xl font-black tracking-[-0.04em]">
                    100 000+
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    синтетических респондентов
                  </p>
                </div>

                <div>
                  <p className="text-3xl font-black tracking-[-0.04em]">
                    AI
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    генерация ответов и инсайтов
                  </p>
                </div>

                <div>
                  <p className="text-3xl font-black tracking-[-0.04em]">
                    Population
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    моделирование общества
                  </p>
                </div>

                <div>
                  <p className="text-3xl font-black tracking-[-0.04em]">
                    Research
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    исследования на любую тему
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Правая колонка */}
          <aside
            className="
              flex
              flex-col
              justify-between
              bg-gray-100
              p-8
              sm:p-12
              lg:p-12
              xl:p-14
            "
          >
            <div>
              <div className="flex items-center justify-between gap-6">
                <p className="eyebrow">Рабочая область</p>

                <div
                  className="
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-blue-600
                    text-lg
                    font-black
                    text-white
                  "
                >
                  ↘
                </div>
              </div>

              <div className="mt-10">
                <p
                  className="
                    text-[34px]
                    font-black
                    leading-[0.98]
                    tracking-[-0.05em]
                    text-black
                    sm:text-[44px]
                  "
                >
                  Создание
                  <br />
                  синтетических
                  <br />
                  исследований
                </p>

                <p className="mt-6 max-w-[420px] leading-7 text-gray-700">
                  Сформулируйте тему, настройте параметры выборки и получите
                  результаты исследования в одном интерфейсе.
                </p>
              </div>
            </div>

            <div className="mt-14">
              {hasResearch ? (
                <Link
                  href="/map"
                  className="
                    editorial-card
                    block
                    p-7
                    transition
                    duration-200
                    hover:-translate-y-1
                    hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]
                  "
                >
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="eyebrow">Последнее исследование</p>

                      <h2
                        className="
                          mt-5
                          text-2xl
                          font-black
                          leading-tight
                          tracking-[-0.04em]
                        "
                      >
                        {topic}
                      </h2>
                    </div>

                    <span className="text-2xl">↗</span>
                  </div>

                  <div className="mt-10 flex items-center justify-between gap-4">
                    <span className="app-badge">
                      <span className="h-2 w-2 rounded-full bg-blue-600" />
                      Завершено
                    </span>

                    <span className="text-sm font-bold text-gray-500">
                      Открыть
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="editorial-card p-7">
                  <p className="eyebrow">Последнее исследование</p>

                  <h2
                    className="
                      mt-5
                      text-2xl
                      font-black
                      leading-tight
                      tracking-[-0.04em]
                    "
                  >
                    Пока нет созданных исследований
                  </h2>

                  <p className="mt-4 leading-7 text-gray-500">
                    Начните с новой темы и сформулируйте главный вопрос.
                  </p>

                  <Link
                    href="/research"
                    className="
                      app-button-dark
                      mt-8
                      min-h-14
                      w-full
                      px-6
                    "
                  >
                    Создать исследование
                  </Link>
                </div>
              )}

              <Link
                href="/guide-test"
                className="
                  editorial-card
                  mt-6
                  block
                  p-7
                  transition
                  duration-200
                  hover:-translate-y-1
                  hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]
                "
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="eyebrow">Дополнительный инструмент</p>

                    <h2
                      className="
                        mt-5
                        text-2xl
                        font-black
                        leading-tight
                        tracking-[-0.04em]
                      "
                    >
                      Тестирование гайда
                    </h2>

                    <p className="mt-4 leading-7 text-gray-500">
                      Проверьте структуру и формулировки гайда глубинного
                      интервью перед выходом в поле.
                    </p>
                  </div>

                  <span className="text-2xl">↗</span>
                </div>

                <div className="mt-8 flex items-center justify-between gap-4">
                  <span className="app-badge">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    AI-анализ
                  </span>

                  <span className="text-sm font-bold text-gray-500">
                    Проверить
                  </span>
                </div>
              </Link>

              <div
                className="
                  mt-8
                  flex
                  items-center
                  justify-between
                  border-t
                  border-gray-300
                  pt-6
                  text-sm
                  text-gray-500
                "
              >
                <span>Digital Society Research</span>
                <span>00 / 03</span>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}