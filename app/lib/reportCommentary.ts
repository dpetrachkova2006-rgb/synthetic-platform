import { commentaryFromInsights } from './reportInsights';
import { makeReportData, quoteExcerpt } from './reportData';
import type { Study } from './study';

/** Older reports can expose their existing, verified interpretation immediately. */
export function reportCommentary(s:Study) {
  const data=makeReportData(s);
  const synthesis=commentaryFromInsights(s,s.type==='quantitative'?[]:data.included);
  if(synthesis.length)return synthesis;
  if(data.themes.length)return data.themes.map(theme=>({title:theme.title,paragraphs:[
    theme.interpretation,
    ...theme.quotes.slice(0,2).map(q=>`Участник №${q.respondentId} объясняет свой опыт так: «${quoteExcerpt(q.quote,500)}»`)
  ]}));
  if(data.survey.length)return data.survey.slice(0,3).map(q=>{
    const total=q.distribution.reduce((n,r)=>n+r.count,0),max=Math.max(...q.distribution.map(r=>r.count));
    const leaders=q.distribution.filter(r=>r.count===max),others=q.distribution.filter(r=>r.count>0&&r.count<max);
    const percent=(count:number)=>`${(count/total*100).toLocaleString('ru-RU',{maximumFractionDigits:1})}%`;
    const opening=leaders.length>1?`В ответах на вопрос «${q.text}» нет единственного лидера: ${leaders.map(r=>`«${r.option}»`).join(' и ')} получили по ${max} ответов (${percent(max)}).`:`На вопрос «${q.text}» чаще выбирали «${leaders[0].option}»: ${max} из ${total} ответов (${percent(max)}).`;
    const alternatives=others.length?` Другие ответы тоже представлены: ${others.map(r=>`«${r.option}» — ${r.count} (${percent(r.count)})`).join('; ')}.`:'';
    const interpretation=max===total?'В этой смоделированной группе ответы совпали. Это показывает однородность полученного результата, но не устанавливает, насколько такое мнение распространено среди реальных людей.':leaders.length>1?'Равные ведущие доли не позволяют выбрать один преобладающий ответ. При дальнейшем исследовании стоит сопоставить опыт участников с разным выбором.':max<=total/2?'Лидирующий вариант не объединяет больше половины ответивших. Сводить результат к этому ответу было бы неточно: другие варианты вместе занимают не меньшую долю.':'В группе есть преобладающий вариант, но остальные ответы показывают, что выбор участников различается. Для объяснения этих различий нужны причины выбора, а не только частоты.';
    return {title:q.text,paragraphs:[opening+alternatives,interpretation]};
  });
  return [];
}

/** Show interpretation beside its verified interview evidence, including saved reports. */
export function interviewCommentary(s:Study) {
  if(s.type==='quantitative')return [];
  const data=makeReportData(s);
  const insights=data.analysisInsights.filter(insight=>insight.quotes.length);
  if(insights.length)return insights.map(insight=>({
    title:insight.title,interpretation:insight.explanation,nextStep:insight.nextStep,
    quotes:insight.quotes.filter((q,i,all)=>all.findIndex(other=>other.respondentId===q.respondentId&&other.question===q.question&&other.quote===q.quote)===i)
  }));
  return data.themes.map(theme=>({title:theme.title,interpretation:theme.interpretation,nextStep:'',quotes:theme.quotes}));
}

/** Lead with verified analytical excerpts, then include other saved interview voices. */
export function mainInterviewQuotes(s: Study) {
  if (s.type === 'quantitative') return [];
  const data = makeReportData(s);
  const candidates = [
    ...data.analysisInsights.flatMap(insight => insight.quotes.map(q => ({...q, theme: insight.title}))),
    ...data.themes.flatMap(theme => theme.quotes.map(q => ({...q, theme: theme.title}))),
    ...data.quotes.map(q => ({...q, theme: ''})),
  ].filter(q => q.quote.trim() && data.quotes.some(source => source.respondentId === q.respondentId && source.question === q.question && source.quote.includes(q.quote)));
  const selected: typeof candidates = [];
  const add = (candidate: typeof candidates[number]) => {
    if (selected.length >= 4 || selected.some(q => (q.respondentId === candidate.respondentId && q.question === candidate.question) || q.quote === candidate.quote)) return;
    selected.push(candidate);
  };
  // Give different participants room before adding another answer from the same person.
  for (const candidate of candidates) {
    if (!selected.some(q => q.respondentId === candidate.respondentId)) add(candidate);
  }
  for (const candidate of candidates) add(candidate);
  return selected;
}
