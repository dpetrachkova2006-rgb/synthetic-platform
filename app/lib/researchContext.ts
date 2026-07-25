import {
  researchDatabase,
  ResearchRecord,
} from "../data/researchDatabase";

export function findRelevantResearch(
  topic: string,
  question: string
): ResearchRecord[] {
  const query = `${topic} ${question}`.toLowerCase();

  return researchDatabase
    .map((research) => {
      const score = research.keywords.reduce((total, keyword) => {
        return query.includes(keyword.toLowerCase())
          ? total + 1
          : total;
      }, 0);

      return {
        research,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.research);
}