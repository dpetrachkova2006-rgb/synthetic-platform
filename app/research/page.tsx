"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResearchPage() {
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");

  function startResearch() {
    const trimmedTopic = topic.trim();
    const trimmedQuestion = question.trim();

    if (!trimmedTopic || !trimmedQuestion) {
      alert("Заполните тему и главный вопрос");
      return;
    }

    localStorage.setItem("research_topic", trimmedTopic);
    localStorage.setItem("research_question", trimmedQuestion);

    router.push("/generation");
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-10 sm:py-12 lg:px-16">
      <section
        className="
          site-surface
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

          <span className="eyebrow">02 / RESEARCH</span>
        </header>

        <div
          className="
            grid
            min-h-[calc(100vh-137px)]
            lg:grid-cols-[0.9fr_1.1fr]
          "
        >
          <div
            className="
              relative
              flex
              flex-col
              justify-between
              overflow-visible
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
            <div>
              <p className="eyebrow">Новое исследование</p>

              <h1
                className="
                  mt-8
                  max-w-full
                  text-[42px]
                  font-black
                  leading-[0.96]
                  tracking-[-0.055em]
                  text-black
                  sm:text-[54px]
                  xl:text-[64px]
                "
              >
                Новое
                <br />
                <span className="text-blue-600">исследование</span>
              </h1>
            </div>

            <div className="mt-20">
              <div className="editorial-rule" />

              <p
                className="
                  mt-6
                  max-w-[440px]
                  text-lg
                  leading-8
                  text-gray-700
                "
              >
                Сформулируйте тему и главный исследовательский вопрос
              </p>
            </div>

            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -bottom-14
                -right-6
                text-[160px]
                font-black
                leading-none
                tracking-[-0.09em]
                text-blue-600/10
                sm:text-[220px]
              "
            >
              02
            </div>
          </div>

          <div
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
              <div className="mb-10 flex items-end justify-between gap-6">
                <div>
                  <p className="eyebrow">Параметры исследования</p>

                  <h2
                    className="
                      mt-3
                      text-3xl
                      font-black
                      tracking-[-0.045em]
                      sm:text-4xl
                    "
                  >
                    Заполните основные поля
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

              <div className="space-y-8">
                <div>
                  <label
                    htmlFor="research-topic"
                    className="
                      block
                      text-sm
                      font-black
                      uppercase
                      tracking-[0.08em]
                      text-black
                    "
                  >
                    Тема исследования
                  </label>

                  <input
                    id="research-topic"
                    type="text"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Например: отношение к Telegram"
                    className="app-input mt-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="research-question"
                    className="
                      block
                      text-sm
                      font-black
                      uppercase
                      tracking-[0.08em]
                      text-black
                    "
                  >
                    Главный вопрос
                  </label>

                  <textarea
                    id="research-question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Например: как пользователи относятся к использованию Telegram в повседневной жизни?"
                    className="app-input mt-3 min-h-40 resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={startResearch}
                  className="
                    app-button
                    mt-2
                    min-h-16
                    w-full
                    px-6
                    text-lg
                  "
                >
                  Продолжить →
                </button>
              </div>

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
                <span>01 / 03</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}