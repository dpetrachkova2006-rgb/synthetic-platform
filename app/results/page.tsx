"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";



function ResultsContent() {


  const searchParams = useSearchParams();



  const audience =
    searchParams.get("audience") || "Все респонденты";


  const size =
    searchParams.get("size") || "10000";


  const name =
    searchParams.get("name") || "Исследование";





  const data:any = {


    "Молодежь 18-25": {

      age:"22 года",

      accuracy:"95%",

      interests:[
        "Технологии",
        "Игры",
        "Музыка",
        "Образование"
      ],

      values:[
        ["Самореализация",82],
        ["Свобода",75],
        ["Развитие",71],
        ["Стабильность",50]
      ],

      quotes:[
        "Нейросети помогают мне учиться быстрее",
        "ИИ — это будущее работы",
        "Главный страх — зависимость от технологий"
      ]

    },


    "Предприниматели": {

      age:"41 год",

      accuracy:"93%",


      interests:[
        "Бизнес",
        "Инвестиции",
        "Экономика",
        "Технологии"
      ],


      values:[
        ["Рост бизнеса",85],
        ["Прибыль",78],
        ["Свобода",70],
        ["Стабильность",65]
      ],


      quotes:[
        "ИИ помогает автоматизировать процессы",
        "Главный вопрос — эффективность",
        "Важно сохранить конкурентоспособность"
      ]

    },



    "Родители": {

      age:"39 лет",

      accuracy:"92%",


      interests:[
        "Семья",
        "Образование",
        "Безопасность",
        "Здоровье"
      ],


      values:[
        ["Безопасность",86],
        ["Семья",82],
        ["Стабильность",78],
        ["Развитие детей",70]
      ],


      quotes:[
        "Главное — чтобы технологии помогали детям",
        "Нужно контролировать влияние ИИ",
        "Образование должно меняться"
      ]

    },



    "Геймеры": {

      age:"24 года",

      accuracy:"96%",


      interests:[
        "Игры",
        "Киберспорт",
        "Стриминг",
        "Технологии"
      ],


      values:[
        ["Инновации",88],
        ["Свобода",77],
        ["Сообщество",72],
        ["Развлечение",69]
      ],


      quotes:[
        "ИИ меняет создание игр",
        "Персонализация станет важнее",
        "Игровые миры будут умнее"
      ]

    }



  };





  const current =
    data[audience] || data["Молодежь 18-25"];








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

          ✓ Исследование завершено

        </div>





        <h1 className="
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
          {size} респондентов

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
            ["Точность модели",current.accuracy]

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

          href={`/respondents?audience=${audience}&size=${size}&name=${name}`}

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
              (quote:string,index:number)=>(


              <div

                key={quote}

                className="
                  bg-blue-50
                  rounded-2xl
                  p-6
                "

              >

                <p className="font-bold">
                  Респондент #{index+1}
                </p>


                <p className="mt-4 text-gray-700">

                  "{quote}"

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