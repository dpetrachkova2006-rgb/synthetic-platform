import type { SyntheticRespondent } from './syntheticGenerator';
import type { Study } from './study';

export const INTERVIEW_BATCH = 4;
export const GROQ_INTERVIEW_BATCH = 2;
export const SURVEY_BATCH = 20;
export function compactProfile(p: SyntheticRespondent, mode: 'survey' | 'interview' = 'survey') {
  const { id, name, age, gender, city, education, employment, income, familyStatus, opinion, awareness } = p;
  const base = { id, name, age, gender, city, education, employment, income, familyStatus, opinion, awareness };
  return mode === 'interview' ? { ...base, region: p.region, settlementType: p.settlementType, values: p.values, interests: p.interests, confidence: p.confidence, willingnessToAnswer: p.willingnessToAnswer } : base;
}
// Conservative character estimate, not a tokenizer measurement. Russian text varies by model.
export function estimateTokens(value: unknown) { return Math.ceil(JSON.stringify(value).length / 2); }
export function interviewOutputLimit(questions: readonly string[], economical: boolean) {
  return economical
    ? Math.min(14000, Math.max(1800, 1200 * questions.length + estimateTokens(questions) + 650))
    : Math.max(6000, Math.min(14000, 1500 * questions.length + estimateTokens(questions) + 700));
}
/** Keep the full history; reduce the batch when its context approaches the free minute budget. */
export function nextGroqInterviewBatch(questions: string[], context: unknown, preferred = GROQ_INTERVIEW_BATCH) {
  let count = Math.min(questions.length, preferred, GROQ_INTERVIEW_BATCH);
  while (count > 1) {
    const batch = questions.slice(0, count);
    // Questions also occur in the structured-output schema; reserve room for instructions.
    if (estimateTokens(context) + estimateTokens(batch) * 2 + interviewOutputLimit(batch, true) + 800 <= 7500) break;
    count--;
  }
  return questions.slice(0, count);
}
export function surveyBatchSize(study: Study) {
  const outputPerPerson = study.questionnaire.reduce((n, q) => n + estimateTokens(q.id) + Math.max(...q.options.map(estimateTokens)) + 15, 20);
  return Math.max(1, Math.min(SURVEY_BATCH, Math.floor(5500 / outputPerPerson)));
}
