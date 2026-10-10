import { Check, ArrowRight } from 'lucide-react';
import type { FlowCheck } from '../lib/studyFlow';
export default function StageChecklist({checks,onResolve,title='Следующий шаг'}:{checks:FlowCheck[];onResolve:(check:FlowCheck)=>void;title?:string}) {
  const next=checks.find(check=>!check.done);
  return <aside className={`flow-checklist ${next?'':'flow-checklist--ready'}`} aria-label={title}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{next?next.label:'Всё готово — можно переходить дальше'}</p>{next&&<p className="mt-1 text-sm leading-6 text-gray-600">{next.help}</p>}</div>{next?<button type="button" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-blue-700" onClick={()=>onResolve(next)}>К действию <ArrowRight size={16}/></button>:<Check size={20} className="text-emerald-700"/>}</div>
  </aside>;
}
