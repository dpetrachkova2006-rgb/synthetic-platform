export type ResearchRecord = {
  id: string;
  organization: "Russian Field" | "ФОМ" | "ВЦИОМ";
  title: string;
  date: string;
  topic: string;
  sourceUrl: string;
  sampleSize?: number;
  methodology?: string;
  findings: string[];
  demographicFindings?: string[];
  keywords: string[];
};

export const researchDatabase: ResearchRecord[] = [
  {
    id: "rf-ai-2025",
    organization: "Russian Field",
    title: "Искусственный интеллект в жизни россиян",
    date: "2025",
    topic: "искусственный интеллект",
    sourceUrl: "ссылка на исследование",
    sampleSize: 1600,
    methodology: "всероссийский телефонный опрос",
    findings: [
      "Основной результат исследования",
      "Дополнительный результат",
    ],
    demographicFindings: [
      "Молодые респонденты чаще используют ИИ",
    ],
    keywords: [
      "ИИ",
      "искусственный интеллект",
      "нейросети",
      "технологии",
    ],
  },
];