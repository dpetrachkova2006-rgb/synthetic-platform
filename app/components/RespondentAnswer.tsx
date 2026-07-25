"use client";

import { useState } from "react";
import type {
  SyntheticRespondent,
} from "../lib/syntheticGenerator";

type RespondentAnswerProps = {
  respondent: SyntheticRespondent;

  /**
   * Вызывается после успешной генерации ответа.
   * Родительский компонент сможет сохранить ответ
   * в общем массиве респондентов.
   */
  onAnswerGenerated?: (
    respondentId: number,
    answer: string
  ) => void;
};

type GenerateAnswerResponse = {
  respondentId?: number;
  answer?: string;
  error?: string;
  retryable?: boolean;
};

export default function RespondentAnswer({
  respondent,
  onAnswerGenerated,
}: RespondentAnswerProps) {
  const [answer, setAnswer] = useState<string | null>(
    respondent.answer
  );

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleGenerateAnswer() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/generate-answer",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            respondent,
          }),
        }
      );

      const data =
        (await response.json()) as GenerateAnswerResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Не удалось сгенерировать ответ."
        );
      }

      if (
        !data.answer ||
        typeof data.answer !== "string"
      ) {
        throw new Error(
          "Сервер не вернул ответ респондента."
        );
      }

      setAnswer(data.answer);

      onAnswerGenerated?.(
        respondent.id,
        data.answer
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Произошла неизвестная ошибка."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section
      style={{
        marginTop: "24px",
        paddingTop: "20px",
        borderTop:
          "1px solid rgba(255, 255, 255, 0.12)",
      }}
    >
      <h3
        style={{
          margin: "0 0 12px",
          fontSize: "16px",
          fontWeight: 600,
        }}
      >
        Ответ респондента
      </h3>

      {answer ? (
        <>
          <p
            style={{
              margin: 0,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {answer}
          </p>

          <button
            type="button"
            onClick={handleGenerateAnswer}
            disabled={isLoading}
            style={{
              marginTop: "16px",
              padding: "10px 16px",
              borderRadius: "10px",
              border:
                "1px solid rgba(255, 255, 255, 0.18)",
              cursor: isLoading
                ? "not-allowed"
                : "pointer",
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading
              ? "Генерируем..."
              : "Сгенерировать заново"}
          </button>
        </>
      ) : (
        <>
          <p
            style={{
              margin:
                "0 0 16px",
              lineHeight: 1.5,
              opacity: 0.7,
            }}
          >
            Развёрнутый ответ ещё не
            сгенерирован. Нейросеть создаст
            его на основе профиля и позиции
            этого респондента.
          </p>

          <button
            type="button"
            onClick={handleGenerateAnswer}
            disabled={isLoading}
            style={{
              padding: "11px 18px",
              borderRadius: "10px",
              border: "none",
              cursor: isLoading
                ? "not-allowed"
                : "pointer",
              opacity: isLoading ? 0.6 : 1,
              fontWeight: 600,
            }}
          >
            {isLoading
              ? "Генерируем ответ..."
              : "Сгенерировать интервью"}
          </button>
        </>
      )}

      {error && (
        <div
          style={{
            marginTop: "14px",
            padding: "12px",
            borderRadius: "10px",
            background:
              "rgba(220, 38, 38, 0.12)",
            border:
              "1px solid rgba(220, 38, 38, 0.25)",
            lineHeight: 1.5,
          }}
        >
          <strong>
            Не удалось получить ответ
          </strong>

          <p
            style={{
              margin: "6px 0 0",
            }}
          >
            {error}
          </p>

          <button
            type="button"
            onClick={handleGenerateAnswer}
            disabled={isLoading}
            style={{
              marginTop: "10px",
              padding: "8px 12px",
              borderRadius: "8px",
              cursor: isLoading
                ? "not-allowed"
                : "pointer",
            }}
          >
            Попробовать ещё раз
          </button>
        </div>
      )}
    </section>
  );
}