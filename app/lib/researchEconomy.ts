import type { SyntheticRespondent } from './syntheticGenerator';
import type { Study } from './study';

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
export function estimateStudy(study: Study, size = study.population.length) {
  const surveyRequests = study.type === 'qualitative' ? 0 : Math.ceil(size / surveyBatchSize(study));
  const interviewRequests = study.type === 'quantitative' ? 0 : study.selectedIds.length * Math.ceil(study.guide.split('\n').filter(q => q.trim()).length / 8);
  const questions = study.guide.split('\n').filter(q => q.trim()).length;
  const tokens = surveyRequests * (600 + SURVEY_BATCH * 170 + estimateTokens(study.questionnaire)) + interviewRequests * (1000 + questions * 500) + 9000;
  return { requests: surveyRequests + interviewRequests + 2, tokens };
}
export type Usage = { requests: number; tokens: number; estimated?: boolean };
export const defaultBudget = { maxRequests: 45, maxTokens: 150000 };
export function checkBudget(study: Study, input: unknown, outputLimit: number) {
  const usage = study.usage ?? { requests: 0, tokens: 0 };
  const budget = study.budget ?? defaultBudget;
  if (usage.requests >= budget.maxRequests || usage.tokens + estimateTokens(input) + outputLimit > budget.maxTokens) throw new Error('Достигнут бюджет исследования. Полученные результаты сохранены. Увеличьте бюджет, чтобы продолжить.');
}
