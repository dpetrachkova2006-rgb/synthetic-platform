"use client";

import { useState } from "react";


const respondents = [
  {
    name: "Анна",
    age: 24,
    city: "Москва",
    segment: "Молодежь",
    interests: "технологии, образование",
  },
  {
    name: "Иван",
    age: 35,
    city: "Санкт-Петербург",
    segment: "Семья",
    interests: "спорт, путешествия",
  },
  {
    name: "Мария",
    age: 29,
    city: "Казань",
    segment: "Культура",
    interests: "искусство, медиа",
  },
  {
    name: "Алексей",
    age: 41,
    city: "Новосибирск",
    segment: "Предприниматели",
    interests: "бизнес, инвестиции",
  },
  {
    name: "Елена",
    age: 22,
    city: "Екатеринбург",
    segment: "Молодежь",
    interests: "соцсети, мода",
  },
];


const segments = [
  "Все",
  "Молодежь",
  "Семья",
  "Культура",
  "Предприниматели",
];


export default function RespondentCloud() {

  const [active, setActive] = useState<number | null>(null);

  const [filter, setFilter] = useState("Все");


  return (

    <div className="mt-10">


      {/* Фильтры */}

      <div className="flex flex-wrap gap-3 mb-8">

        {segments.map((segment) => (

          <button

            key={segment}

            onClick={() => setFilter(segment)}

            className={`
              px-5
              py-2
              rounded-full
              transition
              ${
                filter === segment
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }
            `}

          >

            {segment}

          </button>

        ))}

      </div>




      {/* Облако респондентов */}

      <div className="
        relative
        h-[420px]
        rounded-3xl
        bg-blue-50
        overflow-hidden
      ">


      {Array.from({length:80}).map((_, i)=>{


        const person = respondents[i % respondents.length];


        const visible =
          filter === "Все" ||
          person.segment === filter;



        if (!visible) return null;



        const left = (i * 37) % 95;
        const top = (i * 53) % 85;


        return (

          <div

            key={i}

            className="absolute"

            style={{
              left:`${left}%`,
              top:`${top}%`
            }}


            onMouseEnter={()=>setActive(i)}

            onMouseLeave={()=>setActive(null)}

          >


            <div

              className="
              h-5
              w-5
              rounded-full
              bg-blue-600
              hover:scale-150
              transition
              cursor-pointer
              "

            />



            {
              active === i && (

                <div className="
                absolute
                z-20
                bottom-8
                left-1/2
                -translate-x-1/2
                w-64
                bg-white
                rounded-2xl
                shadow-xl
                border
                p-5
                ">


                  <b>
                    {person.name}, {person.age}
                  </b>


                  <p className="text-gray-600">
                    {person.city}
                  </p>


                  <p className="mt-2 text-sm">
                    {person.segment}
                  </p>


                  <p className="text-sm text-gray-500">
                    {person.interests}
                  </p>


                </div>

              )
            }


          </div>

        )

      })}


      </div>


    </div>

  );

}