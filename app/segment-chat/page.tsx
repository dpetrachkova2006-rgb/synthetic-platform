"use client";

import { Suspense, useState } from "react";
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





function ask(){


if(!question) return;



const answers:any = {


"AI-энтузиасты":

`
Мы проанализировали 3400 синтетических респондентов.

Основные мотивы использования ИИ:

• 78% — экономия времени
• 67% — помощь в обучении
• 54% — генерация идей

Главная мысль сегмента:

"ИИ становится личным помощником
в учебе и работе."
`,



"Креативный кластер":

`
Анализ 2800 синтетических респондентов.

Основные причины:

• 81% — создание нового контента
• 64% — поиск вдохновения
• 58% — эксперименты с технологиями

Главная мысль:

"ИИ расширяет творческие возможности."
`,



"Практики":

`
Анализ 2200 синтетических респондентов.

Основные причины:

• 86% — повышение эффективности
• 71% — автоматизация задач
• 63% — экономия ресурсов

Главная мысль:

"Технологии должны давать измеримый результат."
`,



"Социально активные":

`
Анализ 1600 синтетических респондентов.

Основные мотивы:

• 85% — коммуникация
• 78% — участие в сообществах
• 70% — общественные инициативы

Главная мысль:

"Технологии должны помогать людям объединяться."
`


};


setAnswer(
answers[segment]
||
answers["AI-энтузиасты"]
);


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