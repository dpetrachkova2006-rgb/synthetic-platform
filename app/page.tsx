"use client";

import Link from "next/link";
import { useEffect, useState } from "react";


export default function Home(){


const [hasResearch,setHasResearch] =
useState(false);


const [topic,setTopic] =
useState("");



useEffect(()=>{


const savedTopic =
localStorage.getItem("research_topic");


if(savedTopic){

setHasResearch(true);

setTopic(savedTopic);

}


},[]);







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
max-w-6xl
mx-auto
">





<h1 className="
text-6xl
font-black
">

Платформа синтетических респондентов

</h1>






<p className="
mt-5
text-xl
text-gray-600
">

Создание синтетических исследований

</p>








<div className="
mt-12
grid
grid-cols-2
gap-8
">







<Link

href="/research"

className="
bg-blue-600
text-white
rounded-3xl
p-10
shadow-xl
hover:scale-105
transition
"

>



<h2 className="
text-3xl
font-black
">

+ Новое исследование

</h2>



<p className="
mt-4
text-lg
">

Создать исследование на любую тему

</p>



</Link>









{

hasResearch && (



<Link

href="/map"

className="
bg-white
border
rounded-3xl
p-10
shadow-xl
hover:scale-105
transition
"

>


<h2 className="
text-3xl
font-black
">

Текущее исследование

</h2>




<p className="
mt-5
text-gray-600
">

{topic}

</p>




<div className="
mt-6
inline-block
bg-green-100
text-green-700
px-5
py-2
rounded-full
font-bold
">

Завершено

</div>



</Link>



)

}





</div>







</div>


</main>


)

}