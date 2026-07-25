import {
  convertDistributionToWeights,
  generateOpinionDistribution,
  type WeightedOpinion,
} from "./opinionDistribution";

export type Gender =
  | "женщина"
  | "мужчина";

export type OpinionPosition =
  | "полностью поддерживает"
  | "скорее поддерживает"
  | "нейтральная позиция"
  | "скорее не поддерживает"
  | "совершенно не поддерживает"
  | "затрудняется ответить"
  | "отказывается отвечать";

export type AwarenessLevel =
  | "низкая"
  | "средняя"
  | "высокая";

export type ConfidenceLevel =
  | "низкая"
  | "средняя"
  | "высокая";

export type SyntheticRespondent = {
  id: number;
  name: string;
  age: number;
  city: string;
  region: string;
  gender: Gender;
  education: string;
  employment: string;
  income: string;
  familyStatus: string;
  settlementType: string;

  interests: string[];
  values: string[];

  opinion: OpinionPosition;
  awareness: AwarenessLevel;
  confidence: ConfidenceLevel;
  willingnessToAnswer: number;

  topic: string;
  question: string;

  /**
   * Развёрнутый ответ будет генерироваться отдельно
   * только после открытия конкретного респондента.
   */
  answer: string | null;
};

export type GenerationSettings = {
  gender?: string;
  age?: string;
};

type ProgressCallback = (
  generated: number,
  total: number
) => void;

type CityRecord = {
  city: string;
  region: string;
  settlementType: string;
  weight: number;
};

type AgeRange = {
  min: number;
  max: number;
};

const MAX_RESPONDENTS = 100_000;

const FEMALE_NAMES = [
  "Анна",
  "Мария",
  "Елена",
  "Ольга",
  "Наталья",
  "Татьяна",
  "Ирина",
  "Екатерина",
  "Анастасия",
  "Дарья",
  "Полина",
  "Виктория",
  "Алина",
  "Светлана",
  "Юлия",
  "Марина",
  "Ксения",
  "Валерия",
  "Александра",
  "София",
  "Людмила",
  "Надежда",
  "Любовь",
  "Галина",
];

const MALE_NAMES = [
  "Александр",
  "Алексей",
  "Сергей",
  "Дмитрий",
  "Андрей",
  "Михаил",
  "Максим",
  "Иван",
  "Николай",
  "Владимир",
  "Евгений",
  "Артём",
  "Илья",
  "Роман",
  "Павел",
  "Денис",
  "Кирилл",
  "Виктор",
  "Олег",
  "Антон",
  "Юрий",
  "Василий",
  "Георгий",
  "Константин",
];

const CITIES: CityRecord[] = [
  {
    city: "Москва",
    region: "Москва",
    settlementType: "город федерального значения",
    weight: 13,
  },
  {
    city: "Санкт-Петербург",
    region: "Санкт-Петербург",
    settlementType: "город федерального значения",
    weight: 6,
  },
  {
    city: "Новосибирск",
    region: "Новосибирская область",
    settlementType: "крупный город",
    weight: 2,
  },
  {
    city: "Екатеринбург",
    region: "Свердловская область",
    settlementType: "крупный город",
    weight: 2,
  },
  {
    city: "Казань",
    region: "Республика Татарстан",
    settlementType: "крупный город",
    weight: 2,
  },
  {
    city: "Нижний Новгород",
    region: "Нижегородская область",
    settlementType: "крупный город",
    weight: 2,
  },
  {
    city: "Челябинск",
    region: "Челябинская область",
    settlementType: "крупный город",
    weight: 1.6,
  },
  {
    city: "Самара",
    region: "Самарская область",
    settlementType: "крупный город",
    weight: 1.6,
  },
  {
    city: "Омск",
    region: "Омская область",
    settlementType: "крупный город",
    weight: 1.5,
  },
  {
    city: "Ростов-на-Дону",
    region: "Ростовская область",
    settlementType: "крупный город",
    weight: 1.6,
  },
  {
    city: "Уфа",
    region: "Республика Башкортостан",
    settlementType: "крупный город",
    weight: 1.5,
  },
  {
    city: "Красноярск",
    region: "Красноярский край",
    settlementType: "крупный город",
    weight: 1.5,
  },
  {
    city: "Пермь",
    region: "Пермский край",
    settlementType: "крупный город",
    weight: 1.4,
  },
  {
    city: "Воронеж",
    region: "Воронежская область",
    settlementType: "крупный город",
    weight: 1.4,
  },
  {
    city: "Волгоград",
    region: "Волгоградская область",
    settlementType: "крупный город",
    weight: 1.3,
  },
  {
    city: "Краснодар",
    region: "Краснодарский край",
    settlementType: "крупный город",
    weight: 1.5,
  },
  {
    city: "Саратов",
    region: "Саратовская область",
    settlementType: "крупный город",
    weight: 1.1,
  },
  {
    city: "Тюмень",
    region: "Тюменская область",
    settlementType: "крупный город",
    weight: 1.1,
  },
  {
    city: "Ижевск",
    region: "Удмуртская Республика",
    settlementType: "крупный город",
    weight: 1,
  },
  {
    city: "Барнаул",
    region: "Алтайский край",
    settlementType: "крупный город",
    weight: 1,
  },
  {
    city: "Иркутск",
    region: "Иркутская область",
    settlementType: "крупный город",
    weight: 1,
  },
  {
    city: "Хабаровск",
    region: "Хабаровский край",
    settlementType: "крупный город",
    weight: 0.9,
  },
  {
    city: "Владивосток",
    region: "Приморский край",
    settlementType: "крупный город",
    weight: 0.9,
  },
  {
    city: "Ярославль",
    region: "Ярославская область",
    settlementType: "средний город",
    weight: 0.9,
  },
  {
    city: "Тула",
    region: "Тульская область",
    settlementType: "средний город",
    weight: 0.8,
  },
  {
    city: "Калуга",
    region: "Калужская область",
    settlementType: "средний город",
    weight: 0.7,
  },
  {
    city: "Псков",
    region: "Псковская область",
    settlementType: "средний город",
    weight: 0.6,
  },
  {
    city: "Ессентуки",
    region: "Ставропольский край",
    settlementType: "средний город",
    weight: 0.5,
  },
  {
    city: "Кисловодск",
    region: "Ставропольский край",
    settlementType: "средний город",
    weight: 0.5,
  },
  {
    city: "Георгиевск",
    region: "Ставропольский край",
    settlementType: "малый город",
    weight: 0.5,
  },
  {
    city: "Клин",
    region: "Московская область",
    settlementType: "малый город",
    weight: 0.6,
  },
  {
    city: "Шуя",
    region: "Ивановская область",
    settlementType: "малый город",
    weight: 0.5,
  },
  {
    city: "село Восточное",
    region: "Хабаровский край",
    settlementType: "сельский населённый пункт",
    weight: 0.7,
  },
  {
    city: "село Отказное",
    region: "Ставропольский край",
    settlementType: "сельский населённый пункт",
    weight: 0.7,
  },
  {
    city: "посёлок Борисоглебский",
    region: "Ярославская область",
    settlementType: "посёлок",
    weight: 0.7,
  },
  {
    city: "станица Динская",
    region: "Краснодарский край",
    settlementType: "станица",
    weight: 0.7,
  },
];

const INTERESTS = [
  "семья",
  "путешествия",
  "кино",
  "музыка",
  "спорт",
  "кулинария",
  "книги",
  "социальные сети",
  "видеоигры",
  "автомобили",
  "садоводство",
  "ремонт",
  "мода",
  "искусство",
  "история",
  "политика",
  "технологии",
  "образование",
  "здоровье",
  "финансы",
  "психология",
  "экология",
  "городская жизнь",
  "общественные инициативы",
];

const VALUES = [
  "семья",
  "стабильность",
  "безопасность",
  "свобода",
  "самореализация",
  "достаток",
  "справедливость",
  "профессиональный рост",
  "здоровье",
  "дружба",
  "традиции",
  "независимость",
  "образование",
  "общественное признание",
  "помощь другим",
];

const EMPLOYMENT_OPTIONS = [
  "работает по найму",
  "работает в государственном секторе",
  "работает в частной компании",
  "самозанятый",
  "индивидуальный предприниматель",
  "студент",
  "временно не работает",
  "занимается домашним хозяйством",
  "пенсионер",
];

const FAMILY_STATUSES = [
  "не состоит в браке",
  "состоит в браке",
  "живёт с партнёром",
  "разведён(а)",
  "вдовец или вдова",
];

function randomNumber(
  min: number,
  max: number
): number {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function randomItem<T>(
  items: readonly T[]
): T {
  return items[
    Math.floor(Math.random() * items.length)
  ];
}

function weightedRandomItem<T>(
  items: Array<{
    value: T;
    weight: number;
  }>
): T {
  const totalWeight = items.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  let random =
    Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;

    if (random <= 0) {
      return item.value;
    }
  }

  return items[items.length - 1].value;
}

function weightedCity(): CityRecord {
  const totalWeight = CITIES.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  let random =
    Math.random() * totalWeight;

  for (const item of CITIES) {
    random -= item.weight;

    if (random <= 0) {
      return item;
    }
  }

  return CITIES[CITIES.length - 1];
}

function uniqueRandomItems<T>(
  items: readonly T[],
  count: number
): T[] {
  const copy = [...items];
  const result: T[] = [];

  while (
    copy.length > 0 &&
    result.length < count
  ) {
    const index = Math.floor(
      Math.random() * copy.length
    );

    const [selected] = copy.splice(
      index,
      1
    );

    result.push(selected);
  }

  return result;
}

function normalizeGenderSetting(
  gender?: string
): Gender | null {
  if (!gender) {
    return null;
  }

  const value = gender
    .trim()
    .toLowerCase();

  if (
    value.includes("жен") ||
    value === "female"
  ) {
    return "женщина";
  }

  if (
    value.includes("муж") ||
    value === "male"
  ) {
    return "мужчина";
  }

  return null;
}

function parseAgeRange(
  ageSetting?: string
): AgeRange {
  if (!ageSetting) {
    return {
      min: 18,
      max: 85,
    };
  }

  const value = ageSetting
    .trim()
    .toLowerCase();

  const numbers =
    value.match(/\d+/g)?.map(Number) || [];

  if (value.includes("+") && numbers[0]) {
    return {
      min: Math.max(18, numbers[0]),
      max: 85,
    };
  }

  if (numbers.length >= 2) {
    return {
      min: Math.max(18, numbers[0]),
      max: Math.min(85, numbers[1]),
    };
  }

  if (numbers.length === 1) {
    return {
      min: Math.max(18, numbers[0]),
      max: Math.min(85, numbers[0]),
    };
  }

  return {
    min: 18,
    max: 85,
  };
}

function generateAge(
  range: AgeRange
): number {
  if (
    range.min !== 18 ||
    range.max !== 85
  ) {
    return randomNumber(
      range.min,
      range.max
    );
  }

  const group = weightedRandomItem([
    {
      value: {
        min: 18,
        max: 24,
      },
      weight: 10,
    },
    {
      value: {
        min: 25,
        max: 34,
      },
      weight: 18,
    },
    {
      value: {
        min: 35,
        max: 44,
      },
      weight: 20,
    },
    {
      value: {
        min: 45,
        max: 59,
      },
      weight: 27,
    },
    {
      value: {
        min: 60,
        max: 85,
      },
      weight: 25,
    },
  ]);

  return randomNumber(
    group.min,
    group.max
  );
}

function generateGender(
  forcedGender: Gender | null
): Gender {
  if (forcedGender) {
    return forcedGender;
  }

  return Math.random() < 0.54
    ? "женщина"
    : "мужчина";
}

function generateName(
  gender: Gender
): string {
  return gender === "женщина"
    ? randomItem(FEMALE_NAMES)
    : randomItem(MALE_NAMES);
}

function generateEducation(
  age: number
): string {
  if (age <= 22) {
    return weightedRandomItem([
      {
        value: "среднее общее",
        weight: 25,
      },
      {
        value: "среднее профессиональное",
        weight: 25,
      },
      {
        value: "незаконченное высшее",
        weight: 40,
      },
      {
        value: "высшее",
        weight: 10,
      },
    ]);
  }

  return weightedRandomItem([
    {
      value: "основное общее",
      weight: 7,
    },
    {
      value: "среднее общее",
      weight: 17,
    },
    {
      value: "среднее профессиональное",
      weight: 31,
    },
    {
      value: "незаконченное высшее",
      weight: 7,
    },
    {
      value: "высшее",
      weight: 34,
    },
    {
      value: "два высших или учёная степень",
      weight: 4,
    },
  ]);
}

function generateEmployment(
  age: number
): string {
  if (age <= 22) {
    return weightedRandomItem([
      {
        value: "студент",
        weight: 62,
      },
      {
        value: "работает по найму",
        weight: 20,
      },
      {
        value: "работает в частной компании",
        weight: 10,
      },
      {
        value: "временно не работает",
        weight: 8,
      },
    ]);
  }

  if (age >= 65) {
    return weightedRandomItem([
      {
        value: "пенсионер",
        weight: 75,
      },
      {
        value: "работает по найму",
        weight: 10,
      },
      {
        value: "работает в государственном секторе",
        weight: 7,
      },
      {
        value: "самозанятый",
        weight: 4,
      },
      {
        value: "занимается домашним хозяйством",
        weight: 4,
      },
    ]);
  }

  return randomItem(
    EMPLOYMENT_OPTIONS.filter(
      (option) =>
        option !== "студент" &&
        option !== "пенсионер"
    )
  );
}

function generateIncome(
  employment: string,
  settlementType: string
): string {
  if (
    employment === "студент" ||
    employment === "временно не работает"
  ) {
    return weightedRandomItem([
      {
        value: "до 30 тыс. руб. в месяц",
        weight: 55,
      },
      {
        value: "30–50 тыс. руб. в месяц",
        weight: 30,
      },
      {
        value: "50–80 тыс. руб. в месяц",
        weight: 15,
      },
    ]);
  }

  if (employment === "пенсионер") {
    return weightedRandomItem([
      {
        value: "до 30 тыс. руб. в месяц",
        weight: 60,
      },
      {
        value: "30–50 тыс. руб. в месяц",
        weight: 32,
      },
      {
        value: "50–80 тыс. руб. в месяц",
        weight: 8,
      },
    ]);
  }

  const isLargeCity =
    settlementType ===
      "город федерального значения" ||
    settlementType === "крупный город";

  if (isLargeCity) {
    return weightedRandomItem([
      {
        value: "до 30 тыс. руб. в месяц",
        weight: 10,
      },
      {
        value: "30–50 тыс. руб. в месяц",
        weight: 22,
      },
      {
        value: "50–80 тыс. руб. в месяц",
        weight: 31,
      },
      {
        value: "80–120 тыс. руб. в месяц",
        weight: 22,
      },
      {
        value: "120–200 тыс. руб. в месяц",
        weight: 11,
      },
      {
        value: "более 200 тыс. руб. в месяц",
        weight: 4,
      },
    ]);
  }

  return weightedRandomItem([
    {
      value: "до 30 тыс. руб. в месяц",
      weight: 24,
    },
    {
      value: "30–50 тыс. руб. в месяц",
      weight: 34,
    },
    {
      value: "50–80 тыс. руб. в месяц",
      weight: 25,
    },
    {
      value: "80–120 тыс. руб. в месяц",
      weight: 12,
    },
    {
      value: "120–200 тыс. руб. в месяц",
      weight: 4,
    },
    {
      value: "более 200 тыс. руб. в месяц",
      weight: 1,
    },
  ]);
}

function generateFamilyStatus(
  age: number
): string {
  if (age <= 24) {
    return weightedRandomItem([
      {
        value: "не состоит в браке",
        weight: 74,
      },
      {
        value: "живёт с партнёром",
        weight: 18,
      },
      {
        value: "состоит в браке",
        weight: 7,
      },
      {
        value: "разведён(а)",
        weight: 1,
      },
    ]);
  }

  if (age >= 60) {
    return weightedRandomItem([
      {
        value: "состоит в браке",
        weight: 47,
      },
      {
        value: "не состоит в браке",
        weight: 8,
      },
      {
        value: "разведён(а)",
        weight: 18,
      },
      {
        value: "вдовец или вдова",
        weight: 25,
      },
      {
        value: "живёт с партнёром",
        weight: 2,
      },
    ]);
  }

  return randomItem(FAMILY_STATUSES);
}

function generateAwareness(
  education: string,
  interests: string[]
): AwarenessLevel {
  let score = Math.random();

  if (
    education.includes("высшее") ||
    education.includes("учёная степень")
  ) {
    score += 0.15;
  }

  if (
    interests.includes("политика") ||
    interests.includes("образование") ||
    interests.includes("технологии") ||
    interests.includes(
      "общественные инициативы"
    )
  ) {
    score += 0.15;
  }

  if (score >= 0.9) {
    return "высокая";
  }

  if (score >= 0.45) {
    return "средняя";
  }

  return "низкая";
}

function generateOpinion(
  awareness: AwarenessLevel,
  opinionWeights: WeightedOpinion[]
): OpinionPosition {
  if (
    awareness === "низкая" &&
    Math.random() < 0.22
  ) {
    return "затрудняется ответить";
  }

  return weightedRandomItem(
    opinionWeights
  );
}

function generateConfidence(
  opinion: OpinionPosition,
  awareness: AwarenessLevel
): ConfidenceLevel {
  if (
    opinion === "затрудняется ответить" ||
    opinion === "нейтральная позиция" ||
    opinion === "отказывается отвечать"
  ) {
    return "низкая";
  }

  if (awareness === "высокая") {
    return Math.random() < 0.65
      ? "высокая"
      : "средняя";
  }

  if (awareness === "низкая") {
    return Math.random() < 0.7
      ? "низкая"
      : "средняя";
  }

  return "средняя";
}

function generateWillingnessToAnswer(
  opinion: OpinionPosition,
  confidence: ConfidenceLevel
): number {
  if (
    opinion === "отказывается отвечать"
  ) {
    return randomNumber(0, 20);
  }

  if (
    opinion === "затрудняется ответить"
  ) {
    return randomNumber(25, 55);
  }

  if (confidence === "высокая") {
    return randomNumber(75, 100);
  }

  if (confidence === "средняя") {
    return randomNumber(50, 85);
  }

  return randomNumber(25, 65);
}

function validateInput(
  count: number,
  topic: string,
  question: string
): void {
  if (
    !Number.isInteger(count) ||
    count < 1
  ) {
    throw new Error(
      "Количество респондентов должно быть положительным целым числом."
    );
  }

  if (count > MAX_RESPONDENTS) {
    throw new Error(
      `Максимальный размер выборки — ${MAX_RESPONDENTS.toLocaleString(
        "ru-RU"
      )} респондентов.`
    );
  }

  if (!topic.trim()) {
    throw new Error(
      "Укажи тему исследования."
    );
  }

  if (!question.trim()) {
    throw new Error(
      "Укажи исследовательский вопрос."
    );
  }
}

function createRespondent(
  id: number,
  topic: string,
  question: string,
  settings: GenerationSettings,
  opinionWeights: WeightedOpinion[]
): SyntheticRespondent {
  const forcedGender =
    normalizeGenderSetting(
      settings.gender
    );

  const ageRange = parseAgeRange(
    settings.age
  );

  const gender =
    generateGender(forcedGender);

  const age = generateAge(ageRange);
  const city = weightedCity();

  const education =
    generateEducation(age);

  const employment =
    generateEmployment(age);

  const interests =
    uniqueRandomItems(
      INTERESTS,
      randomNumber(2, 4)
    );

  const values =
    uniqueRandomItems(
      VALUES,
      randomNumber(2, 4)
    );

  const awareness =
    generateAwareness(
      education,
      interests
    );

  const opinion =
    generateOpinion(
      awareness,
      opinionWeights
    );

  const confidence =
    generateConfidence(
      opinion,
      awareness
    );

  return {
    id,
    name: generateName(gender),
    age,
    city: city.city,
    region: city.region,
    gender,
    education,
    employment,
    income: generateIncome(
      employment,
      city.settlementType
    ),
    familyStatus:
      generateFamilyStatus(age),
    settlementType:
      city.settlementType,

    interests,
    values,

    opinion,
    awareness,
    confidence,
    willingnessToAnswer:
      generateWillingnessToAnswer(
        opinion,
        confidence
      ),

    topic: topic.trim(),
    question: question.trim(),

    answer: null,
  };
}

/**
 * Основная локальная генерация выборки.
 *
 * Никакие API и нейросети здесь не вызываются.
 */
export async function generateSyntheticRespondents(
  count: number,
  topic: string,
  question: string,
  settings: GenerationSettings = {},
  onProgress?: ProgressCallback
): Promise<SyntheticRespondent[]> {
  validateInput(
    count,
    topic,
    question
  );

  const distributionResult =
    await generateOpinionDistribution(
      topic,
      question
    );

  const opinionWeights =
    convertDistributionToWeights(
      distributionResult.distribution
    );

  console.info(
    "Распределение мнений:",
    distributionResult
  );

  const respondents: SyntheticRespondent[] =
    [];

  onProgress?.(0, count);

  /*
   * Генерируем блоками, чтобы интерфейс
   * не зависал на очень больших выборках.
   */
  const chunkSize = 500;

  for (
    let start = 0;
    start < count;
    start += chunkSize
  ) {
    const end = Math.min(
      start + chunkSize,
      count
    );

    for (
      let index = start;
      index < end;
      index += 1
    ) {
      respondents.push(
        createRespondent(
          index + 1,
          topic,
          question,
          settings,
          opinionWeights
        )
      );
    }

    onProgress?.(
      respondents.length,
      count
    );

    /*
     * Передаём управление браузеру,
     * чтобы успевал обновляться прогресс-бар.
     */
    await new Promise<void>(
      (resolve) => {
        setTimeout(resolve, 0);
      }
    );
  }

  return respondents;
}

/**
 * Оставляем прежнее название функции,
 * чтобы не пришлось сразу менять страницу генерации.
 *
 * Функция сохраняет прежнее имя, но теперь перед локальной
 * генерацией получает AI-распределение мнений через API.
 */
export async function generateRespondentsWithAI(
  count: number,
  topic: string,
  question: string,
  settings: GenerationSettings = {},
  onProgress?: ProgressCallback
): Promise<SyntheticRespondent[]> {
  return generateSyntheticRespondents(
    count,
    topic,
    question,
    settings,
    onProgress
  );
}