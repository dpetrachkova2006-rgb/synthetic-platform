"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";



function RespondentContent(){


const params = useSearchParams();



const name =
params.get("name")
||
"Анна";





const respondents:any = {


"Анна":{

age:22,

city:"Москва",

job:"Студентка",

segment:"AI-энтузиасты",

education:"Высшее образование",

interests:[

"искусственный интеллект",
"образование",
"технологии"

],

behavior:

"Использует ИИ несколько раз в неделю для учебы и поиска информации.",


quote:

"ИИ помогает мне экономить время и быстрее разбираться в сложных темах."

},





"Максим":{

age:24,

city:"Казань",

job:"Начинающий разработчик",

segment:"Практики",

education:"Техническое образование",

interests:[

"программирование",
"стартапы",
"технологии"

],

behavior:

"Использует цифровые инструменты для работы.",


quote:

"Для меня технологии ценны тогда, когда они дают результат."

}



};





const person =
respondents[name]
||
respondents["Анна"];









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

Synthetic Respondent Profile

</div>







<h1 className="
mt-8
text-6xl
font-black
">

{name}

</h1>





<p className="
mt-4
text-xl
text-gray-600
">

Цифровой профиль синтетического респондента

</p>









<div className="
mt-10
grid
grid-cols-2
gap-6
">





<div className="
bg-white
rounded-3xl
shadow-xl
border
p-8
">


<h2 className="
text-2xl
font-bold
">

Демография

</h2>



<p className="mt-5">

Возраст:
<b className="ml-2">
{person.age}
</b>

</p>


<p className="mt-3">

Город:
<b className="ml-2">
{person.city}
</b>

</p>


<p className="mt-3">

Занятие:
<b className="ml-2">
{person.job}
</b>

</p>


<p className="mt-3">

Образование:
<b className="ml-2">
{person.education}
</b>

</p>


</div>







<div className="
bg-white
rounded-3xl
shadow-xl
border
p-8
">


<h2 className="
text-2xl
font-bold
">

Сегмент

</h2>



<p className="
mt-5
text-blue-600
text-xl
font-bold
">

{person.segment}

</p>


<h3 className="
mt-8
font-bold
">

Интересы

</h3>



<div className="
mt-3
space-y-2
">


{

person.interests.map(

(item:string)=>(

<p key={item}>
• {item}
</p>

)

)

}


</div>



</div>







</div>









<div className="
mt-8
bg-white
rounded-3xl
shadow-xl
border
p-8
">


<h2 className="
text-3xl
font-black
">

Поведение

</h2>



<p className="
mt-5
text-lg
">

{person.behavior}

</p>



</div>








<div className="
mt-8
bg-white
rounded-3xl
shadow-xl
border
p-8
">


<h2 className="
text-3xl
font-black
">

Мнение респондента

</h2>



<p className="
mt-5
text-xl
italic
">

"{person.quote}"

</p>



</div>








</div>


</main>


)


}







export default function RespondentPage(){


return (

<Suspense

fallback={

<div className="
min-h-screen
flex
items-center
justify-center
text-xl
">

Загрузка профиля...

</div>

}

>


<RespondentContent />


</Suspense>

)


}