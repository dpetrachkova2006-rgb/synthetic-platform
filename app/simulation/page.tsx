"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";



function SimulationContent() {


  const router = useRouter();

  const searchParams = useSearchParams();



  const audience =
    searchParams.get("audience") || "Все респонденты";


  const size =
    searchParams.get("size") || "10000";


  const name =
    searchParams.get("name") || "Новое исследование";


  const method =
    searchParams.get("method") || "Опрос";



  const [progress, setProgress] = useState(0);





  const steps = [

    "Анализируем целевую аудиторию",

    "Создаем демографические профили",

    "Моделируем ценности и интересы",

    "Формируем поведенческие паттерны",

    "Генерируем ответы респондентов"

  ];






  useEffect(()=>{


    const timer = setInterval(()=>{


      setProgress((prev)=>{


        if(prev >= 100){


          clearInterval(timer);



          setTimeout(()=>{


            router.push(

              `/results?audience=${audience}&size=${size}&name=${name}&method=${method}`

            );


          },1000);



          return 100;

        }



        return prev + 5;


      });



    },400);




    return ()=>clearInterval(timer);



  },[]);









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
        max-w-3xl
        w-full
        bg-white
        rounded-3xl
        shadow-xl
        border
        p-12
      ">



        <div className="
          inline-flex
          px-5
          py-2
          rounded-full
          bg-blue-50
          text-blue-700
          border
          border-blue-200
        ">

          AI Simulation

        </div>





        <h1 className="
          mt-8
          text-5xl
          font-black
        ">

          Создаем синтетическую популяцию

        </h1>





        <p className="
          mt-5
          text-gray-600
          text-xl
        ">

          {name}

        </p>





        <div className="
          mt-5
          rounded-2xl
          bg-blue-50
          p-5
        ">


          <p>
            <b>Аудитория:</b> {audience}
          </p>


          <p>
            <b>Размер:</b> {size} респондентов
          </p>


          <p>
            <b>Метод:</b> {method}
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
          mt-3
          text-right
          font-bold
          text-blue-600
        ">

          {progress}%

        </p>







        <div className="
          mt-10
          space-y-4
        ">


          {steps.map((step,index)=>(


            <div

              key={step}

              className={`
                rounded-xl
                p-4
                transition

                ${
                  progress > index*20
                  ?
                  "bg-blue-50 text-blue-700"
                  :
                  "bg-gray-50 text-gray-400"
                }

              `}

            >


              {progress > index*20
                ?
                "✓"
                :
                "○"
              }


              {" "}

              {step}


            </div>


          ))}


        </div>




      </div>



    </main>

  );

}








export default function SimulationPage(){


  return (

    <Suspense

      fallback={

        <div className="
          min-h-screen
          flex
          items-center
          justify-center
        ">

          Загрузка симуляции...

        </div>

      }

    >

      <SimulationContent />

    </Suspense>

  );


}