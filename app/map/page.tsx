"use client";

import { useEffect, useState } from "react";

import { getPopulation } from "../lib/populationStorage";

import {
  generateResearchReport,
  ResearchReport
} from "../lib/reportGenerator";



type Respondent = {

id:number;

name:string;

age:number;

city:string;

gender:string;

segment:string;

interests:string[];

values:string[];

opinion:string;

answer:string;

};





export default function MapPage(){


const [population,setPopulation] =
useState<Respondent[]>([]);


const [selected,setSelected] =
useState<Respondent | null>(null);


const [topic,setTopic] =
useState("");


const [question,setQuestion] =
useState("");


const [report,setReport] =
useState<ResearchReport | null>(null);






useEffect(()=>{


const data =
getPopulation();


setPopulation(data);



const savedTopic =
localStorage.getItem(
"research_topic"
) || "";



const savedQuestion =
localStorage.getItem(
"research_question"
) || "";



setTopic(savedTopic);

setQuestion(savedQuestion);




if(data.length){


const result =

generateResearchReport(

{
topic:savedTopic,

question:savedQuestion

},

data

);



setReport(result);


}



},[]);







return (

<main className="
min-h-screen
bg-gradient-to-b
from-white
to-blue-50
p-10
">


<div className="
max-w-7xl
mx-auto
">


<h1 className="
text-5xl
font-black
">

Результаты исследования

</h1>



<p className="
mt-3
text-gray-500
">

{topic}

</p>






<div className="
mt-8
grid
grid-cols-3
gap-6
">






<div className="
col-span-2
bg-white
rounded-3xl
shadow
p-8
">



<h2 className="
text-2xl
font-bold
">

🗺 Карта респондентов

</h2>



<p className="
mt-3
">

Всего участников:

<b>

{" "}

{population.length}

</b>

</p>





<div className="
mt-6
grid
grid-cols-3
gap-4
">


{

population
.slice(0,30)
.map(person=>(


<button

key={person.id}

onClick={()=>setSelected(person)}

className="
bg-blue-50
rounded-2xl
p-4
text-left
hover:scale-105
transition
"


>


<div className="
font-bold
">

👤 {person.name}

</div>


<div>

{person.age} лет

</div>


<div>

{person.city}

</div>


<div className="
mt-2
text-sm
font-bold
">

{person.segment}

</div>


</button>


))


}



</div>



</div>









<div className="
bg-white
rounded-3xl
shadow
p-8
">


<h2 className="
text-3xl
font-black
">

📄 Отчёт исследования

</h2>




<p className="
mt-4
font-bold
">

{question}

</p>







{

report && (

<>





<div className="
mt-6
grid
grid-cols-3
gap-3
text-center
">


<div className="
bg-green-100
rounded-xl
p-4
">

🟢

<br/>

<b>

{report.statistics.positive}%

</b>

<br/>

Позитив

</div>





<div className="
bg-gray-100
rounded-xl
p-4
">

⚪

<br/>

<b>

{report.statistics.neutral}%

</b>

<br/>

Нейтрально

</div>





<div className="
bg-red-100
rounded-xl
p-4
">

🔴

<br/>

<b>

{report.statistics.negative}%

</b>

<br/>

Критика

</div>


</div>








<div className="
mt-6
bg-blue-50
rounded-2xl
p-5
">


<h3 className="
font-black
">

Краткое резюме

</h3>


<p className="
mt-3
leading-relaxed
">

{report.summary}

</p>


</div>









<div className="
mt-6
bg-gray-50
rounded-2xl
p-5
">


<h3 className="
font-black
">

👥 Портрет аудитории

</h3>


<p className="
mt-3
text-sm
">

{report.audience}

</p>


</div>









<div className="
mt-6
">


<h3 className="
font-black
">

💡 Инсайты

</h3>



<ul className="
mt-3
list-disc
ml-5
text-sm
">

{

report.insights.map(

(item,index)=>(

<li key={index}>

{item}

</li>

)

)

}

</ul>



</div>









<div className="
mt-6
">


<h3 className="
font-black
">

🎯 Рекомендации

</h3>




<ul className="
mt-3
list-disc
ml-5
text-sm
">


{

report.recommendations.map(

(item,index)=>(

<li key={index}>

{item}

</li>

)

)

}


</ul>



</div>





</>

)

}





</div>








</div>










{

selected && (



<div className="
fixed
inset-0
bg-black/40
flex
items-center
justify-center
p-10
">


<div className="
bg-white
rounded-3xl
p-10
max-w-xl
w-full
">


<button

onClick={()=>setSelected(null)}

className="
float-right
text-2xl
"

>

×


</button>



<h2 className="
text-3xl
font-black
">

{selected.name}

</h2>




<p className="
mt-4
">

{selected.age} лет · {selected.city}

</p>



<p>

Сегмент:
<b>
{" "}
{selected.segment}
</b>

</p>




<div className="
mt-6
bg-blue-50
rounded-2xl
p-5
">


<h3 className="
font-bold
">

Ответ респондента:

</h3>


<p className="
mt-3
">

{selected.answer}

</p>


</div>



</div>


</div>



)

}





</div>

</main>


)

}