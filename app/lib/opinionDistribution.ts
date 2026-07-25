import type {
  OpinionPosition,
} from "./syntheticGenerator";

export type OpinionDistribution = {
  fullySupport: number;
  ratherSupport: number;
  neutral: number;
  ratherOppose: number;
  fullyOppose: number;
  difficultToAnswer: number;
  refuseToAnswer: number;
};

export type OpinionDistributionResult = {
  distribution: OpinionDistribution;
  explanation: string;
  sourceMode:
    | "ai-estimate"
    | "fallback";
};

export type WeightedOpinion = {
  value: OpinionPosition;
  weight: number;
};

export const FALLBACK_OPINION_DISTRIBUTION: OpinionDistribution =
  {
    fullySupport: 14,
    ratherSupport: 25,
    neutral: 14,
    ratherOppose: 20,
    fullyOppose: 11,
    difficultToAnswer: 13,
    refuseToAnswer: 3,
  };

export function convertDistributionToWeights(
  distribution: OpinionDistribution
): WeightedOpinion[] {
  return [
    {
      value: "полностью поддерживает",
      weight: distribution.fullySupport,
    },
    {
      value: "скорее поддерживает",
      weight: distribution.ratherSupport,
    },
    {
      value: "нейтральная позиция",
      weight: distribution.neutral,
    },
    {
      value: "скорее не поддерживает",
      weight: distribution.ratherOppose,
    },
    {
      value: "совершенно не поддерживает",
      weight: distribution.fullyOppose,
    },
    {
      value: "затрудняется ответить",
      weight: distribution.difficultToAnswer,
    },
    {
      value: "отказывается отвечать",
      weight: distribution.refuseToAnswer,
    },
  ];
}

export async function generateOpinionDistribution(
  topic: string,
  question: string
): Promise<OpinionDistributionResult> {
  try {
    const response = await fetch(
      "/api/generate-distribution",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          question,
        }),
      }
    );

    const data: unknown =
      await response.json();

    if (!response.ok) {
      throw new Error(
        readErrorMessage(data)
      );
    }

    if (
      !isOpinionDistributionResult(data)
    ) {
      throw new Error(
        "API вернул некорректное распределение."
      );
    }

    return data;
  } catch (error) {
    console.error(
      "Не удалось получить распределение мнений:",
      error
    );

    return {
      distribution:
        FALLBACK_OPINION_DISTRIBUTION,
      explanation:
        "Использовано резервное распределение, поскольку AI-оценка временно недоступна.",
      sourceMode: "fallback",
    };
  }
}

function readErrorMessage(
  value: unknown
): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return "Не удалось получить распределение мнений.";
}

function isOpinionDistributionResult(
  value: unknown
): value is OpinionDistributionResult {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  if (
    !("distribution" in value) ||
    !("explanation" in value) ||
    !("sourceMode" in value)
  ) {
    return false;
  }

  return (
    isOpinionDistribution(
      value.distribution
    ) &&
    typeof value.explanation ===
      "string" &&
    (
      value.sourceMode ===
        "ai-estimate" ||
      value.sourceMode ===
        "fallback"
    )
  );
}

function isOpinionDistribution(
  value: unknown
): value is OpinionDistribution {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const distribution =
    value as Partial<OpinionDistribution>;

  return [
    distribution.fullySupport,
    distribution.ratherSupport,
    distribution.neutral,
    distribution.ratherOppose,
    distribution.fullyOppose,
    distribution.difficultToAnswer,
    distribution.refuseToAnswer,
  ].every(
    (current) =>
      typeof current === "number" &&
      Number.isFinite(current) &&
      current >= 0
  );
}