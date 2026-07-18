export type SyntheticRespondent = {

  id:number;

  name:string;

  age:number;

  city:string;

  gender:string;

  interests:string[];

  values:string[];

  opinion:string;

  answer:string;

};





type GenerationSettings = {

  gender:string;

  age:string;

};








const names = [

"Анна",
"Максим",
"Мария",
"Александр",
"Елена",
"Дмитрий",
"София",
"Иван",
"Полина",
"Артём",
"Ольга",
"Михаил"

];







const cities = [

"Москва",
"Санкт-Петербург",
"Казань",
"Екатеринбург",
"Новосибирск",
"Владивосток",
"Ростов-на-Дону",
"Нижний Новгород"

];








const interests = [

"технологии",

"социальные сети",

"образование",

"путешествия",

"спорт",

"музыка",

"кино",

"саморазвитие",

"финансы",

"здоровье"

];








const values = [

"удобство",

"экономия времени",

"стабильность",

"развитие",

"свобода",

"общение",

"качество",

"новые возможности"

];









function randomItem<T>(array:T[]):T{


return array[

Math.floor(

Math.random()*array.length

)

];


}








function generateAge(

range:string

){



switch(range){


case "18-25":

return Math.floor(

18 + Math.random()*8

);



case "26-35":

return Math.floor(

26 + Math.random()*10

);



case "36-45":

return Math.floor(

36 + Math.random()*10

);



case "46+":

return Math.floor(

46 + Math.random()*25

);



default:

return Math.floor(

18 + Math.random()*55

);



}



}









function generateGender(

gender:string

){



if(gender==="Женщины"){

return "женщина";

}



if(gender==="Мужчины"){

return "мужчина";

}



return Math.random()>0.5

?

"женщина"

:

"мужчина";



}









function createAnswer(

person:any,

topic:string,

question:string

){



const starts = [

"Я считаю, что",

"По моему опыту",

"Для меня",

"Мне кажется, что",

"Я использую это потому что"

];





const reasons = [

"это удобно в повседневной жизни",

"это помогает экономить время",

"это даёт новые возможности",

"это зависит от конкретной ситуации",

"главное — чтобы это решало реальные задачи"

];





return `${randomItem(starts)} ${topic || "эта тема"} — ${randomItem(reasons)}. ${question ? "Отвечая на вопрос исследования, могу сказать, что " : ""}${randomItem(reasons)}.`;


}









export function generateRespondents(

count:number,

topic:string,

question:string,

settings:GenerationSettings

):SyntheticRespondent[]{



const respondents:SyntheticRespondent[]=[];



for(let i=0;i<count;i++){



const personGender =

generateGender(

settings.gender

);



const personAge =

generateAge(

settings.age

);







const person = {


id:i+1,


name:

randomItem(names),



age:

personAge,



city:

randomItem(cities),



gender:

personGender,



interests:[

randomItem(interests),

randomItem(interests)

],



values:[

randomItem(values),

randomItem(values)

],



opinion:

randomItem(values),



answer:""



};






person.answer =

createAnswer(

person,

topic,

question

);





respondents.push(person);



}





return respondents;



}