'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, LoaderCircle, Sparkles, X } from 'lucide-react';
import { validateQuestionDrafts, type QuestionDraft, type QuestionMode } from '../lib/questionDrafts';

type Props = { projectId: string; mode: QuestionMode; topic: string; brief: string; existing: string[]; surveyQuestions?: string[]; disabled?: boolean; onApply: (questions: QuestionDraft[]) => void; onBusyChange: (busy: boolean) => void };

export default function QuestionGenerator({ projectId, mode, topic: initialTopic, brief: initialBrief, existing, surveyQuestions = [], disabled, onApply, onBusyChange }: Props) {
  const id = useId();
  const storageKey = `question_assistant_v1_${projectId}_${mode}`;
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [topic, setTopic] = useState(initialTopic);
  const [brief, setBrief] = useState(initialBrief);
  const [count, setCount] = useState(Math.min(5, Math.max(1, (mode === 'survey' ? 10 : 30) - existing.length)));
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const preview = useRef<HTMLDivElement | null>(null);
  const maxCount = Math.min(10, Math.max(0, (mode === 'survey' ? 10 : 30) - existing.length));
  useEffect(() => () => onBusyChange(false), [onBusyChange]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const draft = JSON.parse(raw);
          if (typeof draft.topic === 'string') setTopic(draft.topic);
          if (typeof draft.brief === 'string') setBrief(draft.brief);
          if (Number.isInteger(draft.count) && draft.count >= 1 && draft.count <= 10) setCount(draft.count);
          if (Array.isArray(draft.questions) && draft.questions.length && draft.questions.length <= 10 && draft.questions.every((q: QuestionDraft) => q && typeof q.text === 'string' && Array.isArray(q.options) && q.options.every(o => typeof o === 'string'))) { setQuestions(draft.questions); setOpen(true); }
        }
      } catch { setError('Черновик помощника не удалось открыть. Вопросы исследования сохранены.'); }
      setReady(true);
    }, 0);
    return () => { window.clearTimeout(timer); controller.current?.abort(); };
  }, [storageKey, mode]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ topic, brief, count, questions })); window.dispatchEvent(new Event('research-saved')); }
    catch { /* Keep the visible draft available even if browser storage is full. */ }
  }, [ready, storageKey, topic, brief, count, questions]);

  async function generate() {
    if (inFlight.current || disabled) return;
    setMessage('');
    if (!topic.trim() || !brief.trim()) { setError('Укажите тему и что хотите узнать.'); return; }
    const requestedCount = Math.min(count, maxCount);
    if (!Number.isInteger(requestedCount) || requestedCount < 1) { setError('Удалите лишние вопросы, чтобы добавить новые.'); return; }
    inFlight.current = true; controller.current = new AbortController(); setBusy(true); onBusyChange(true); setError('');
    try {
      const response = await fetch('/api/generate-questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.current.signal, body: JSON.stringify({ mode, topic, brief, count: requestedCount, existing, surveyQuestions }) });
      const data = await response.json().catch(() => { throw new Error('Сервис не ответил вовремя. Попробуйте ещё раз.'); });
      if (!response.ok) throw new Error(data.error || 'Не удалось подготовить вопросы.');
      setQuestions(validateQuestionDrafts(data.questions, mode));
      requestAnimationFrame(() => { preview.current?.scrollIntoView({ block: 'nearest' }); preview.current?.focus({ preventScroll: true }); });
    } catch (e) { setError(e instanceof Error && e.name === 'AbortError' ? 'Генерация остановлена. Ваши вопросы сохранены.' : e instanceof Error ? e.message : 'Не удалось подготовить вопросы.'); }
    finally { inFlight.current = false; setBusy(false); onBusyChange(false); }
  }
  function apply() {
    try {
      const valid = validateQuestionDrafts(questions, mode);
      onApply(valid);
      setQuestions([]); setError(''); setMessage(`Добавлено вопросов: ${valid.length}. Их можно редактировать перед запуском.`); setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось добавить вопросы.'); }
  }

  return <section className="question-assistant" aria-label={mode === 'survey' ? 'Помощник для анкеты' : 'Помощник для интервью'}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="question-assistant-icon"><Sparkles size={18}/></span><div><h3 className="text-sm font-bold">Вопросы по вашей идее</h3><p className="mt-1 text-xs text-gray-600">Опишите, что хотите узнать. Мы подготовим черновик.</p></div></div>
      <button type="button" className="app-button-secondary min-h-11 px-4 text-sm" aria-expanded={open} aria-controls={id} disabled={disabled || !ready || maxCount === 0} onClick={() => setOpen(!open)}>{open ? 'Свернуть помощника' : 'Сгенерировать вопросы за меня'}</button>
    </div>
    {maxCount === 0 && <p className="mt-3 text-xs text-gray-600">Достигнуто максимальное число вопросов. Можно отредактировать существующие.</p>}
    {message && <p role="status" className="mt-3 text-sm text-blue-800">{message}</p>}
    {open && <div id={id} className="mt-5 space-y-5">
      <fieldset disabled={busy || disabled} className="grid min-w-0 gap-4 sm:grid-cols-[1fr_130px]">
        <label className="text-sm font-semibold">Тема<input className="app-input mt-2" maxLength={1000} value={topic} onChange={e => setTopic(e.target.value)} /></label>
        <label className="text-sm font-semibold">Вопросов<select className="app-input mt-2" value={Math.min(count, maxCount) || 1} onChange={e => setCount(Number(e.target.value))}>{Array.from({ length: maxCount }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label>
        <label className="text-sm font-semibold sm:col-span-2">Что хотите узнать?<textarea className="app-input mt-2 min-h-24" maxLength={2000} value={brief} placeholder="Например: как люди выбирают доставку еды, что им нравится и почему они отказываются от заказа" onChange={e => setBrief(e.target.value)} /></label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="app-button inline-flex min-h-11 items-center gap-2 px-5 text-sm" disabled={busy || disabled || !maxCount} onClick={generate}>{busy ? <LoaderCircle size={16} className="animate-spin"/> : <Sparkles size={16}/>} {busy ? 'Готовим вопросы…' : questions.length ? 'Сгенерировать другой вариант' : 'Подготовить вопросы'}</button>
        {busy && <button type="button" className="text-sm font-semibold text-blue-700 underline" onClick={() => controller.current?.abort()}>Остановить</button>}
        <p className="text-xs text-gray-500">{mode === 'survey' ? 'С вариантами для выбора одного ответа.' : 'Открытые вопросы для подробного разговора.'}</p>
      </div>
      {busy && <p role="status" className="text-sm text-blue-800">Это может занять около минуты. Существующие вопросы сохраняются.</p>}
      {questions.length > 0 && <div ref={preview} tabIndex={-1} className="question-preview space-y-4">
        <div><h4 className="font-bold">Черновик вопросов</h4><p className="mt-1 text-xs leading-5 text-gray-600">Измените формулировки или удалите лишнее, затем добавьте в {mode === 'survey' ? 'анкету' : 'интервью'}. Ваши вопросы останутся.</p></div>
        <fieldset disabled={busy || disabled} className="min-w-0 space-y-4">{questions.map((q, i) => <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3"><label htmlFor={`${id}-q-${i}`} className="text-xs font-bold text-blue-700">Вопрос {i + 1}</label><button type="button" aria-label={`Удалить черновик вопроса ${i + 1}`} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" onClick={() => setQuestions(questions.filter((_, index) => index !== i))}><X size={16}/></button></div>
          <textarea id={`${id}-q-${i}`} className="app-input mt-2 min-h-20" maxLength={1000} value={q.text} onChange={e => setQuestions(questions.map((item, index) => index === i ? { ...item, text: e.target.value } : item))}/>
          {mode === 'survey' && <label className="mt-3 block text-xs font-semibold text-gray-600">Варианты ответа через точку с запятой<textarea className="app-input mt-2 min-h-20 text-sm" value={q.options.join('; ')} onChange={e => setQuestions(questions.map((item, index) => index === i ? { ...item, options: e.target.value.split(';') } : item))}/></label>}
        </div>)}</fieldset>
        <button type="button" className="app-button inline-flex min-h-12 items-center gap-2 px-5 text-sm" disabled={busy || disabled} onClick={apply}>Добавить в {mode === 'survey' ? 'анкету' : 'интервью'} <ArrowRight size={16}/></button>
      </div>}
    </div>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  </section>;
}
