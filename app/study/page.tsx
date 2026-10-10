'use client';

import { checkBudget, compactProfile, defaultBudget, estimateTokens, estimateStudy, surveyBatchSize } from '../lib/researchEconomy';
import PDFReportButton from '../components/PDFReportButton';
import ReportPreview from '../components/ReportPreview';
import StageChecklist from '../components/StageChecklist';
import { guideValid, questionnaireValid, readyReportStudy, stageAccess, stageChecks, type FlowCheck } from '../lib/studyFlow';
import { answerLanguageIssue } from '../lib/respondentLanguage';
import ModelingBasis from '../components/ModelingBasis';
import { sourcesForFrame, type DataFrame } from '../lib/statisticalData';
import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateRespondentsWithAI } from '../lib/syntheticGenerator';
import { buildReportEvidence, completedInterviewIds, contrastIds, createStudy, distributions, filterRespondents, guideQuestions, interviewsComplete, readStudies, saveStudy, surveyComplete, TYPE_LABELS, type ResearchType, type SelectionFilter, type Study, type SurveyResponse } from '../lib/study';

const STEPS = ['Количественный этап', 'Отбор респондентов', 'Глубинные интервью', 'Общий отчёт'];
const initialFilter: SelectionFilter = { gender: '', minAge: 18, maxAge: 85, city: '', questionId: '', answer: '' };

export default function StudyPage() {
  return <Suspense fallback={<main className="p-10">Загрузка проекта…</main>}><StudyContent /></Suspense>;
}
function StudyContent() {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get('id');
  const requestedType = searchParams.get('type') === 'qualitative' ? 'qualitative' : 'mixed';
  const [study, setStudy] = useState<Study | null>(null);
  const [ready, setReady] = useState(false);
  const [type, setType] = useState<ResearchType>('mixed');
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [dataFrame, setDataFrame] = useState<DataFrame>('wb-rus-2024');
  const [size, setSize] = useState(30);
  const [gender, setGender] = useState('Все');
  const [age, setAge] = useState('Все');
  const [filter, setFilter] = useState(initialFilter);
  const [contrast, setContrast] = useState(['', '']);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [providerInfo, setProviderInfo] = useState<{provider:string;model:string;priceNote:string;maxPricePerMillion:number|null} | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<Study[]>([]);
  const lock = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const currentStudy = useRef<Study | null>(null);
  const pendingFocus = useRef('');

  useEffect(() => {
    controller.current?.abort();
    const timer = window.setTimeout(() => {
    try {
      const saved = readStudies();
      const loaded = saved.find(s => s.researchId === requestedId);
      setProjects(saved.filter(p => p.type !== "quantitative"));
      setError('');
      currentStudy.current = loaded ?? null;
      setStudy(loaded ?? null);
      setActiveId(loaded?.selectedIds[0] ?? null);
      if (loaded) { setType(loaded.type); }
      else if (requestedId) throw new Error('Проект не найден в этом браузере.');
      else {
        setType(requestedType);
        const raw = localStorage.getItem('study_form_draft_' + requestedType);
        const draft = raw ? JSON.parse(raw) : {};
        setTopic(draft.topic || ''); setQuestion(draft.question || '');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка загрузки.'); }
    setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [requestedId, requestedType]);

  useEffect(() => { fetch('/api/ai-status').then(r=>r.json()).then(setProviderInfo).catch(()=>{}); return () => controller.current?.abort(); }, []);
  const stage = study?.stage;
  const researchId = study?.researchId;
  useEffect(() => {
    if (stage === undefined) return;
    const panel = document.getElementById('study-stage');
    panel?.scrollIntoView({ block: 'start' });
    panel?.focus({ preventScroll: true });
    if(pendingFocus.current){const target=document.getElementById(pendingFocus.current);target?.scrollIntoView({block:'center'});(target?.matches('input,textarea,select,button')?target:target?.querySelector<HTMLElement>('input,textarea,select,button'))?.focus();pendingFocus.current='';}
  }, [stage, researchId]);

  function commit(next: Study) {
    saveStudy(next);
    currentStudy.current = next;
    setStudy(next);
    setProjects(readStudies().filter(p => p.type !== "quantitative"));
    return next;
  }
  function update(patch: Partial<Study>) {
    if (!study || lock.current) return;
    try { commit({ ...study, ...patch }); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка сохранения.'); }
  }
  function resolve(check:FlowCheck) {
    if(!study||busy)return;
    const blocked=stageAccess(study,check.stage);
    const target=blocked??check;
    pendingFocus.current=target.target;
    update({stage:target.stage});
    requestAnimationFrame(()=>{const element=document.getElementById(target.target);element?.scrollIntoView({block:'center'});(element?.matches('input,textarea,select,button')?element:element?.querySelector<HTMLElement>('input,textarea,select,button'))?.focus();});
  }
  function goToStage(next:number) {
    if(!study)return;
    const blocked=stageAccess(study,next);
    if(blocked){resolve(blocked);setError(`Перед следующим этапом: ${blocked.help}`);return;}
    update({stage:next});
  }
  async function run(label: string, action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; controller.current = new AbortController(); setBusy(label); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error && e.name === 'AbortError' ? 'Операция отменена. Уже полученные ответы сохранены; можно продолжить.' : e instanceof Error ? e.message : 'Ошибка операции.'); }
    finally { lock.current = false; setBusy(''); }
  }
  async function api(current: Study, payload: Record<string, unknown>) {
    if (controller.current?.signal.aborted) throw new DOMException('Отменено', 'AbortError');
    const latest = currentStudy.current ?? current;
    checkBudget(latest, payload, payload.action === 'report' ? 6500 : 6000);
    const usage = latest.usage ?? { requests: 0, tokens: 0 };
    const reserved = estimateTokens(payload) + 6000;
    commit({ ...latest, usage: { ...usage, requests: usage.requests + 1, tokens: usage.tokens + reserved, estimated: true } });
    if (controller.current?.signal.aborted) throw new DOMException('Отменено', 'AbortError');
    const response = await fetch('/api/study', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.current?.signal, body: JSON.stringify({ researchId: current.researchId, topic: current.topic, question: current.question, ...payload }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ошибка генерации.');
    if (data.researchId !== current.researchId) throw new Error('Ответ относится к другому проекту.');
    const last = currentStudy.current ?? current;
    commit({ ...last, usage: { requests: last.usage?.requests ?? 1, tokens: (last.usage?.tokens ?? 0) - reserved + data.usage.tokens, estimated: !!usage.estimated || data.usage.estimated } });
    return data;
  }
  function draft(nextTopic: string, nextQuestion: string) { localStorage.setItem('study_form_draft_' + type, JSON.stringify({ topic: nextTopic, question: nextQuestion })); window.dispatchEvent(new Event('research-saved')); }
  function start() {
    if (!topic.trim() || !question.trim()) { setError('Заполните тему и исследовательский вопрос.'); return; }
    try {
      const next = commit(createStudy(type, topic.trim(), question.trim()));
      localStorage.removeItem('study_form_draft_' + type);
      window.history.replaceState(null, '', `/study?id=${next.researchId}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка создания.'); }
  }
  async function generate() {
    if (!study) return;
    await run('Формируем выборку…', async () => {
      checkBudget(study, { topic: study.topic, question: study.question }, 3000);
      const usage = study.usage ?? { requests: 0, tokens: 0 };
      commit({ ...study, usage: { requests: usage.requests + 1, tokens: usage.tokens + 3000, estimated: true } });
      const population = await generateRespondentsWithAI(size, study.topic, study.question, { gender, age, dataFrame, requireAI: true, signal: controller.current?.signal }, (done,total)=>setBusy(`Сформировано профилей: ${done} / ${total}`));
      commit({ ...study, usage: currentStudy.current?.usage, sources: sourcesForFrame(dataFrame, study.topic, study.question), population, stage: study.type === 'qualitative' ? 1 : 0 });
    });
  }
  async function survey() {
    if (!study) return;
    await run('Моделируем ответы анкеты…', async () => {
      let current = study;
      const pending = current.population.filter(p => !current.questionnaire.every(q => q.options.includes(current.responses.find(r => r.respondentId === p.id)?.answers[q.id] ?? '')));
      const batchSize = surveyBatchSize(current);
      for (let offset = 0; offset < pending.length; offset += batchSize) {
        const data = await api(current, { action: 'survey', respondents: pending.slice(offset, offset + batchSize).map(p=>compactProfile(p)), questionnaire: current.questionnaire });
        const incoming = data.responses as SurveyResponse[];
        current = commit({ ...current, usage: currentStudy.current?.usage, responses: [...current.responses.filter(r => !incoming.some(n => n.respondentId === r.respondentId)), ...incoming] });
        setBusy(`Сохранено ответов: ${current.responses.length} / ${current.population.length}`);
      }
    });
  }
  async function interview(all: boolean) {
    if (!study || activeId === null) return;
    await run('Проводим интервью…', async () => {
      let current = study;
      for (const id of all ? current.selectedIds : [activeId]) {
        const respondent = current.population.find(p => p.id === id);
        if (!respondent || !current.selectedIds.includes(id)) throw new Error('Респондент не выбран из исходной выборки.');
        const pendingQuestions = guideQuestions(current.guide).filter(q => !current.interviews[id]?.some(t => t.question === q && t.answer.trim() && !answerLanguageIssue(t.answer,`${current.topic} ${current.question} ${q}`)));
        for (let offset = 0; offset < pendingQuestions.length; offset += 8) {
          const questions = pendingQuestions.slice(offset, offset + 8);
          const response = current.responses.find(r => r.respondentId === id);
          const data = await api(current, { action: 'interviewBatch', respondent: compactProfile(respondent, 'interview'), questions, history: current.interviews[id] ?? [], survey: current.questionnaire.map(item => ({ question: item.text, answer: response?.answers[item.id] ?? '' })) });
          const replaced=(current.interviews[id]??[]).filter(t=>questions.includes(t.question));
          current = commit({ ...current, usage: currentStudy.current?.usage, report: '', themes:[], replacedInterviews:[...(current.replacedInterviews??[]),...replaced.map(t=>({...t,respondentId:id,replacedAt:new Date().toISOString()}))], interviews: { ...current.interviews, [id]: [...(current.interviews[id] ?? []).filter(t=>!questions.includes(t.question)), ...data.turns] } });
          setBusy(`Интервью #${id}: ${current.interviews[id].length} / ${guideQuestions(current.guide).length}`);
        }
      }
    });
  }
  async function report(preliminary = false) {
    if (!study) return;
    await run('Создаём общий отчёт…', async () => {
      if (preliminary ? study.type !== 'qualitative' || !completedInterviewIds(study).length : !interviewsComplete(study) || (study.type === 'mixed' && !surveyComplete(study))) throw new Error('Сначала завершите необходимые интервью и опрос.');
      const includedIds = preliminary ? completedInterviewIds(study) : study.selectedIds;
      const data = await api(study, { action: 'report', evidence: buildReportEvidence(study, includedIds) });
      commit({ ...study, usage: currentStudy.current?.usage, report: data.report, themes: data.themes ?? [], reportRespondentIds: includedIds });
    });
  }
  function download() {
    if (!study) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(study, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `research-${study.researchId}.json`; link.click(); URL.revokeObjectURL(url);
  }
  const currentQuestion = study?.questionnaire.find(q => q.id === filter.questionId) ?? study?.questionnaire[0];
  const effectiveFilter = { ...filter, questionId: currentQuestion?.id ?? '' };
  const candidates = study ? filterRespondents(study, effectiveFilter) : [];
  const respondent = study?.population.find(p => p.id === activeId);
  const guide = guideQuestions(study?.guide ?? '');
  const validQuestionnaire = !!study && questionnaireValid(study);
  const validGuide = !!study && guideValid(study);
  const completedIds = study ? completedInterviewIds(study) : [];
  const remainingIds = study?.selectedIds.filter(id => !completedIds.includes(id)) ?? [];
  const estimate = study ? estimateStudy(study, study.population.length || size) : null;
  const field = 'app-input mt-2';
  const button = 'app-button min-h-12 px-5';
  if (!ready) return <main className="p-10">Загрузка проектов…</main>;
  return <main className="min-h-screen px-5 py-8 sm:px-10">
    <section className="site-surface mx-auto max-w-[1380px] overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 p-6 sm:px-10"><Link href="/" className="font-black">SYNTHETIC PLATFORM</Link><Link href="/research" className="text-sm text-blue-600">Количественное исследование →</Link></header>
      <div className="p-6 sm:p-10">
        {error && <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
        {busy && <p role="status" aria-live="polite" className="mb-6 rounded-xl bg-blue-50 p-4 text-blue-800">{busy}. Результаты сохраняются по мере выполнения.</p>}
        {!study ? <>
          <h1 className="text-3xl font-black">{TYPE_LABELS[type]}</h1>
          <p className="mt-3 text-gray-700">{type === 'mixed' ? 'Один проект: массовый опрос, отбор участников и интервью из той же выборки.' : 'Сформируйте группу и проведите глубинные интервью.'}</p>
          <div className="mt-8 grid max-w-3xl gap-6">
            <label>Тип исследования<select className={field} value={type} onChange={e => setType(e.target.value as ResearchType)}><option value="mixed">Смешанное</option><option value="qualitative">Качественное</option></select></label>
            <label>Тема<input className={field} maxLength={1000} value={topic} onChange={e => { setTopic(e.target.value); draft(e.target.value, question); }} /></label>
            <label>Исследовательский вопрос<textarea className={field} maxLength={2000} value={question} onChange={e => { setQuestion(e.target.value); draft(topic, e.target.value); }} /></label>
            <button className={button} onClick={start}>Создать проект</button>
          </div>
          {!!projects.length && <div className="mt-10"><h2 className="text-xl font-black">Сохранённые проекты</h2><ul className="mt-4 space-y-3">{projects.map(p => <li key={p.researchId}><a href={`/study?id=${p.researchId}`} className="text-blue-600 underline">{p.topic} · {TYPE_LABELS[p.type]}</a></li>)}</ul></div>}
        </> : <>
          <p className="eyebrow">{TYPE_LABELS[study.type]}</p><h1 className="mt-3 text-3xl font-black">{study.topic}</h1><p className="mt-3 text-gray-700">{study.question}</p>
          <p className="mt-2 break-all text-xs text-gray-500">Проект {study.researchId} · данные сохраняются в этом браузере</p>
          <nav aria-label="Этапы исследования" className="my-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{STEPS.map((step, index) => {
            const blocked=stageAccess(study,index),done=stageChecks(study,index).every(c=>c.done);
            return <button key={step} disabled={!!busy} aria-current={study.stage === index ? 'step' : undefined} aria-describedby={`step-help-${index}`} onClick={() => goToStage(index)} className={`rounded-xl border p-4 text-left text-sm font-bold ${study.stage === index ? 'border-blue-600 bg-blue-50 text-blue-700' : blocked?'border-gray-200 bg-gray-50 text-gray-500':'border-gray-200'} disabled:opacity-40`}><span>{done?'✓ ':''}{index + 1}. {index === 0 && study.type === 'qualitative' ? 'Группа респондентов' : step}</span><span id={`step-help-${index}`} className="mt-2 block text-xs font-normal leading-5">{blocked?`Сначала: ${blocked.label.toLocaleLowerCase('ru')}`:study.stage===index?'Вы здесь':done?'Готово · можно вернуться':'Можно открыть'}</span></button>;
          })}</nav>
          <StageChecklist checks={stageChecks(study,study.stage)} onResolve={resolve}/>
          <aside className="my-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm">
            <p>Оценка по текущей анкете и выбранным участникам: {estimate?.requests} запросов, около {estimate?.tokens.toLocaleString('ru')} токенов (приблизительно, без скрытых рассуждений модели). {providerInfo ? `${providerInfo.provider} / ${providerInfo.model}: ${providerInfo.priceNote}.` : 'Тариф сервера уточняется…'}</p>
            <p className="mt-2">{providerInfo?.maxPricePerMillion !== null && providerInfo?.maxPricePerMillion !== undefined ? `Ориентир стоимости оценки: до $${((estimate?.tokens ?? 0)*providerInfo.maxPricePerMillion/1000000).toFixed(4)} по серверному тарифу; точное потребление зависит от модели.` : "Для денежной оценки платных моделей нужен серверный тариф за миллион токенов."}</p><p className="mt-2">Использовано: {study.usage?.requests ?? 0} запросов; {study.usage?.tokens ?? 0} токенов{study.usage?.estimated ? ' (оценка)' : ''}. Параллельность: 1. Результаты сохраняются после каждого пакета; повторяются только незавершённые пакеты.</p>
            <div className="mt-3 flex flex-wrap gap-4"><label>Бюджет запросов <input aria-label="Бюджет запросов" type="number" min="1" max="1000" value={study.budget?.maxRequests ?? defaultBudget.maxRequests} onChange={e => update({ budget: { ...(study.budget ?? defaultBudget), maxRequests: Math.max(1, Math.min(1000, Number(e.target.value) || 1)) } })} className="w-24 rounded border p-2" /></label><label>Бюджет токенов <input aria-label="Бюджет токенов" type="number" min="10000" max="1000000" step="10000" value={study.budget?.maxTokens ?? defaultBudget.maxTokens} onChange={e => update({ budget: { ...(study.budget ?? defaultBudget), maxTokens: Math.max(10000, Math.min(1000000, Number(e.target.value) || 10000)) } })} className="w-32 rounded border p-2" /></label></div>
            {!!busy && <button className="mt-3 underline" onClick={() => controller.current?.abort()}>Отменить генерацию</button>}
          </aside>
          <fieldset id="study-stage" tabIndex={-1} disabled={!!busy} className="min-w-0 disabled:opacity-70">
          {study.stage === 0 && <div className="space-y-8">
            <h2 className="text-2xl font-black">{study.type === 'qualitative' ? 'Создание группы' : 'Выборка и анкета'}</h2>
            {!study.population.length ? <><div id="sample-settings" className="grid gap-5 sm:grid-cols-3">
              <label className="sm:col-span-3">Основа выборки<select className={field} value={dataFrame} onChange={e=>setDataFrame(e.target.value as DataFrame)}><option value="wb-rus-2024">Россия 20–79 лет: World Bank / ООН, 2024</option><option value="modeled">Модельные характеристики без статистической калибровки</option></select><span className="mt-2 block text-sm text-gray-500">При использовании статистики возраст ограничен 20–79 годами; фильтры применяются внутри этой рамки. Возраст внутри пятилетнего интервала моделируется равномерно, города и прочие характеристики — модельные.</span></label>
              <label>Размер выборки (1–500)<input className={field} type="number" min={1} max={500} value={size} onChange={e => setSize(Number(e.target.value))} /></label>
              <label>Пол<select className={field} value={gender} onChange={e => setGender(e.target.value)}><option>Все</option><option>женщина</option><option>мужчина</option></select></label>
              <label>Возраст<select className={field} value={age} onChange={e => setAge(e.target.value)}>{['Все', '18–25', '26–40', '41–60', '61–85'].map(v => <option key={v}>{v}</option>)}</select></label>
            </div><button className={button} disabled={!Number.isInteger(size) || size < 1 || size > 500} onClick={generate}>Сформировать выборку</button></> : <p className="app-badge">В исходной выборке {study.population.length} респондентов. Их ID сохраняются на всех этапах.</p>}
            {study.type !== 'qualitative' && <>
              <p id="questionnaire-editor" className="text-gray-700">Анкета: до 10 вопросов с одним вариантом ответа. После начала опроса анкета фиксируется.</p>
              {study.questionnaire.map((q, index) => <div className="editorial-card p-5" key={q.id}>
                <label>Вопрос {index + 1}<input className={field} maxLength={1000} disabled={study.responses.length > 0} value={q.text} onChange={e => update({ questionnaire: study.questionnaire.map(item => item.id === q.id ? { ...item, text: e.target.value } : item) })} /></label>
                <label className="mt-4 block">Варианты ответа (разделитель — точка с запятой)<input className={field} disabled={study.responses.length > 0} value={q.options.join(';')} onChange={e => update({ questionnaire: study.questionnaire.map(item => item.id === q.id ? { ...item, options: e.target.value.split(';') } : item) })} /></label>
                {!study.responses.length && <button className="mt-3 text-sm text-gray-500 underline" onClick={() => update({ questionnaire: study.questionnaire.filter(item => item.id !== q.id) })}>Удалить вопрос</button>}
              </div>)}
              <div id="survey-actions" className="flex flex-wrap gap-3">
                <button className="app-button-secondary min-h-12 px-5" disabled={study.responses.length > 0 || study.questionnaire.length >= 10} onClick={() => update({ questionnaire: [...study.questionnaire, { id: crypto.randomUUID(), text: '', options: ['Да', 'Нет', 'Затрудняюсь ответить'] }] })}>Добавить вопрос</button>
                <button className={button} disabled={!study.population.length || !validQuestionnaire || surveyComplete(study)} onClick={survey}>{study.responses.length ? 'Продолжить моделирование' : 'Запустить моделирование ответов'}</button>
              </div>
              <p>Получено ответов: {study.responses.length} / {study.population.length}</p>
              {!!study.responses.length && <Quantitative study={study} />}
              <button className={surveyComplete(study)?button:'app-button-secondary min-h-12 px-5'} onClick={() => goToStage(1)}>Перейти к отбору респондентов →</button>
            </>}
            {study.type==='qualitative'&&study.population.length>0&&<button className={button} onClick={()=>goToStage(1)}>Выбрать участников для интервью →</button>}
          </div>}
          {study.stage === 1 && <div className="space-y-6">
            <h2 className="text-2xl font-black">Отбор из исходной выборки</h2><p>Можно сочетать ручной выбор, фильтры и контрастные группы. Выбрано: {study.selectedIds.length} (до 30).</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label>Пол<select className={field} value={filter.gender} onChange={e => setFilter({ ...filter, gender: e.target.value })}><option value="">Все</option><option>женщина</option><option>мужчина</option></select></label>
              <label>Возраст от<input className={field} type="number" min={18} max={85} value={filter.minAge} onChange={e => setFilter({ ...filter, minAge: Number(e.target.value) })} /></label>
              <label>Возраст до<input className={field} type="number" min={18} max={85} value={filter.maxAge} onChange={e => setFilter({ ...filter, maxAge: Number(e.target.value) })} /></label>
              <label>Город<input className={field} value={filter.city} onChange={e => setFilter({ ...filter, city: e.target.value })} /></label>
            </div>
            {!!study.questionnaire.length && <div className="grid gap-4 sm:grid-cols-2">
              <label>Вопрос анкеты<select className={field} value={currentQuestion?.id} onChange={e => { setFilter({ ...filter, questionId: e.target.value, answer: '' }); setContrast(['', '']); }}>{study.questionnaire.map(q => <option key={q.id} value={q.id}>{q.text}</option>)}</select></label>
              <label>Ответ<select className={field} value={filter.answer} onChange={e => setFilter({ ...filter, answer: e.target.value })}><option value="">Любой</option>{currentQuestion?.options.map(o => <option key={o}>{o}</option>)}</select></label>
            </div>}
            <button className="app-button-secondary min-h-12 px-5" disabled={study.selectedIds.length + candidates.filter(p => !study.selectedIds.includes(p.id)).length > 30} onClick={() => update({ selectedIds: [...new Set([...study.selectedIds, ...candidates.map(p => p.id)])], selectionReason: `${study.selectionReason}\nОтбор по фильтрам: ${JSON.stringify(effectiveFilter)}`, report: '' })}>Добавить найденных ({candidates.length})</button>
            {currentQuestion && <div className="editorial-card space-y-4 p-5"><h3 className="font-black">Контрастные группы — до трёх участников на каждый ответ</h3><div className="grid gap-4 sm:grid-cols-2">{[0, 1].map(i => <label key={i}>Группа {i + 1}<select className={field} value={contrast[i]} onChange={e => setContrast(contrast.map((v, j) => j === i ? e.target.value : v))}><option value="">Выберите ответ</option>{currentQuestion.options.map(o => <option key={o}>{o}</option>)}</select></label>)}</div><button className={button} onClick={() => {
              try { const ids = contrastIds(study, currentQuestion.id, contrast[0], contrast[1]);
                if (!contrast.every(value => ids.some(id => study.responses.find(r => r.respondentId === id)?.answers[currentQuestion.id] === value))) throw new Error('Для одной из контрастных групп нет респондентов.');
                const selectedIds = [...new Set([...study.selectedIds, ...ids])]; if (selectedIds.length > 30) throw new Error('Для интервью можно выбрать до 30 участников.');
                update({ selectedIds, selectionReason: `${study.selectionReason}\nКонтрастные группы по вопросу «${currentQuestion.text}»: ${contrast.join(' / ')}; до 3 участников на группу, первые подходящие ID.`, report: '' });
              } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка отбора.'); }
            }}>Добавить контрастные группы</button></div>}
            <div id="respondent-selection" className="max-h-96 overflow-auto rounded-xl border border-gray-200"><table className="w-full text-left text-sm"><thead><tr className="bg-gray-100"><th className="p-3">Выбор</th><th>Респондент</th><th>Профиль</th><th>Ответ</th></tr></thead><tbody>{candidates.map(p => <tr key={p.id} className="border-t border-gray-200"><td className="p-3"><input aria-label={`Выбрать респондента ${p.id}`} type="checkbox" checked={study.selectedIds.includes(p.id)} disabled={!study.selectedIds.includes(p.id) && study.selectedIds.length >= 30} onChange={e => update({ selectedIds: e.target.checked ? [...study.selectedIds, p.id] : study.selectedIds.filter(id => id !== p.id), report: '' })} /></td><td>#{p.id} {p.name}</td><td>{p.gender}, {p.age}, {p.city}</td><td>{study.responses.find(r => r.respondentId === p.id)?.answers[currentQuestion?.id ?? ''] ?? 'Нет анкеты'}</td></tr>)}</tbody></table></div>
            <p className="text-sm text-gray-500">Выбранные ID: {study.selectedIds.join(', ') || 'Пока нет'}</p>
            <label className="block">Принципы отбора (включая ручной выбор)<textarea id="selection-reason" className={field} placeholder="Например: выбраны участники разного возраста с противоположными ответами на анкету." maxLength={6000} value={study.selectionReason} onChange={e => update({ selectionReason: e.target.value, report: '' })} /></label>
            <button className={button} onClick={() => { setActiveId(study.selectedIds[0]??null); goToStage(2); }}>Перейти к глубинным интервью</button>
          </div>}
          {study.stage === 2 && <div className="space-y-6">
            <h2 className="text-2xl font-black">Глубинные интервью</h2>
            <label className="block">Гайд: один вопрос на строку (до 30)<textarea id="interview-guide" placeholder="Как вы обычно решаете эту задачу?&#10;Что вам удобно, а что вызывает сложности?" className={`${field} min-h-40`} disabled={Object.values(study.interviews).some(turns => turns.length > 0)} value={study.guide} onChange={e => update({ guide: e.target.value, report: '' })} /></label>
            <p className="text-sm text-gray-500">Вопросы должны быть уникальными, не длиннее 2000 символов. После первого ответа гайд фиксируется.</p>
            <label className="block">Загрузить гайд (.txt)<input className="mt-2 block" type="file" accept=".txt,text/plain" disabled={Object.values(study.interviews).some(t => t.length > 0)} onChange={async e => { try { const file = e.target.files?.[0]; if (file) { if (file.size > 60000) throw new Error('Гайд должен быть не больше 60 КБ.'); update({ guide: await file.text(), report: '' }); } } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка файла.'); } }} /></label>
            <label className="block">Выбранный респондент<select className={field} value={activeId ?? ''} onChange={e => setActiveId(Number(e.target.value))}><option value="">Откройте карточку</option>{study.selectedIds.map(id => <option key={id} value={id}>#{id} {study.population.find(p => p.id === id)?.name} · ответов {study.interviews[id]?.length ?? 0}/{guide.length}</option>)}</select></label>
            {respondent && <div className="editorial-card space-y-4 p-6"><h3 className="text-xl font-black">#{respondent.id} {respondent.name}</h3><p>{respondent.gender}, {respondent.age} лет, {respondent.city}, {respondent.region}</p><p>{respondent.education} · {respondent.employment} · {respondent.income} · {respondent.familyStatus}</p><p>Интересы: {respondent.interests.join(', ')}. Ценности: {respondent.values.join(', ')}</p>
              <Comparison study={study} id={respondent.id} />
            </div>}
            <p role="status">Завершено интервью: {completedIds.length} из {study.selectedIds.length}. {remainingIds.length > 0 && `Осталось: ${remainingIds.length}. В разделе отчёта можно посмотреть готовность исследования.`}</p>
            <div id="interview-actions" className="flex flex-wrap gap-3"><button className={button} disabled={activeId === null || !validGuide} onClick={() => interview(false)}>Провести / продолжить интервью</button><button className="app-button-secondary min-h-12 px-5" disabled={activeId === null || !validGuide} onClick={() => interview(true)}>Интервью со всеми выбранными</button><button className={button} onClick={() => goToStage(3)}>Перейти к общему отчёту →</button></div>
          </div>}
          {study.stage === 3 && <div className="space-y-6">
            <h2 className="text-2xl font-black">Единый аналитический отчёт</h2>
            <p>Исходная выборка: {study.population.length}. Участников интервью: {study.selectedIds.length}.</p><p className="whitespace-pre-wrap">Принципы отбора: {study.selectionReason}</p>
            {remainingIds.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p>Завершено интервью: {completedIds.length} из {study.selectedIds.length}. Для итогового отчёта завершите интервью с остальными участниками.</p>
              <p className="mt-2">Ожидают завершения: {remainingIds.map(id => `#${id}`).join(', ')}.</p>
              <button className="app-button-secondary mt-3 min-h-12 px-5" onClick={() => { setActiveId(remainingIds[0]); update({ stage: 2 }); }}>Продолжить оставшиеся интервью</button>
              {study.type === 'qualitative' && completedIds.length > 0 && <><p className="mt-3">Предварительный отчёт включает только {completedIds.length} завершённых интервью. Остальные участники не включаются в анализ.</p><button className={`${button} mt-3`} onClick={() => report(true)}>Сформировать предварительный отчёт по {completedIds.length} интервью</button></>}
            </div>}
            <p className="text-sm leading-6 text-gray-600">Сводка и графики строятся из сохранённых данных. Для тематической интерпретации нажмите «Добавить анализ». Скачать отчёт можно без дополнительного запроса к модели.</p>
            <div className="flex flex-wrap items-center gap-4"><button className="app-button-secondary min-h-12 px-5" disabled={!interviewsComplete(study)} onClick={() => report()}>{study.report ? 'Обновить анализ' : 'Добавить анализ тем и мотивов'}</button><Link className="text-sm font-bold text-blue-700 underline" href={`/report?id=${study.researchId}`}>Открыть отчёт на отдельной странице ↗</Link></div>
            <PDFReportButton study={study} allowPartial/>
            {(completedIds.length>0||study.responses.length>0)&&<ReportPreview study={readyReportStudy(study,true)}/>}
            <h3 className="text-xl font-black">Анкета и интервью каждого участника</h3>{study.selectedIds.map(id => <details className="editorial-card p-5" key={id}><summary className="cursor-pointer font-bold">#{id} {study.population.find(p => p.id === id)?.name}</summary><div className="mt-4"><Comparison study={study} id={id} /></div></details>)}
            <p className="text-sm text-gray-500">Все ответы синтетические. Эти результаты не заменяют эмпирическое исследование и не позволяют оценить реальное общественное мнение.</p>
          </div>}
          {study.stage!==3&&<ModelingBasis study={study}/>}<div className="mt-10 flex flex-wrap gap-4 border-t border-gray-200 pt-6"><button className="app-button-secondary min-h-12 px-5" onClick={download}>Резервная копия проекта JSON</button><a href={`/study?type=${study.type}`} className="app-button-secondary min-h-12 px-5">Новый проект</a></div>
          </fieldset>
        </>}
      </div>
    </section>
  </main>;
}
function Quantitative({ study }: { study: Study }) {
  return <section className="space-y-6" aria-label="Количественные результаты">{distributions(study).map(q => <div key={q.id} className="editorial-card p-5"><h3 className="mb-4 font-black">{q.text}</h3><table className="w-full text-left text-sm"><thead><tr><th>Ответ</th><th>Число</th><th>% ответивших</th><th className="hidden sm:table-cell">Распределение</th></tr></thead><tbody>{q.distribution.map(d => { const answered = q.distribution.reduce((sum, row) => sum + row.count, 0); const percent = answered ? d.count / answered * 100 : 0; return <tr key={d.option} className="border-t border-gray-200"><td className="py-3 pr-2">{d.option}</td><td>{d.count}</td><td>{percent.toFixed(1)}%</td><td className="hidden w-1/3 sm:table-cell"><div className="h-3 rounded bg-gray-100"><div className="h-3 rounded bg-blue-600" style={{ width: `${percent}%` }} /></div></td></tr>; })}</tbody></table></div>)}</section>;
}
function Comparison({ study, id }: { study: Study; id: number }) {
  return <div className="grid gap-5 md:grid-cols-2"><div><h4 className="mb-3 font-black">Количественная анкета</h4>{study.questionnaire.length ? study.questionnaire.map(q => <p key={q.id} className="mb-3"><strong>{q.text}</strong><br />{study.responses.find(r => r.respondentId === id)?.answers[q.id] ?? 'Ответ ещё не получен'}</p>) : <p>В качественном исследовании анкета не проводилась.</p>}</div><div><h4 className="mb-3 font-black">Расшифровка интервью</h4>{study.interviews[id]?.length ? study.interviews[id].map((turn, i) => <div className="mb-4" key={i}><p className="font-bold">{turn.question}</p><p className="mt-2 whitespace-pre-wrap leading-7">{answerLanguageIssue(turn.answer,`${study.topic} ${study.question} ${turn.question}`) ? 'В старом ответе обнаружена речь на другом языке. Запустите интервью ещё раз: этот вопрос будет обновлён, а исходный ответ останется в резервной копии проекта.' : turn.answer}</p></div>) : <p>Интервью ещё не проведено.</p>}</div></div>;
}
