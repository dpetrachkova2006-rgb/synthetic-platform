"use client";

import { Suspense, useState } from "react";
import { getPopulation } from "../lib/populationStorage";
import { generateAIResearchReport } from "../lib/reportGenerator";
import { useSearchParams } from "next/navigation";



function SegmentChatContent(){


const searchParams = useSearchParams();


const segment =
searchParams.get("segment")
||
"AI-энтузиасты";



const [question,setQuestion] =
useState("");

const [answer,setAnswer] =
useState("");





const [busy,setBusy] = useState(false);
async function ask(){
  if(!question.trim() || busy) return;
  const people = getPopulation().filter(p => {
    const explicit=(p as typeof p & {segment?:string}).segment;
    const derived=/поддерживает/.test(p.opinion) && !/не поддерживает/.test(p.opinion)?'Поддерживает':/не поддерживает/.test(p.opinion)?'Не поддерживает':p.opinion==='затрудняется ответить'?'Не определился':p.opinion==='отказывается отвечать'?'Отказ от ответа':'Нейтральная позиция';
    return (explicit || derived)===segment;
  });
  if(!people.length){setAnswer('В сохранённой выборке нет участников этого сегмента. Выберите существующую группу на карте; готовые проценты и цитаты не подставляются.');return;}
  if(!people.some(p=>p.answer?.trim())){setAnswer(`В группе ${people.length} профилей. Сначала получите ответы участников на карте: по одним характеристикам нельзя определить их мотивы.`);return;}
  setBusy(true);setAnswer('');
  try {
    const result=await generateAIResearchReport({topic:localStorage.getItem('research_topic')||'Анализ сохранённого сегмента',question:question.trim()},people.map(p=>({...p,answer:p.answer??''})));
    setAnswer(`Сохранено профилей в группе: ${people.length}. Ответов: ${people.filter(p=>p.answer?.trim()).length}. Данные синтетические.\n\nИнтерпретация модели по сохранённым ответам:\n${result.report.briefConclusions.join('\n')}\n\n${result.report.analyticalOverview || result.report.distributionAnalysis}`);
  }catch(e){setAnswer(e instanceof Error?e.message:'Сервис анализа недоступен.');}finally{setBusy(false);}
}


return (


<main className="
min-h-screen
bg-gradient-to-b
from-white
to-blue-50
px-10
py-12
">


<div className="
max-w-5xl
mx-auto
">


<div className="
bg-blue-50
text-blue-700
inline-flex
px-5
py-2
rounded-full
">

AI Segment Research

</div>





<h1 className="
mt-8
text-6xl
font-black
">

{segment}

</h1>



<p className="
mt-5
text-xl
text-gray-600
">

Диалог с синтетической группой

</p>






<div className="
mt-10
bg-white
rounded-3xl
shadow-xl
border
p-10
">


<textarea

value={question}

onChange={
(e)=>setQuestion(e.target.value)
}

placeholder="
Например:
Почему этот сегмент использует ИИ?
"

className="
w-full
h-40
border
rounded-2xl
p-5
text-lg
"

/>





<button

onClick={ask}
disabled={busy}

className="
mt-6
w-full
bg-blue-600
text-white
rounded-2xl
py-5
text-lg
"

>

Получить мнение сегмента →

</button>



</div>






{
answer && (


<div className="
mt-10
bg-white
rounded-3xl
shadow-xl
border
p-10
">


<h2 className="
text-3xl
font-bold
">

Ответ синтетической группы

</h2>



<p className="
mt-6
whitespace-pre-line
text-lg
leading-8
">

{answer}

</p>



</div>


)
}




</div>


</main>


)



}







export default function SegmentChatPage(){


return (

<Suspense

fallback={

<div className="
min-h-screen
flex
items-center
justify-center
">

Загрузка сегмента...

</div>

}

>

<SegmentChatContent />

</Suspense>

);


}
