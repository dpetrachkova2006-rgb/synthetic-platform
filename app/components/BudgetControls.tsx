'use client';
import { useEffect,useState } from 'react';
import { readStudies,saveStudy,type Study } from '../lib/study';
import { defaultBudget } from '../lib/researchEconomy';
export default function BudgetControls(){
  const [study,setStudy]=useState<Study|null>(null);
  useEffect(()=>{const read=()=>{try{setStudy(readStudies().find(p=>p.researchId===localStorage.getItem('research_id'))??null);}catch{}};const timer=setTimeout(read,0);window.addEventListener('research-saved',read);return()=>{clearTimeout(timer);window.removeEventListener('research-saved',read);};},[]);
  if(!study) return null;
  const budget=study.budget??defaultBudget;
  function update(patch:Partial<typeof budget>){if(study)saveStudy({...study,budget:{...budget,...patch}});}
  return <aside className="my-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm"><p>Бюджет исследования · использовано запросов: {study.usage?.requests??0}; токенов: {study.usage?.tokens??0}{study.usage?.estimated?' (приблизительно)':''}. Повторная генерация сохранённых ответов не требуется.</p><div className="mt-3 flex flex-wrap gap-4"><label>Максимум запросов <input aria-label="Максимум запросов" className="w-24 rounded border p-2" type="number" min="1" max="1000" value={budget.maxRequests} onChange={e=>update({maxRequests:Math.max(1,Math.min(1000,Number(e.target.value)||1))})}/></label><label>Максимум токенов <input aria-label="Максимум токенов" className="w-32 rounded border p-2" type="number" min="10000" max="1000000" value={budget.maxTokens} onChange={e=>update({maxTokens:Math.max(10000,Math.min(1000000,Number(e.target.value)||10000))})}/></label></div><p className="mt-2 text-gray-600">Профили создаются локально. До запуска выборки резервируется около 3000 токенов на гипотезу позиций; ответы и анализ оплачиваются отдельно по серверному тарифу. При серверной модели OpenRouter :free стоимость $0, но дневная квота аккаунта общая; для платных моделей нужно учитывать их тариф.</p></aside>;
}
