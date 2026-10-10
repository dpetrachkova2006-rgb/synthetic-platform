import type { SyntheticRespondent } from './syntheticGenerator';
import type { Study } from './study';

export const INTERVIEW_BATCH = 4;
export const SURVEY_BATCH = 20;
export function compactProfile(p: SyntheticRespondent, mode: 'survey' | 'interview' = 'survey') {
  const { id, name, age, gender, city, education, employment, income, familyStatus, opinion, awareness } = p;
  const base = { id, name, age, gender, city, education, employment, income, familyStatus, opinion, awareness };
  return mode === 'interview' ? { ...base, region: p.region, settlementType: p.settlementType, values: p.values, interests: p.interests, confidence: p.confidence, willingnessToAnswer: p.willingnessToAnswer } : base;
}
// Conservative character estimate, not a tokenizer measurement. Russian text varies by model.
export function estimateTokens(value: unknown) { return Math.ceil(JSON.stringify(value).length / 2); }
export function surveyBatchSize(study: Study) {
  const outputPerPerson = study.questionnaire.reduce((n, q) => n + estimateTokens(q.id) + Math.max(...q.options.map(estimateTokens)) + 15, 20);
  return Math.max(1, Math.min(SURVEY_BATCH, Math.floor(5500 / outputPerPerson)));
}
