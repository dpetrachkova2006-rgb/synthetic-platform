import { findRelevantResearch } from './researchContext';
import snapshot from '../data/worldbank-rus-2024.json';
import type { Study } from './study';
export type DataFrame = 'modeled' | 'wb-rus-2024';
export const STATISTICAL_SOURCE = {
  title: 'Возрастно-половая структура населения России, 20–79 лет',
  organization: 'World Bank WDI / UN Population Division, World Population Prospects',
  date: '2024, оценки на середину года', geography: 'Россия', population: 'Население России 20–79 лет',
  version: `WDI ${snapshot.rows[0].updated}; RUS 2024`, retrievedAt: snapshot.retrievedAt,
  url: 'https://databank.worldbank.org/metadataglossary/world-development-indicators/series/SP.POP.2024.MA.5Y',
  application: 'Совместное распределение пола и пятилетнего возраста: доля внутри пола × численность этого пола; нормирование в выбранной возрастной рамке. Возраст внутри пятилетнего интервала моделируется равномерно. География внутри России, образование, доход и мнения не откалиброваны. Лицензия CC BY 4.0; преобразование исходных показателей платформой.',
};
function value(id: string) { const row=snapshot.rows.find(r=>r.id===id); if(!row || !Number.isFinite(row.value) || row.value<0) throw new Error('Нет проверенных данных для '+id);return row.value; }
type DemographicCell = {gender:'женщина'|'мужчина';min:number;max:number;weight:number};
const cellCache = new Map<string, readonly DemographicCell[]>();
export function demographicCells(gender?: string, age?: {min:number;max:number}) {
  const key=JSON.stringify([gender,age]);
  const cached=cellCache.get(key);if(cached)return cached;
  const rows: DemographicCell[]=[];
  for(let min=20;min<=75;min+=5) for(const [sex,label] of [['MA','мужчина'],['FE','женщина']] as const) {
    if(gender && gender!==label) continue;
    const lo=Math.max(min,age?.min??20),hi=Math.min(min+4,age?.max??79);
    if(lo>hi) continue;
    const weight=value(`SP.POP.${min}${min+4}.${sex}.5Y`)/100*value(`SP.POP.TOTL.${sex}.IN`)*(hi-lo+1)/5;
    rows.push({gender:label,min:lo,max:hi,weight});
  }
  if(!rows.length) throw new Error('Статистическая рамка поддерживает только возраст 20–79 лет. Измените фильтр или выберите модельную выборку.');
  const immutable=Object.freeze(rows.map(r=>Object.freeze(r)));
  if(cellCache.size>=64)cellCache.clear();
  cellCache.set(key,immutable);return immutable;
}
export function drawDemographic(gender?: string, age?: {min:number;max:number}, random=Math.random) {
  const cells=demographicCells(gender,age);let draw=random()*cells.reduce((n,r)=>n+r.weight,0);let cell=cells[cells.length-1];
  for(const candidate of cells){draw-=candidate.weight;if(draw<=0){cell=candidate;break;}}
  return {gender:cell.gender,age:cell.min+Math.min(cell.max-cell.min,Math.floor(random()*(cell.max-cell.min+1)))};
}
export function sourcesForFrame(frame: DataFrame, topic = '', question = ''): NonNullable<Study['sources']> {
  const demographic = frame==='wb-rus-2024' ? [{...STATISTICAL_SOURCE}] : [];
  return [...demographic, ...findRelevantResearch(topic,question).map(r=>({title:r.title,organization:r.organization,date:r.date,geography:'Россия',population:'Население России 18+',version:'Публикация '+r.date,retrievedAt:new Date().toISOString(),application:'Исторический тематический контекст. Не применялся для калибровки ответов: вопросы и возрастная рамка могут отличаться. '+r.methodology,url:r.sourceUrl}))];
}
// No calibration based on keyword similarity. Exact population and question are required.
export function comparableQuestion(question: string, population: string, reference: {question:string;population:string}) {
  const normalize=(s:string)=>s.trim().replace(/\s+/g,' ').toLocaleLowerCase('ru');
  return normalize(question)===normalize(reference.question) && normalize(population)===normalize(reference.population);
}
