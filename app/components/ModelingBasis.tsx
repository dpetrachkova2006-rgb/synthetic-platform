'use client';
import { useEffect,useState } from 'react';
import { readStudies,type Study } from '../lib/study';
import { findRelevantResearch } from '../lib/researchContext';
export default function ModelingBasis({study}: {study?:Study}) {
  const [active,setActive]=useState<Study | undefined>();
  useEffect(()=>{const timer=setTimeout(()=>{try { setActive(readStudies().find(p=>p.researchId===localStorage.getItem('research_id'))); } catch {}},0);return()=>clearTimeout(timer);},[]);
  const s=study??active;
  const references=s?findRelevantResearch(s.topic,s.question):[];
  return <aside className="my-6 rounded-xl border border-blue-100 bg-blue-50 p-5"><h2 className="text-lg font-bold">На чём основано моделирование</h2>{s?.sources?.some(source=>source.organization!=='ВЦИОМ') ? s.sources.filter(source=>source.organization!=='ВЦИОМ').map(source=><div key={source.url} className="mt-3 text-sm"><a className="font-semibold text-blue-700 underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><p className="mt-1">{source.organization} · {source.date} · {source.geography} · {source.population}</p><p>{source.application}</p><p className="mt-1 text-gray-500">Версия: {source.version}. Получено: {new Date(source.retrievedAt).toLocaleDateString('ru-RU')}.</p></div>):<p className="mt-3 text-sm">Проверенные статистические распределения для этого проекта не применялись. Характеристики профилей являются модельными допущениями.</p>}<p className="mt-3 text-sm">Образование, доход, занятость, города, интересы и мнения смоделированы. Синтетические ответы не являются результатами опроса людей. Репрезентативность не проверена.</p>{references.map(r=><div key={r.id} className="mt-4 border-t border-blue-200 pt-3 text-sm"><a className="text-blue-700 underline" href={r.sourceUrl} target="_blank" rel="noopener noreferrer">{r.organization}: {r.title}, {r.date}</a><p>{r.methodology}. Выборка: {r.sampleSize}.</p><p>{r.findings.join(' ')}</p><p className="mt-1">Контекстная публикация, не калибровка проекта. Население и вопросы могут отличаться; её проценты не подставляются в синтетические ответы.</p></div>)}</aside>;
}
