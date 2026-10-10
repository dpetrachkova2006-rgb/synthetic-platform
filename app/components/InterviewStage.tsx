'use client';

import { ArrowRight, Check, LoaderCircle, MessageCircle } from 'lucide-react';
import { answerLanguageIssue } from '../lib/respondentLanguage';
import { completedInterviewIds, guideQuestions, type Study } from '../lib/study';
import { guideValid } from '../lib/studyFlow';
import QuestionGenerator from './QuestionGenerator';
import type { QuestionDraft } from '../lib/questionDrafts';

type Props = {
  study: Study; busy: string; error: string; activeId: number | null;
  onGuide: (text: string) => void; onError: (text: string) => void;
  onQuestions: (questions: QuestionDraft[]) => void;
  questionsBusy: boolean; questionsPending: boolean; onQuestionsBusy: (busy: boolean) => void; onQuestionsPending: (pending: boolean) => void;
  onRun: () => void; onCancel: () => void; onReport: () => void; onView: (id: number) => void;
};

export default function InterviewStage({ study, busy, error, activeId, onGuide, onQuestions, questionsBusy, questionsPending, onQuestionsBusy, onQuestionsPending, onError, onRun, onCancel, onReport, onView }: Props) {
  const questions = guideQuestions(study.guide);
  const completed = completedInterviewIds(study);
  const finished = study.selectedIds.length > 0 && completed.length === study.selectedIds.length;
  const started = Object.values(study.interviews).some(turns => turns.length > 0);
  const valid = guideValid(study);
  const viewedId = activeId !== null && study.selectedIds.includes(activeId) ? activeId : study.selectedIds[0];
  const respondent = study.population.find(p => p.id === viewedId);
  const turns = questions.map(question => study.interviews[viewedId]?.find(t => t.question === question));
  const answerCount = study.selectedIds.reduce((sum, id) => sum + questions.filter(q => study.interviews[id]?.some(t => t.question === q && t.answer.trim() && !answerLanguageIssue(t.answer, `${study.topic} ${study.question} ${q}`))).length, 0);
  const total = questions.length * study.selectedIds.length;

  function start() {
    if (!valid) {
      onError('Добавьте от 1 до 30 разных вопросов, каждый с новой строки.');
      document.getElementById('interview-guide')?.focus();
      return;
    }
    onRun();
  }

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold tracking-tight">Глубинные интервью</h2><p className="mt-2 text-sm text-gray-600">{finished?'Все ответы получены. Откройте отчёт или прочитайте интервью ниже.':'Добавьте вопросы и запустите интервью. Участники уже выбраны.'}</p></div>
    <div className="grid items-start gap-5 lg:grid-cols-[1.2fr_1fr]"><section className="interview-panel">
      <h3 className="flex items-center gap-3 font-bold"><span className="interview-step">1</span>Вопросы для участников</h3>
      {started ? <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-blue-700">Посмотреть вопросы · {questions.length}</summary><ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-6">{questions.map(q => <li key={q}>{q}</li>)}</ol></details> : <>
        <div className="mt-4"><QuestionGenerator key={study.researchId} projectId={study.researchId} mode="interview" topic={study.topic} brief={study.question} existing={questions} surveyQuestions={study.questionnaire.map(q=>q.text)} disabled={!!busy} onApply={onQuestions} onBusyChange={onQuestionsBusy} onPendingChange={onQuestionsPending}/></div>
        <label htmlFor="interview-guide" className="mt-4 block text-sm text-gray-600">Один вопрос на строку</label>
        <textarea id="interview-guide" className="app-input mt-2 min-h-32" value={study.guide} disabled={!!busy} placeholder={'Что для вас важно при выборе?\nС какими сложностями вы сталкиваетесь?\nЧто вы хотели бы изменить?'} onChange={e => onGuide(e.target.value)}/>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs"><span className="text-gray-500">{questions.length} / 30 вопросов</span><details><summary className="cursor-pointer font-semibold text-blue-700">Загрузить вопросы из файла</summary><input aria-label="Файл с вопросами интервью" className="mt-3 max-w-full text-sm" type="file" accept=".txt,text/plain" disabled={!!busy} onChange={async e => {
          try { const file = e.target.files?.[0]; if (file) { if (file.size > 60000) throw new Error('Выберите текстовый файл размером до 60 КБ.'); onGuide(await file.text()); } } catch (e) { onError(e instanceof Error ? e.message : 'Не удалось прочитать файл.'); }
        }}/></details></div>
      </>}
    </section>
    <section id="interview-actions" className="interview-panel interview-panel--action">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-3 font-bold"><span className="interview-step">{finished?<Check size={16}/>:2}</span>{finished?'Интервью готовы':'Получите ответы'}</h3><span className="text-sm text-gray-600">Завершено: {completed.length} / {study.selectedIds.length}</span></div>
      {busy ? <div className="mt-5"><p role="status" aria-live="polite" className="flex items-center gap-3 text-sm font-semibold text-blue-800"><LoaderCircle size={18} className="shrink-0 animate-spin"/>{busy}</p><div role="progressbar" aria-label="Полученные ответы" aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={answerCount} className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:`${total ? answerCount / total * 100 : 0}%`}}/></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs"><span className="text-gray-600">Ответы сохраняются автоматически. Можно остановить и продолжить.</span><button type="button" className="font-bold text-blue-700 underline" onClick={onCancel}>Остановить</button></div></div> : <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" className="app-button inline-flex min-h-12 items-center justify-center gap-3 px-6" disabled={questionsBusy || questionsPending || !study.selectedIds.length} onClick={finished?onReport:start}>{finished?'Перейти к отчёту':started?'Продолжить интервью':'Начать интервью'}<ArrowRight size={18}/></button>
        <p className="max-w-sm text-xs leading-5 text-gray-600">{finished?(study.type==='mixed'?'В отчёте будут опрос, цитаты и результаты интервью.':'В отчёте будут цитаты и результаты интервью.'):started?'Будут получены только недостающие ответы.':'Интервью пройдут по очереди со всеми выбранными участниками.'}</p>
      </div>}
      {error&&<p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">{error}</p>}
      {!busy&&!finished&&completed.length>0&&study.type==='qualitative'&&<button type="button" className="mt-4 text-xs font-semibold text-blue-700 underline" onClick={onReport}>Посмотреть предварительный отчёт</button>}
    </section></div>
    {started && <section className="interview-panel">
      <div className="flex items-center gap-3"><MessageCircle size={20} className="text-blue-600"/><h3 className="text-lg font-bold">Ответы участников</h3></div>
      <label className="mt-4 block text-sm font-semibold">Участник<select className="app-input mt-2" disabled={!!busy} value={viewedId} onChange={e => onView(Number(e.target.value))}>{study.selectedIds.map(id => <option key={id} value={id}>#{id} {study.population.find(p=>p.id===id)?.name} · {completed.includes(id)?'интервью готово':'в процессе'}</option>)}</select></label>
      {respondent&&<>
        <p className="mt-4 text-sm text-gray-600">{respondent.age} лет · {respondent.city} · {respondent.employment}</p>
        {study.questionnaire.length>0&&<details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold text-blue-700">Ответы этого участника на опрос</summary><div className="mt-3 space-y-3">{study.questionnaire.map(q=><p key={q.id}><span className="text-gray-600">{q.text}</span><br/><strong>{study.responses.find(r=>r.respondentId===viewedId)?.answers[q.id]??'Ответ ещё не получен'}</strong></p>)}</div></details>}
        <div className="mt-5 space-y-6">{questions.map((q,i)=><article key={q} className="border-t border-gray-100 pt-5"><p className="text-sm font-bold"><span className="mr-2 text-blue-600">{i+1}.</span>{q}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">{turns[i]?.answer ? answerLanguageIssue(turns[i]!.answer,`${study.topic} ${study.question} ${q}`)?'Нужно обновить ответ. Нажмите «Продолжить интервью».':turns[i]!.answer : 'Ответ ещё не получен.'}</p></article>)}</div>
      </>}
    </section>}
  </div>;
}
