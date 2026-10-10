import { answerLanguageIssue } from './respondentLanguage';
import { completedInterviewIds, guideQuestions, interviewsComplete, surveyComplete, type Study } from './study';
export type FlowCheck = {label:string;done:boolean;help:string;target:string;stage:number};
export function questionnaireValid(s:Study) {
  return s.questionnaire.length>0&&s.questionnaire.length<=10&&s.questionnaire.every(q=>q.text.trim()&&q.options.length>=2&&q.options.length<=12&&q.options.every(o=>o.trim()&&o.length<=200)&&new Set(q.options).size===q.options.length);
}
export function guideValid(s:Study) {const q=guideQuestions(s.guide);return q.length>0&&q.length<=30&&new Set(q).size===q.length&&q.every(text=>text.length<=2000);}
/** Launching the whole group does not depend on the participant being viewed. */
export function interviewTargets(s:Study,all:boolean,activeId:number|null):number[] {
  if(all)return [...s.selectedIds];
  const id=activeId!==null&&s.selectedIds.includes(activeId)?activeId:s.selectedIds[0];
  return id===undefined?[]:[id];
}
export function stageChecks(s:Study,stage:number):FlowCheck[] {
  const population={label:'Сформировать выборку',done:s.population.length>0,help:'Укажите размер группы и нажмите «Сформировать выборку».',target:'sample-settings',stage:0};
  const selection={label:'Выбрать участников интервью',done:s.selectedIds.length>0,help:'Отметьте участников в таблице или добавьте найденных по фильтрам.',target:'respondent-selection',stage:1};
  const reason={label:'Объяснить принцип отбора',done:!!s.selectionReason.trim(),help:'Напишите, почему выбрали этих участников. Например: разные ответы и возраст.',target:'selection-reason',stage:1};
  const guide={label:'Добавить вопросы интервью',done:guideValid(s),help:'Введите от 1 до 30 разных вопросов, по одному на строку.',target:'interview-guide',stage:2};
  const finished=completedInterviewIds(s).length;
  const interviews={label:`Завершить интервью: ${finished} из ${s.selectedIds.length}`,done:interviewsComplete(s),help:guideValid(s)?'Нажмите «Начать интервью» или «Продолжить интервью».':'Добавьте вопросы, затем нажмите «Начать интервью».',target:'interview-actions',stage:2};
  if(stage===0)return s.type==='qualitative'?[population]:[population,{label:'Подготовить анкету',done:questionnaireValid(s),help:'Добавьте вопрос и минимум два разных непустых варианта ответа.',target:'questionnaire-editor',stage:0},{label:`Получить ответы: ${s.responses.length} из ${s.population.length}`,done:surveyComplete(s),help:'После создания выборки и анкеты нажмите «Запустить моделирование ответов».',target:'survey-actions',stage:0}];
  if(stage===1)return [selection,reason];
  if(stage===2)return [guide,interviews];
  return [population,...(s.type==='mixed'?[{label:'Завершить опрос',done:surveyComplete(s),help:'Продолжите моделирование ответов на первом этапе.',target:'survey-actions',stage:0}]:[]),selection,guide,interviews];
}
export function stageAccess(s:Study,stage:number):FlowCheck|null {
  if(stage===0)return null;
  return [...stageChecks(s,0),...(stage>=2?stageChecks(s,1):[])].find(check=>!check.done)??null;
}
export function reportIncludedIds(s:Study) {
  return s.type==='quantitative'?s.population.filter(p=>p.answer?.trim()&&!answerLanguageIssue(p.answer,`${s.topic} ${s.question}`)).map(p=>p.id):s.reportRespondentIds??s.selectedIds;
}
export function reportBlocker(s:Study):string|null {
  if(!s.population.length)return 'Сначала сформируйте выборку.';
  if(s.type==='quantitative') {
    const answers=s.population.filter(p=>p.answer?.trim());
    if(answers.some(p=>answerLanguageIssue(p.answer!,`${s.topic} ${s.question}`)))return 'Обновите ответы с речью на другом языке в карточках респондентов, затем сформируйте отчёт.';
    return answers.length||surveyComplete(s)?null:'Получите ответы респондентов на карте или завершите анкету. Одних профилей недостаточно для отчёта.';
  }
  if(s.type==='mixed'&&!surveyComplete(s))return 'Завершите количественный опрос.';
  const ids=reportIncludedIds(s),complete=completedInterviewIds(s);
  if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!complete.includes(id))||(s.type==='mixed'&&ids.length!==s.selectedIds.length))return 'Завершите интервью выбранных участников. В качественном исследовании можно скачать предварительный отчёт по завершённым интервью.';
  return null;
}
export function readyReportStudy(s:Study,allowPartial=false):Study {
  const complete=completedInterviewIds(s);
  const ids=allowPartial&&s.type==='qualitative'&&complete.length<s.selectedIds.length?complete:s.selectedIds;
  const oldIds=s.reportRespondentIds??s.selectedIds;
  const unchanged=ids.length===oldIds.length&&ids.every(id=>oldIds.includes(id))&&(s.type==='quantitative'||ids.every(id=>complete.includes(id)));
  return {...s,reportRespondentIds:ids,report:unchanged?s.report:'',themes:unchanged?s.themes:[]};
}
