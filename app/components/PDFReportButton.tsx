'use client';
import { useEffect, useMemo, useState } from 'react';
import { completedInterviewIds, type Study } from '../lib/study';
export default function PDFReportButton({ study, allowPartial = false }: { study: Study; allowPartial?: boolean }) {
  const completed = completedInterviewIds(study);
  const preliminary = allowPartial && study.type === 'qualitative' && completed.length > 0 && completed.length < study.selectedIds.length;
  const pdfStudy = useMemo(() => ({ ...study, reportRespondentIds: preliminary ? completedInterviewIds(study) : study.selectedIds }), [study, preliminary]);
  const [url,setUrl]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [generatedStudy, setGeneratedStudy] = useState<Study | null>(null);
  const currentURL = generatedStudy === pdfStudy ? url : '';
  useEffect(() => () => { if(url) URL.revokeObjectURL(url); },[url]);
  async function generate() { setBusy(true);setError(''); try { const response=await fetch('/api/report-pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pdfStudy)}); if(!response.ok) { const data=await response.json();throw new Error(data.error); } setUrl(URL.createObjectURL(await response.blob())); setGeneratedStudy(pdfStudy); } catch(e) { setError(e instanceof Error?e.message:'Ошибка PDF.'); } finally { setBusy(false); } }
  return <div className="my-4 flex flex-wrap items-center gap-3">{currentURL ? <a className="app-button inline-block px-5 py-3" href={currentURL} download={`research-${study.researchId}.pdf`}>Скачать PDF</a> : <button className="app-button px-5 py-3" disabled={busy} onClick={generate}>{busy?'Формируем PDF…':preliminary ? 'Сформировать предварительный PDF' : 'Сформировать PDF-отчёт'}</button>}{currentURL && <a className="text-sm underline" href={currentURL} target="_blank" rel="noopener noreferrer">Открыть PDF</a>}{preliminary && <span className="text-sm text-gray-600">Включено завершённых интервью: {completed.length} / {study.selectedIds.length}</span>}{error && <p role="alert" className="text-red-700">{error}</p>}</div>;
}
