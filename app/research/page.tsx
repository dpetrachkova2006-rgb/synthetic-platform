"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


export default function ResearchPage(){


const router = useRouter();


const [topic,setTopic] = useState("");

const [question,setQuestion] = useState("");

const [size,setSize] = useState("10000");





function startResearch(){


if(!topic || !question){

alert("Заполните тему и вопрос");

return;

}



localStorage.setItem(
"research_topic",
topic
);



localStorage.setItem(
"research_question",
question
);



localStorage.setItem(
"research_size",
size
);



router.push("/generation");


}






return (

<main className="
min-h-screen
bg-gradient-to-b
from-white
to-blue-50
flex
items-center
justify-center
px-10
">



<div className="
bg-white
rounded-3xl
shadow-xl
border
p-12
w-[700px]
">



<h1 className="
text-5xl
font-black
">

Новое исследование

</h1>




<p className="
mt-4
text-gray-600
">

Настройте параметры синтетической выборки

</p>





<div className="
mt-10
space-y-6
">






<div>

<label className="font-bold">

Тема исследования

</label>


<input

value={topic}

onChange={(e)=>
setTopic(e.target.value)
}

placeholder="Например: отношение к Telegram"

className="
mt-2
w-full
border
rounded-2xl
p-4
"

/>


</div>







<div>

<label className="font-bold">

Главный вопрос

</label>


<textarea

value={question}

onChange={(e)=>
setQuestion(e.target.value)
}


placeholder="Как вы относитесь к продукту?"

className="
mt-2
w-full
border
rounded-2xl
p-4
h-32
"

/>


</div>








<div>

<label className="font-bold">

Размер выборки

</label>



<select

value={size}

onChange={(e)=>
setSize(e.target.value)
}


className="
mt-2
w-full
border
rounded-2xl
p-4
"

>


<option value="1000">
1000 респондентов
</option>


<option value="5000">
5000 респондентов
</option>


<option value="10000">
10000 респондентов
</option>


<option value="50000">
50000 респондентов
</option>



</select>


</div>









<button

onClick={startResearch}

className="
w-full
bg-blue-600
text-white
rounded-2xl
py-5
font-bold
text-xl
"

>

Создать исследование →

</button>





</div>





</div>


</main>


)


}