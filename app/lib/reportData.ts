import { answerLanguageIssue } from './respondentLanguage';
import { completedInterviewIds, distributions, type Study } from './study';
import { reportIncludedIds } from './studyFlow';
export function makeReportData(s:Study) {
  const included=reportIncludedIds(s).filter(id=>s.type==='quantitative'||completedInterviewIds(s).includes(id));
  const survey=(s.type==='qualitative'?[]:distributions(s)).filter(q=>s.responses.some(r=>q.options.includes(r.answers[q.id])));
  const quotes=s.type==='quantitative'?s.population.filter(p=>p.answer?.trim()&&!answerLanguageIssue(p.answer,`${s.topic} ${s.question}`)).map(p=>({respondentId:p.id,question:s.question,quote:p.answer!})):included.flatMap(id=>(s.interviews[id]??[]).filter(t=>!answerLanguageIssue(t.answer,`${s.topic} ${s.question} ${t.question}`)).map(t=>({respondentId:id,question:t.question,quote:t.answer})));
  const themes=(s.themes??[]).filter(theme=>theme.quotes.length>0&&theme.quotes.every(q=>included.includes(q.respondentId)&&quotes.some(t=>t.respondentId===q.respondentId&&t.question===q.question&&t.quote.includes(q.quote))));
  const insights=survey.map(q=>{const total=q.distribution.reduce((n,r)=>n+r.count,0),max=Math.max(...q.distribution.map(r=>r.count));const leaders=q.distribution.filter(r=>r.count===max).map(r=>r.option);return {title:q.text,text:`${leaders.length>1?'Равная наибольшая доля':'Самый частый ответ'}: «${leaders.join('», «')}». ${max} из ${total} ответов (${(max/total*100).toLocaleString('ru-RU',{maximumFractionDigits:1})}%).`};});
  if(!insights.length)insights.push({title:'Материал для анализа',text:s.type==='quantitative'?`Сохранено ${quotes.length} развёрнутых ответов из ${s.population.length} профилей. Распределение позиций ниже описывает гипотезу генерации, а не ответы анкеты.`:`Сохранённые ответы: ${quotes.length}. Смоделированные интервью в отчёте: ${included.length}. ${themes.length?'Темы ниже опираются на дословные фрагменты ответов.':'Ответы сгруппированы по вопросам; тематическая интерпретация появится после анализа.'}`});
  return {included,survey,quotes,themes,insights,preliminary:s.type!=='quantitative'&&included.length<s.selectedIds.length};
}
export function profileFrequencies(s:Study,key:'gender'|'city'|'education') {
  const counts=new Map<string,number>();for(const p of s.population){const value=p[key]||'Не указано';counts.set(value,(counts.get(value)??0)+1);}return [...counts].sort((a,b)=>b[1]-a[1]);
}

/** Preserve every analytical section of earlier quantitative reports in exports. */
export function legacyReportText(raw:string):string {
  const {report:r}=JSON.parse(raw) as {report:import('./reportGenerator').AIResearchReport};
  if(!r||typeof r!=='object')return '';
  const parts:string[]=[];
  function section(title:string,value:string|string[]|undefined){const text=Array.isArray(value)?value.join('\n'):value;if(text?.trim())parts.push(`${title}\n${text}`);}
  section('Краткие выводы',r.briefConclusions);section('Аналитический обзор',r.analyticalOverview);section('Анализ распределения',r.distributionAnalysis);section('Демографические различия',r.demographicAnalysis);section('Аргументы поддержки',r.supportArguments);section('Аргументы против',r.opposeArguments);section('Нейтральные позиции',r.neutralArguments);
  for(const insight of r.insights??[])section(insight.title,`${insight.description}\nОснование: ${insight.basis}\nУверенность модели: ${insight.confidence}`);
  section('Неожиданные наблюдения',r.unexpectedFindings);section('Противоречия',r.contradictions);section('Исследовательские гипотезы',r.researchHypotheses);section('Дальнейшее исследование',r.furtherResearch);
  if(r.methodology)section('Методология',Object.values(r.methodology));section('Ограничения',r.limitations);
  return parts.join('\n\n');
}

/** Keep the overview readable; complete source answers remain in the appendix. */
export function quoteExcerpt(text:string,limit=480):string {
  if(text.length<=limit)return text;
  const prefix=text.slice(0,limit),sentences=[...prefix.matchAll(/[.!?…](?:\s|$)/g)];
  const last=sentences.at(-1);const end=last&&last.index!>100?last.index!+1:Math.max(100,prefix.lastIndexOf(' '));
  return text.slice(0,end).trimEnd()+'…';
}
