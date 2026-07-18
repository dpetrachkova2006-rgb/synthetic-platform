"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { generateRespondents } from "../lib/syntheticGenerator";
import { savePopulation } from "../lib/populationStorage";



export default function GenerationPage(){


const [progress,setProgress] =
useState(0);


const [generated,setGenerated] =
useState(false);


const [started,setStarted] =
useState(false);



const [topic,setTopic] =
useState("");

const [question,setQuestion] =
useState("");



const [size,setSize] =
useState(10000);



const [gender,setGender] =
useState("Все");



const [age,setAge] =
useState("Все");







useEffect(()=>{


setTopic(

localStorage.getItem(
"research_topic"
) || ""

);


setQuestion(

localStorage.getItem(
"research_question"
) || ""

);



},[]);









function startGeneration(){



setStarted(true);


setProgress(0);




const timer = setInterval(()=>{



setProgress(prev=>{


if(prev >= 100){



clearInterval(timer);





const population =

generateRespondents(

size,

topic,

question,

{

gender,

age

}

);





savePopulation(population);





localStorage.setItem(

"research_gender",

gender

);



localStorage.setItem(

"research_age",

age

);



setGenerated(true);



return 100;



}



return prev + 4;



});



},150);



}









return (

<main className="
min-h-screen
flex
items-center
justify-center
bg-gradient-to-b
from-white
to-blue-50
px-10
">



<div className="
bg-white
rounded-3xl
shadow-xl
border
p-12
w-[650px]
text-center
">



<div className="text-6xl">

🧠

</div>




<h1 className="
mt-8
text-4xl
font-black
">

Создание синтетического исследования

</h1>








{

!started && (


<div className="
mt-8
text-left
space-y-5
">





<div>

<label className="font-bold">

Размер выборки

</label>


<select

value={size}

onChange={(e)=>
setSize(
Number(e.target.value)
)
}

className="
w-full
mt-2
border
rounded-xl
p-3
"


>


<option value={1000}>
1000
</option>


<option value={5000}>
5000
</option>


<option value={10000}>
10000
</option>


<option value={20000}>
20000
</option>


</select>


</div>









<div>


<label className="font-bold">

Возраст

</label>



<select

value={age}

onChange={(e)=>
setAge(e.target.value)
}


className="
w-full
mt-2
border
rounded-xl
p-3
"

>


<option>
Все
</option>


<option>
18-25
</option>


<option>
26-35
</option>


<option>
36-45
</option>


<option>
46+
</option>


</select>



</div>









<div>


<label className="font-bold">

Пол

</label>



<select

value={gender}

onChange={(e)=>
setGender(e.target.value)
}


className="
w-full
mt-2
border
rounded-xl
p-3
"

>


<option>
Все
</option>


<option>
Женщины
</option>


<option>
Мужчины
</option>


</select>



</div>







<button

onClick={startGeneration}

className="
mt-8
w-full
bg-blue-600
text-white
rounded-2xl
py-4
font-bold
text-xl
"

>

Создать исследование

</button>



</div>



)

}









{

started && (


<>


<div className="
mt-6
bg-blue-50
rounded-2xl
p-5
text-left
">


<p>

<b>Тема:</b>

<br/>

{topic || "Без темы"}

</p>



<p className="mt-4">

<b>Вопрос:</b>

<br/>

{question || "Без вопроса"}

</p>



<p className="mt-4">

<b>Выборка:</b>

<br/>

{size} респондентов

</p>



<p className="mt-4">

<b>Параметры:</b>

<br/>

{age}, {gender}

</p>



</div>







<div className="
mt-10
h-5
bg-blue-100
rounded-full
overflow-hidden
">


<div

className="
h-full
bg-blue-600
transition-all
"

style={{

width:`${progress}%`

}}

/>


</div>






<p className="
mt-4
text-blue-600
font-bold
text-xl
">

{progress}%

</p>





{

generated && (


<Link

href="/map"

className="
mt-10
block
bg-blue-600
text-white
rounded-2xl
py-5
font-bold
text-xl
"

>

Открыть карту →

</Link>


)

}



</>


)

}





</div>


</main>

)

}