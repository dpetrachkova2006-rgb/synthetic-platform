import type {
  SyntheticRespondent,
} from "./syntheticGenerator";

const POPULATION_KEY =
  "synthetic_population";

export function savePopulation(
  population: SyntheticRespondent[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (!Array.isArray(population)) {
      throw new Error(
        "Популяция должна быть массивом."
      );
    }

    const serialized =
      JSON.stringify(population);

    if (!serialized || serialized === "[]") {
      localStorage.setItem(
        POPULATION_KEY,
        "[]"
      );

      return;
    }

    /*
     * Сначала сохраняем во временный ключ.
     * Затем проверяем, что JSON читается полностью.
     */
    const temporaryKey =
      `${POPULATION_KEY}_temporary`;

    localStorage.setItem(
      temporaryKey,
      serialized
    );

    const savedValue =
      localStorage.getItem(temporaryKey);

    if (!savedValue) {
      throw new Error(
        "Браузер не сохранил данные."
      );
    }

    const verification: unknown =
      JSON.parse(savedValue);

    if (!Array.isArray(verification)) {
      throw new Error(
        "Сохранённые данные повреждены."
      );
    }

    localStorage.setItem(
      POPULATION_KEY,
      savedValue
    );

    localStorage.removeItem(
      temporaryKey
    );
  } catch (error) {
    console.error(
      "Ошибка сохранения популяции:",
      error
    );

    localStorage.removeItem(
      `${POPULATION_KEY}_temporary`
    );

    throw new Error(
      error instanceof DOMException &&
        error.name === "QuotaExceededError"
        ? "В браузере недостаточно места для сохранения такой большой выборки. Уменьши размер исследования."
        : "Не удалось сохранить исследование."
    );
  }
}

export function getPopulation():
  SyntheticRespondent[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw =
    localStorage.getItem(
      POPULATION_KEY
    );

  if (!raw || !raw.trim()) {
    return [];
  }

  try {
    const parsed: unknown =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      localStorage.removeItem(
        POPULATION_KEY
      );

      return [];
    }

    return parsed.filter(
      (
        item
      ): item is SyntheticRespondent => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof (
            item as Partial<SyntheticRespondent>
          ).id === "number"
        );
      }
    );
  } catch (error) {
    console.error(
      "Повреждённые данные популяции:",
      error
    );

    localStorage.removeItem(
      POPULATION_KEY
    );

    localStorage.removeItem(
      `${POPULATION_KEY}_temporary`
    );

    return [];
  }
}

export function clearPopulation(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(
    POPULATION_KEY
  );

  localStorage.removeItem(
    `${POPULATION_KEY}_temporary`
  );
}