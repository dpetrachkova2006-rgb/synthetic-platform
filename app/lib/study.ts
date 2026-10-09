import type { SyntheticRespondent } from './syntheticGenerator';

export type ResearchType = 'quantitative' | 'qualitative' | 'mixed';
export type SurveyQuestion = { id: string; text: string; options: string[] };
export type SurveyResponse = { respondentId: number; answers: Record<string, string> };
export type InterviewTurn = { question: string; answer: string };
export type Study = {
  version: 1; researchId: string; type: ResearchType; topic: string; question: string;
  createdAt: string; stage: number; population: SyntheticRespondent[];
  questionnaire: SurveyQuestion[]; responses: SurveyResponse[];
  selectedIds: number[]; selectionReason: string; guide: string;
  interviews: Record<string, InterviewTurn[]>; report: string;
};
export const STUDY_KEY = 'synthetic_studies_v1';
export const TYPE_LABELS = { quantitative: 'Количественное исследование', qualitative: 'Качественное исследование', mixed: 'Смешанное исследование' };
export function createStudy(type: ResearchType, topic: string, question: string): Study {
  return { version: 1, researchId: crypto.randomUUID(), type, topic, question, createdAt: new Date().toISOString(), stage: 0, population: [], questionnaire: [], responses: [], selectedIds: [], selectionReason: '', guide: '', interviews: {}, report: '' };
}
export function readStudies(): Study[] {
  const raw = localStorage.getItem(STUDY_KEY);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(s => s?.version === 1 && typeof s.researchId === 'string' && Array.isArray(s.population) && Array.isArray(s.responses) && Array.isArray(s.selectedIds) && Array.isArray(s.questionnaire) && s.interviews && typeof s.interviews === 'object')) throw new Error('Сохранённые проекты повреждены. Данные не перезаписаны.');
  return value as Study[];
}
export function saveStudy(study: Study): void {
  validateLinks(study);
  const studies = readStudies();
  const index = studies.findIndex(s => s.researchId === study.researchId);
  if (index < 0) studies.push(study); else studies[index] = study;
  try { localStorage.setItem(STUDY_KEY, JSON.stringify(studies)); }
  catch { throw new Error('Не удалось сохранить проект в браузере. Проверьте свободное место; уменьшите выборку.'); }
}
export function validateLinks(study: Study): void {
  const ids = new Set(study.population.map(p => p.id));
  if (ids.size !== study.population.length || new Set(study.selectedIds).size !== study.selectedIds.length || study.selectedIds.some(id => !ids.has(id)) || study.responses.some(r => !ids.has(r.respondentId)) || Object.keys(study.interviews).some(id => !ids.has(Number(id)))) throw new Error('Нарушена связь респондентов с исходной выборкой.');
}
export function surveyComplete(study: Study): boolean {
  return study.population.length > 0 && study.questionnaire.length > 0 && study.population.every(p => study.questionnaire.every(q => q.options.includes(study.responses.find(r => r.respondentId === p.id)?.answers[q.id] ?? '')));
}
export function guideQuestions(guide: string): string[] { return guide.split('\n').map(q => q.trim()).filter(Boolean); }
export function interviewsComplete(study: Study): boolean {
  const questions = guideQuestions(study.guide);
  return study.selectedIds.length > 0 && questions.length > 0 && study.selectedIds.every(id => questions.every(q => study.interviews[id]?.some(t => t.question === q && t.answer.trim())));
}
export type SelectionFilter = { gender: string; minAge: number; maxAge: number; city: string; questionId: string; answer: string };
export function filterRespondents(study: Study, filter: SelectionFilter): SyntheticRespondent[] {
  return study.population.filter(p => (!filter.gender || p.gender === filter.gender) && p.age >= filter.minAge && p.age <= filter.maxAge && (!filter.city || p.city.toLowerCase().includes(filter.city.toLowerCase())) && (!filter.answer || study.responses.find(r => r.respondentId === p.id)?.answers[filter.questionId] === filter.answer));
}
export function contrastIds(study: Study, questionId: string, first: string, second: string, count = 3): number[] {
  if (!first || !second || first === second) throw new Error('Выберите два разных ответа для контрастных групп.');
  return [first, second].flatMap(answer => study.population.filter(p => study.responses.find(r => r.respondentId === p.id)?.answers[questionId] === answer).slice(0, count).map(p => p.id));
}
export function distributions(study: Study) {
  return study.questionnaire.map(q => ({ ...q, distribution: q.options.map(option => ({ option, count: study.responses.filter(r => r.answers[q.id] === option).length })) }));
}
export function buildReportEvidence(study: Study) {
  const counts = (field: 'gender' | 'city' | 'education' | 'income') => Object.fromEntries([...new Set(study.population.map(p => p[field]))].map(value => [value, study.population.filter(p => p[field] === value).length]));
  return { researchId: study.researchId, type: study.type, topic: study.topic, question: study.question, createdAt: study.createdAt, sample: { size: study.population.length, age: study.population.length ? [Math.min(...study.population.map(p => p.age)), Math.max(...study.population.map(p => p.age))] : [], gender: counts('gender'), city: counts('city'), education: counts('education'), income: counts('income') }, quantitative: distributions(study), selectionReason: study.selectionReason, interviews: study.selectedIds.map(id => ({ respondent: study.population.find(p => p.id === id), survey: study.responses.find(r => r.respondentId === id), transcript: study.interviews[id] ?? [] })) };
}
