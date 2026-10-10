import type { Study } from './study';
import { answerLanguageIssue } from './respondentLanguage';
export type AnalysisFact = { id: string; title: string; rows: { label: string; count: number; total: number }[] };
export type ResearchInsight = { title: string; finding: string; explanation: string; nextStep: string; factIds: string[]; quoteIds: number[]; facts: AnalysisFact[]; quotes: {respondentId:number;question:string;quote:string}[] };
/** Count saved answers, never inferred attitudes from generated profiles. */
export function comparisonFacts(s: Study): AnalysisFact[] {
  if (s.type === 'qualitative') return [];
  const profiles = new Map(s.population.map(p => [p.id,p]));
  const candidates: {fact:AnalysisFact;spread:number}[]=[];
  for (const q of s.questionnaire) {
    const answers=s.responses.filter(r=>q.options.includes(r.answers[q.id]));
    for (const field of ['gender','age'] as const) {
      const groups=new Map<string,typeof answers>();
      for(const r of answers){const p=profiles.get(r.respondentId);if(!p)continue;const name=field==='gender'?p.gender:p.age<30?'До 30 лет':p.age<45?'30–44 года':p.age<60?'45–59 лет':'60 лет и старше';const group=groups.get(name)??[];group.push(r);groups.set(name,group);}
      if(groups.size<2)continue;
      for(const option of q.options){const rows=[...groups].map(([name,rs])=>({label:name,count:rs.filter(r=>r.answers[q.id]===option).length,total:rs.length}));const shares=rows.map(r=>r.count/r.total);candidates.push({fact:{id:`group:${q.id}:${field}:${q.options.indexOf(option)}`,title:`«${q.text}»: ответ «${option}», сравнение ${field==='gender'?'по полу':'по возрасту'}`,rows},spread:Math.max(...shares)-Math.min(...shares)});}
    }
    for(const other of s.questionnaire.filter(o=>o.id!==q.id).slice(0,3)){
      for(const option of other.options){const rows=q.options.map(label=>{const rs=answers.filter(r=>r.answers[q.id]===label&&other.options.includes(r.answers[other.id]));return {label,count:rs.filter(r=>r.answers[other.id]===option).length,total:rs.length};}).filter(r=>r.total);if(rows.length<2)continue;const shares=rows.map(r=>r.count/r.total);candidates.push({fact:{id:`cross:${q.id}:${other.id}:${other.options.indexOf(option)}`,title:`Выбор «${option}» на вопрос «${other.text}» среди выбравших варианты вопроса «${q.text}»`,rows},spread:Math.max(...shares)-Math.min(...shares)});}
    }
  }
  return candidates.sort((a,b)=>b.spread-a.spread).slice(0,18).map(c=>c.fact);
}
export function analysisFacts(evidence:{quantitative?:{id?:string;text:string;distribution:{option:string;count:number}[]}[];comparisons?:AnalysisFact[]}):AnalysisFact[]{
  return [...(evidence.quantitative??[]).map((q,i)=>({id:`survey:${q.id??i}`,title:q.text,rows:q.distribution.map(r=>({label:r.option,count:r.count,total:q.distribution.reduce((n,x)=>n+x.count,0)}))})),...(evidence.comparisons??[])];
}
export function analysisSignature(s:Study,included:number[]):string{
  const raw=JSON.stringify([s.type,s.topic,s.question,s.selectionReason,s.questionnaire,s.responses,s.population.map(p=>[p.id,p.name,p.age,p.gender,p.city,p.education,p.income]),included,included.map(id=>s.interviews[id])]);
  let first=2166136261,second=5381;for(let n=0;n<raw.length;n++){const c=raw.charCodeAt(n);first=Math.imul(first^c,16777619);second=Math.imul(second,33)^c;}
  return `${raw.length}:${first>>>0}:${second>>>0}`;
}
export function savedInsights(s:Study,included:number[]):ResearchInsight[]{
  if(!s.report||s.analysisSignature!==analysisSignature(s,included))return [];
  const context=`${s.topic} ${s.question}`;
  return (s.analysisInsights??[]).filter(i=>i.facts?.length+i.quotes?.length>0&&!answerLanguageIssue([i.title,i.finding,i.explanation,i.nextStep].join(' '),context)&&!/[\d%％]/.test(i.title+i.finding+i.explanation+i.nextStep)&&i.quotes.every(q=>included.includes(q.respondentId)&&s.interviews[q.respondentId]?.some(t=>t.question===q.question&&t.answer.includes(q.quote))));
}
export const INSIGHT_INSTRUCTION = `Ты исследователь и редактор аналитического отчёта. Создай от трёх до пяти содержательных выводов; при скудных данных достаточно одного или двух. Заголовок — конкретный вывод, а не название вопроса или общие слова. finding объясняет, что действительно обнаружено; explanation связывает наблюдения и раскрывает механизм, условие, барьер или альтернативное объяснение; nextStep предлагает конкретную проверку или действие, связанное с этим выводом. Ищи различия между группами, расхождения оценки и поведения, разные причины одинакового выбора, условия изменения мнения и неудовлетворённые потребности. Не выдумывай противоречия ради интересного текста. Не повторяй лидирующий ответ вместо анализа. Если причины не изучались, прямо называй их гипотезой. Не выдавай связь ответов за причинность. Учитывай маленькие базы групп. Не делай выводов о реальном населении: это синтетическое моделирование. Каждый вывод подкрепи существующими factIds и/или quoteIds. Ссылки должны подтверждать именно этот вывод; сравнительный вывод об интервью подкрепляй цитатами разных участников. Пиши связно, конкретно и только по-русски. Не используй цифры и проценты в прозе: проверенные значения будут показаны рядом из фактов. Не придумывай источники или динамику во времени. Верни JSON {"report":"","themes":[],"insights":[{"title":"вывод","finding":"наблюдение в двух предложениях","explanation":"связное объяснение в трёх предложениях","nextStep":"конкретная проверка","factIds":[],"quoteIds":[]}]}. themes нужны для карты тем интервью: до трёх тем с interpretation и quotes [{"quoteId":1}]. report оставь пустым.`;
