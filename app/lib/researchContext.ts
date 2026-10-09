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

export const researchDatabase: ResearchRecord[] = [{
  id: 'wciom-ai-2024-12-03', organization: 'ВЦИОМ', title: 'ИИ: ваш новый лучший друг?', date: '2024-12-03', topic: 'искусственный интеллект',
  sourceUrl: 'https://wciom.ru/analytical-reviews/analiticheskii-obzor/ii-vash-novyi-luchshii-drug', sampleSize: 1600,
  methodology: 'ВЦИОМ-Спутник, телефонный опрос 26 ноября 2024 г., Россия, население 18+, взвешивание по социально-демографическим параметрам',
  findings: ['В публикации 63% сообщили об использовании ИИ за предыдущий год; 54% называли его помощником. Это исторический контекст, не распределение для текущего проекта.'],
  keywords: ['искусственный интеллект','нейросет','ии','нейросеть'],
}];

// Only verified publications; topic matching is for reference, never calibration.
export function findRelevantResearch(topic: string, question: string): ResearchRecord[] {
  const query = `${topic} ${question}`.toLowerCase();
  return researchDatabase
    .map(research => ({ research, score: research.keywords.reduce((total, keyword) => {
      const term = keyword.toLowerCase();
      const matches = term.length <= 3 ? query.split(/[^\p{L}\p{N}]+/u).includes(term) : query.includes(term);
      return total + Number(matches);
    }, 0) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.research);
}
