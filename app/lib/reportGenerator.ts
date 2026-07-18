export type ReportInput = {
  topic: string;
  question: string;
};


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





export type ResearchReport = {

  summary:string;

  audience:string;

  positives:string[];

  negatives:string[];

  insights:string[];

  recommendations:string[];

  statistics:{

    positive:number;

    neutral:number;

    negative:number;

  };


  demographics:{

    averageAge:number;

    cities:string[];

    segments:string[];

  };

};







function detectSentiment(

answer:string

):

"positive" | "neutral" | "negative" {



const text =

answer.toLowerCase();



const positiveWords = [

"нрав",

"удоб",

"полез",

"интерес",

"важно",

"помог",

"развит",

"эффектив"

];



const negativeWords = [

"плох",

"дорог",

"слож",

"раздраж",

"лишн",

"проблем",

"неудоб"

];





let positive = 0;

let negative = 0;





positiveWords.forEach(word=>{


if(text.includes(word)){

positive++;

}


});





negativeWords.forEach(word=>{


if(text.includes(word)){

negative++;

}


});





if(positive > negative){

return "positive";

}



if(negative > positive){

return "negative";

}



return "neutral";


}








function calculatePercent(

value:number,

total:number

){


if(total===0){

return 0;

}


return Math.round(

value / total * 100

);


}









export function generateResearchReport(

input:ReportInput,

respondents:Respondent[]

):ResearchReport {



const total =

respondents.length || 1;





let positive = 0;

let neutral = 0;

let negative = 0;





respondents.forEach(person=>{


const result =

detectSentiment(

person.answer

);



if(result==="positive"){

positive++;

}

else if(result==="negative"){

negative++;

}

else{

neutral++;

}



});







const ages =

respondents.map(

r=>r.age

);





const averageAge =

Math.round(

ages.reduce(

(sum,age)=>sum+age,

0

) /

(ages.length || 1)

);







const cities =

[

...new Set(

respondents.map(

r=>r.city

)

)

];







const segments =

[

...new Set(

respondents.map(

r=>r.segment

)

)

];










return {


summary:

`Исследование по теме "${input.topic}" показывает распределение мнений аудитории.

Положительное отношение демонстрируют ${calculatePercent(
positive,
total
)}% респондентов, нейтральное — ${calculatePercent(
neutral,
total
)}%, критическое — ${calculatePercent(
negative,
total
)}%.

Основные оценки связаны с личным опытом пользователей, удобством использования и практической ценностью.`,





audience:

`В исследовании участвовало ${total} синтетических респондентов.

Средний возраст участников — ${averageAge} лет.

Основные города:
${cities.slice(0,5).join(", ")}.

Основные сегменты:
${segments.join(", ")}.`,







positives:[

"Пользователи чаще всего оценивают тему через практическую пользу.",

"Удобство и понятность являются важными факторами отношения.",

"Часть аудитории видит возможности для развития и улучшения."

],






negatives:[

"Часть респондентов отмечает существующие ограничения.",

"Некоторые участники относятся осторожно из-за недостатка информации.",

"Негативные оценки связаны с неудобством или отсутствием необходимости."

],






insights:[

`Средний возраст аудитории составляет ${averageAge} лет.`,

"Отношение к теме зависит от личного опыта и сценария использования.",

"Разные сегменты аудитории формируют разные ожидания."

],






recommendations:[

"Учитывать особенности разных групп пользователей.",

"Коммуницировать конкретную пользу и сценарии использования.",

"Работать с сомнениями и барьерами аудитории."

],







statistics:{


positive:

calculatePercent(
positive,
total
),



neutral:

calculatePercent(
neutral,
total
),



negative:

calculatePercent(
negative,
total
)



},







demographics:{


averageAge,

cities:cities.slice(0,5),

segments


}





};



}