import { guideQuestions, type Study } from './study';

export type QuestionMode = 'survey' | 'interview';
export type QuestionDraft = { text: string; options: string[] };
export const questionKey = (text: string) => text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU');

/** Validate both model output and edited previews before changing a project. */
export function validateQuestionDrafts(value: unknown, mode: QuestionMode): QuestionDraft[] {
  if (!Array.isArray(value) || !value.length || value.length > 10) throw new Error('Нужно от 1 до 10 вопросов за один раз.');
  const result = value.map(q => {
    if (!q || typeof q.text !== 'string' || !q.text.trim() || q.text.length > 1000 || /[\r\n]/.test(q.text) || !Array.isArray(q.options)) throw new Error('Заполните каждый вопрос: до 1000 символов, без переноса строки.');
    const options: string[] = q.options.map((o: unknown) => {
      if (typeof o !== 'string' || !o.trim() || o.length > 200 || /[;\r\n]/.test(o)) throw new Error('Заполните варианты ответа: до 200 символов каждый, без точки с запятой.');
      return o.trim();
    });
    if (mode === 'survey' && (options.length < 2 || options.length > 8 || new Set(options.map(questionKey)).size !== options.length)) throw new Error('Для каждого вопроса нужны от 2 до 8 разных вариантов ответа.');
    if (mode === 'interview' && options.length) throw new Error('В интервью нужны открытые вопросы без вариантов ответа.');
    return { text: q.text.trim(), options };
  });
  if (new Set(result.map(q => questionKey(q.text))).size !== result.length) throw new Error('Уберите повторяющиеся вопросы.');
  return result;
}

export function appendQuestionDrafts(study: Study, mode: QuestionMode, value: unknown): Study {
  const drafts = validateQuestionDrafts(value, mode);
  if (mode === 'survey' && study.responses.length || mode === 'interview' && Object.values(study.interviews).some(turns => turns.length)) throw new Error('После получения ответов вопросы нельзя изменить. Создайте новое исследование.');
  const existing = mode === 'survey' ? study.questionnaire.map(q => q.text) : guideQuestions(study.guide);
  if (drafts.some(q => existing.some(text => questionKey(text) === questionKey(q.text)))) throw new Error('Один из вопросов уже есть в исследовании. Измените или удалите его в черновике.');
  if (existing.length + drafts.length > (mode === 'survey' ? 10 : 30)) throw new Error(mode === 'survey' ? 'В анкете может быть до 10 вопросов. Удалите лишние вопросы из черновика.' : 'В интервью может быть до 30 вопросов. Удалите лишние вопросы из черновика.');
  return mode === 'survey'
    ? { ...study, questionnaire: [...study.questionnaire, ...drafts.map(q => ({ ...q, id: crypto.randomUUID() }))], report: '', themes: [] }
    : { ...study, guide: [...existing, ...drafts.map(q => q.text)].join('\n'), report: '', themes: [] };
}
