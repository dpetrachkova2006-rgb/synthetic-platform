"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";



function RespondentsContent() {


  const searchParams = useSearchParams();


  const audience =
    searchParams.get("audience") || "Молодежь 18-25";



  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<any>(null);




  const populations:any = {


    "Молодежь 18-25":[

      {
        name:"Анна",
        age:22,
        city:"Москва",
        job:"Студентка",
        interests:["ИИ","Музыка","Образование"],
        values:["Развитие","Свобода"],
        opinion:"ИИ помогает мне учиться быстрее."
      },

      {
        name:"Максим",
        age:24,
        city:"Казань",
        job:"Разработчик",
        interests:["Игры","IT","Технологии"],
        values:["Инновации","Карьера"],
        opinion:"Нейросети изменят рынок труда."
      },

      {
        name:"Мария",
        age:20,
        city:"Санкт-Петербург",
        job:"Студентка",
        interests:["Соцсети","Дизайн","Культура"],
        values:["Творчество","Самореализация"],
        opinion:"ИИ помогает создавать новые идеи."
      }

    ],





    "Предприниматели":[

      {
        name:"Дмитрий",
        age:40,
        city:"Москва",
        job:"Предприниматель",
        interests:["Бизнес","Инвестиции","ИИ"],
        values:["Рост","Эффективность"],
        opinion:"ИИ помогает снижать расходы."
      },


      {
        name:"Александр",
        age:45,
        city:"Новосибирск",
        job:"Владелец компании",
        interests:["Экономика","Управление","Технологии"],
        values:["Прибыль","Стабильность"],
        opinion:"Главное в ИИ — практическая польза."
      }


    ],




    "Геймеры":[

      {
        name:"Алексей",
        age:21,
        city:"Москва",
        job:"Стример",
        interests:["Игры","Киберспорт","YouTube"],
        values:["Свобода","Сообщество"],
        opinion:"ИИ сделает игры более персональными."
      },


      {
        name:"Илья",
        age:26,
        city:"Екатеринбург",
        job:"Game designer",
        interests:["Игры","Разработка","VR"],
        values:["Инновации","Творчество"],
        opinion:"Будущее игр связано с ИИ."
      }


    ],




    "Родители":[

      {
        name:"Елена",
        age:39,
        city:"Москва",
        job:"Мама двоих детей",
        interests:["Семья","Образование","Здоровье"],
        values:["Безопасность","Стабильность"],
        opinion:"Технологии должны помогать детям."
      }


    ]


  };





  let respondents =
    populations[audience] || populations["Молодежь 18-25"];




  respondents = [
    ...respondents,
    ...respondents,
    ...respondents,
    ...respondents
  ];






  const filtered = respondents.filter((person:any)=>


    person.name
    .toLowerCase()
    .includes(search.toLowerCase())


    ||

    person.job
    .toLowerCase()
    .includes(search.toLowerCase())


  );







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
        max-w-7xl
        mx-auto
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

          Синтетическая популяция

        </div>





        <h1 className="
          mt-8
          text-6xl
          font-black
        ">

          {audience}

        </h1>





        <p className="
          mt-5
          text-xl
          text-gray-600
        ">

          Создано 10 000 синтетических респондентов

        </p>






        <input

          placeholder="Поиск респондента..."

          value={search}

          onChange={(e)=>setSearch(e.target.value)}

          className="
            mt-10
            w-full
            rounded-2xl
            border
            px-6
            py-4
            text-lg
          "

        />







        <div className="
          grid
          grid-cols-4
          gap-6
          mt-10
        ">



          {filtered.map((person:any,index:number)=>(



            <button

              key={person.name + index}

              onClick={()=>setSelected(person)}

              className="
                text-left
                bg-white
                rounded-3xl
                border
                shadow-lg
                p-7
                hover:scale-105
                transition
              "

            >



              <div className="
                text-4xl
              ">

                👤

              </div>



              <h2 className="
                mt-5
                text-2xl
                font-bold
              ">

                {person.name}

              </h2>




              <p className="text-gray-500">

                {person.age} лет · {person.city}

              </p>




              <p className="
                mt-4
                text-blue-600
              ">

                {person.job}

              </p>




            </button>



          ))}



        </div>









        {selected && (


          <div className="
            fixed
            inset-0
            bg-black/30
            flex
            items-center
            justify-center
            px-10
          ">


            <div className="
              bg-white
              rounded-3xl
              max-w-xl
              w-full
              p-10
            ">


              <button

                onClick={()=>setSelected(null)}

                className="
                  float-right
                "

              >

                ✕

              </button>





              <h2 className="
                text-4xl
                font-black
              ">

                {selected.name}

              </h2>




              <p className="mt-3 text-gray-500">

                {selected.age} лет · {selected.city}

              </p>




              <h3 className="mt-8 font-bold text-xl">
                Профессия
              </h3>

              <p>
                {selected.job}
              </p>





              <h3 className="mt-6 font-bold text-xl">
                Интересы
              </h3>


              <p>
                {selected.interests.join(", ")}
              </p>





              <h3 className="mt-6 font-bold text-xl">
                Ценности
              </h3>


              <p>
                {selected.values.join(", ")}
              </p>





              <h3 className="mt-6 font-bold text-xl">
                Мнение
              </h3>


              <p className="italic">

                "{selected.opinion}"

              </p>



            </div>


          </div>


        )}



      </div>


    </main>


  );

}







export default function RespondentsPage(){


  return (

    <Suspense

      fallback={

        <div className="p-10 text-xl">

          Загрузка респондентов...

        </div>

      }

    >

      <RespondentsContent />

    </Suspense>

  );


}