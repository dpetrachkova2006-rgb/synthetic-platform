'use client';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { type Study } from '../lib/study';
import { readyReportStudy, reportBlocker } from '../lib/studyFlow';
export default function PDFReportButton({study,allowPartial=false}:{study:Study;allowPartial?:boolean}) {
  const pdfStudy=useMemo(()=>readyReportStudy(study,allowPartial),[study,allowPartial]);
  const blocker=reportBlocker(pdfStudy);
  const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [generatedStudy,setGeneratedStudy]=useState<Study|null>(null);
  const currentURL=generatedStudy===pdfStudy?url:'';
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  async function generate(){if(blocker||busy)return;setBusy(true);setError('');try{const response=await fetch('/api/report-pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pdfStudy)});if(!response.ok){const data=await response.json();throw new Error(data.error);}setUrl(URL.createObjectURL(await response.blob()));setGeneratedStudy(pdfStudy);}catch(e){setError(e instanceof Error?e.message:'Не удалось сформировать файл.');}finally{setBusy(false);}}
  return <section className="my-6 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-blue-200 bg-blue-50/60 p-5" aria-label="Скачать отчёт"><div className="flex items-start gap-3"><FileText size={24} className="mt-1 shrink-0 text-blue-600"/><div><h3 className="font-bold">Отчёт для сохранения и обсуждения</h3><p className="mt-1 max-w-xl text-sm leading-6 text-gray-600">Оформленный PDF с диаграммами, цитатами и источниками. Формируется из сохранённых данных без расхода запросов к нейросети.</p>{blocker&&<p className="mt-2 text-sm font-semibold text-amber-800">Чтобы скачать: {blocker}</p>}</div></div><div className="flex flex-wrap items-center gap-3">{currentURL?<><a className="app-button inline-flex items-center gap-2 px-5 py-3" href={currentURL} download={`исследование-${study.researchId}.pdf`}><Download size={17}/>Скачать PDF</a><a className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700" href={currentURL} target="_blank" rel="noopener noreferrer">Открыть<ExternalLink size={15}/></a></>:<button className="app-button px-5 py-3" disabled={busy||!!blocker} onClick={generate}>{busy?'Формируем PDF…':'Подготовить PDF'}</button>}</div>{error&&<p role="alert" className="w-full text-sm text-red-700">{error}</p>}</section>;
}
