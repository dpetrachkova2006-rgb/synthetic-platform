"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";


function AIChatContent() {


const searchParams = useSearchParams();


const topic =
searchParams.get("topic") || "";


const [question,setQuestion] =
useState("");



return (

<div className="
min-h-screen
bg-blue-50
p-10
">


<div className="
max-w-3xl
mx-auto
bg-white
rounded-3xl
shadow
p-10
">


<h1 className="
text-4xl
font-black
">

AI исследование

</h1>


<p className="
mt-4
text-gray-500
">

Тема:

</p>


<p className="
font-bold
">

{topic || "Без темы"}

</p>



<textarea

className="
mt-8
w-full
border
rounded-2xl
p-4
"

placeholder="
Введите вопрос исследования
"

value={question}

onChange={(e)=>
setQuestion(e.target.value)
}


/>



</div>


</div>

)

}





export default function AIChatPage(){


return (

<Suspense

fallback={

<div className="
p-10
">

Загрузка...

</div>

}

>


<AIChatContent />


</Suspense>

)


}