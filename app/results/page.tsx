"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ModelingBasis from "../components/ModelingBasis";
import { getPopulation } from "../lib/populationStorage";
import type { SyntheticRespondent } from "../lib/syntheticGenerator";
import Link from "next/link";



function ResultsContent() {


  const searchParams = useSearchParams();



  const audience =
    searchParams.get("audience") || "Все респонденты";





  const name =
    searchParams.get("name") || "Исследование";





  const [population, setPopulation] = useState<SyntheticRespondent[]>([]);
  useEffect(() => { const timer=setTimeout(()=>setPopulation(getPopulation()),0);return()=>clearTimeout(timer); },[]);
  const group = population.filter(p => audience==='Молодежь 18-25' ? p.age>=18&&p.age<=25 : audience==='Предприниматели' ? /предприним|бизнес/i.test(p.employment) : audience==='Родители' ? /дет/i.test(p.familyStatus) : true);
  const values = [...new Set(group.flatMap(p=>p.values ?? []))].map(v=>[v, group.length ? Math.round(group.filter(p=>p.values?.includes(v)).length*100/group.length) : 0] as [string,number]);
  const current = { age: group.length ? `${(group.reduce((n,p)=>n+p.age,0)/group.length).toFixed(1)} лет` : 'Нет данных', accuracy: 'Не проверена', interests: [...new Set(group.flatMap(p=>p.interests ?? []))], values, quotes: group.filter(p=>p.answer?.trim()).slice(0,8).map(p=>({id:p.id,answer:p.answer!})) };









  return (

    <main className="
      min-h-screen
      bg-gradient-to-b
      from-white
      to-blue-50
      px-10
      py-12
    ">


      <div className="max-w-7xl mx-auto">


        <div className="
          inline-flex
          px-5
          py-2
          rounded-full
          bg-green-50
          text-green-700
          border
          border-green-200
        ">

          Сохранённые модельные данные

        </div>





        <ModelingBasis /><p className="mt-4 text-sm text-gray-600">Показатели ниже рассчитаны из сохранённых профилей. Ценности и интересы — модельные характеристики, цитаты — сохранённые смоделированные ответы. Это не данные опроса людей.</p><h1 className="
          mt-8
          text-6xl
          font-black
        ">

          {name}

        </h1>



        <p className="
          mt-5
          text-xl
          text-gray-600
        ">

          Синтетическая популяция:
          {" "}
          {group.length} респондентов

        </p>






        <div className="
          grid
          grid-cols-3
          gap-6
          mt-12
        ">


          {[
            ["Аудитория",audience],
            ["Средний возраст",current.age],
            ["Репрезентативность",current.accuracy]

          ].map(([title,value])=>(


            <div
              key={title}
              className="
                bg-white
                rounded-3xl
                border
                shadow-lg
                p-8
              "
            >

              <p className="text-gray-500">
                {title}
              </p>


              <p className="
                mt-3
                text-3xl
                font-bold
                text-blue-600
              ">
                {value}
              </p>


            </div>


          ))}


        </div>







        <div className="
          grid
          grid-cols-2
          gap-8
          mt-10
        ">



          <div className="
            bg-white
            rounded-3xl
            border
            shadow-lg
            p-10
          ">


            <h2 className="
              text-3xl
              font-bold
            ">

              Главные ценности

            </h2>



            <div className="mt-8 space-y-5">


              {current.values.map(
                ([item,value]:[string,number])=>(


                <div key={item}>


                  <div className="flex justify-between">

                    <span>{item}</span>

                    <b>{value}%</b>

                  </div>



                  <div className="
                    mt-2
                    h-3
                    bg-blue-100
                    rounded-full
                  ">

                    <div

                      className="
                        h-full
                        bg-blue-600
                        rounded-full
                      "

                      style={{
                        width:`${value}%`
                      }}

                    />

                  </div>


                </div>


              ))}


            </div>


          </div>







          <div className="
            bg-white
            rounded-3xl
            border
            shadow-lg
            p-10
          ">


            <h2 className="text-3xl font-bold">

              Интересы

            </h2>



            <div className="
              mt-8
              flex
              flex-wrap
              gap-4
            ">


              {current.interests.map(
                (item:string)=>(


                <div

                  key={item}

                  className="
                    px-5
                    py-3
                    rounded-full
                    bg-blue-50
                    text-blue-700
                  "

                >

                  {item}

                </div>


              ))}


            </div>


          </div>


        </div>







        <Link

          href={`/respondents?audience=${audience}&size=${group.length}&name=${name}`}

          className="
            mt-10
            block
            w-full
            text-center
            rounded-2xl
            bg-blue-600
            text-white
            py-5
            text-lg
          "

        >

          Посмотреть синтетических респондентов →

        </Link>







        <div className="
          mt-10
          bg-white
          rounded-3xl
          border
          shadow-lg
          p-10
        ">


          <h2 className="
            text-3xl
            font-bold
          ">

            Голоса синтетических респондентов

          </h2>




          <div className="
            grid
            grid-cols-3
            gap-6
            mt-8
          ">


            {current.quotes.map(
              (quote)=>(


              <div

                key={quote.id}

                className="
                  bg-blue-50
                  rounded-2xl
                  p-6
                "

              >

                <p className="font-bold">
                  Респондент #{quote.id}
                </p>


                <p className="mt-4 text-gray-700">

                  &quot;{quote.answer}&quot;

                </p>


              </div>


            ))}


          </div>


        </div>






      </div>


    </main>

  );

}






export default function ResultsPage(){


  return (

    <Suspense

      fallback={

        <div className="
          min-h-screen
          flex
          items-center
          justify-center
        ">

          Загрузка результатов...

        </div>

      }

    >

      <ResultsContent />

    </Suspense>

  );

}