'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ReportPreview from '../components/ReportPreview';
import LegacyReport from '../components/LegacyReport';
import PDFReportButton from '../components/PDFReportButton';
import { getPopulation } from '../lib/populationStorage';
import { readStudies, type Study } from '../lib/study';
import { readyReportStudy } from '../lib/studyFlow';
import { legacyReportText } from '../lib/reportData';
export default function ReportPage(){return <Suspense fallback={<main className="p-10">Загружаем отчёт…</main>}><ReportContent/></Suspense>;}
function ReportContent(){
  const params=useSearchParams(),id=params.get('id');
  const [study,setStudy]=useState<Study|null>(null),[ready,setReady]=useState(false),[error,setError]=useState('');
  useEffect(()=>{const timer=window.setTimeout(()=>{try{const active=localStorage.getItem('research_id');let project=readStudies().find(s=>s.researchId===(id??active));if(project){if(project.type==='quantitative'){const isActive=project.researchId===active;const raw=isActive?localStorage.getItem('latest_ai_research_report'):project.legacy?.latest_ai_research_report;project={...project,population:isActive?getPopulation():project.population,legacy:{...project.legacy,...(raw?{latest_ai_research_report:raw}:{})},report:raw?legacyReportText(raw):project.report};}setStudy(readyReportStudy(project,true));}else if(id)setError('Проект не найден в этом браузере. Откройте «Мои исследования» на устройстве, где проводили моделирование.');}catch(e){setError(e instanceof Error?e.message:'Не удалось открыть отчёт.');}finally{setReady(true);}},0);return()=>window.clearTimeout(timer);},[id]);
  if(!ready)return <main className="p-10">Загружаем отчёт…</main>;
  if(!study)return <main className="mx-auto max-w-4xl px-5 py-12"><section className="editorial-card p-8"><p className="eyebrow">Исследовательский отчёт</p><h1 className="mt-4 text-3xl font-black">Откройте своё исследование</h1><p className="mt-4 leading-7 text-gray-600">{error||'Отчёты хранятся вместе с проектами в этом браузере. Выберите исследование, чтобы увидеть результаты и скачать PDF.'}</p><Link href="/studies" className="app-button mt-6 inline-block px-5 py-3">Мои исследования →</Link></section></main>;
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8"><div className="flex flex-wrap items-center justify-between gap-4"><Link className="text-sm font-semibold text-gray-600" href={study.type==='quantitative'?'/map':`/study?id=${study.researchId}`}>← К исследованию</Link><Link className="text-sm font-semibold text-gray-600" href="/studies">Мои исследования</Link></div><h1 className="mt-8 text-3xl font-black tracking-tight">Результаты исследования</h1><p className="mt-3 text-sm leading-6 text-gray-500">Начните с краткой сводки. Ниже — распределения, цитаты и пояснения, на чём основан отчёт.</p><PDFReportButton study={study} allowPartial/><ReportPreview study={study}/>{study.type==='quantitative'&&study.legacy?.latest_ai_research_report&&<details className="report-detail mt-6"><summary>Подробный анализ и дополнительные распределения</summary><LegacyReport study={study}/></details>}</main>;
}
