const KEY = "synthetic_population";


export function savePopulation(population:any[]){


try {


const data = JSON.stringify(population);



localStorage.setItem(

KEY,

data

);



}

catch(error){



console.warn(
"Слишком большая выборка для localStorage. Сохраняем сокращенную версию."
);




// оставляем максимум 1000 респондентов

const shortPopulation =

population.slice(0,1000);



localStorage.setItem(

KEY,

JSON.stringify(shortPopulation)

);



}



}







export function getPopulation(){



if(typeof window === "undefined"){

return [];

}



const data =

localStorage.getItem(KEY);



if(!data){

return [];

}



try {


return JSON.parse(data);



}

catch{


return [];

}



}