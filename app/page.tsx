"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import StudyMethodCards from "./components/StudyMethodCards";
import { InkArrow, ReportBooklets, Scribble } from "./components/EditorialArt";
import { readStudies, TYPE_LABELS } from "./lib/study";
export default function Home() {
  const [latest, setLatest] = useState<{
    topic: string;
    href: string;
    type: string;
  } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const s = readStudies().at(-1);
        if (s)
          setLatest({
            topic: s.topic,
            type: TYPE_LABELS[s.type],
            href:
              s.type === "quantitative" && s.workflow !== "survey"
                ? "/studies"
                : `/study?id=${s.researchId}`,
          });
        else {
          const topic = localStorage.getItem("research_topic");
          if (topic)
            setLatest({
              topic,
              href: "/map",
              type: "Сохранённое исследование",
            });
        }
      } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <main className="synth-home">
      <section className="synth-hero" aria-labelledby="home-title">
        <div className="synth-hero-copy">
          <h1 id="home-title">
            <span>ПРОВЕРЯЙТЕ</span>
            <span>ИДЕИ.</span>
            <span className="ink">ПОНИМАЙТЕ</span>
            <span className="ink">ЛЮДЕЙ.</span>
          </h1>
          <Scribble className="hero-underline" />
          <p className="hero-description">
            Задайте исследовательский вопрос,
            <br className="desktop-break" /> получите ответы смоделированных
            участников
            <br className="desktop-break" /> и соберите понятный отчёт.
          </p>
          <div className="hero-action">
            <Link className="app-button" href="/new-study">
              Создать исследование <ArrowUpRight size={21} />
            </Link>
            <span className="hand-note hero-action-note">
              <InkArrow />
              Быстро
              <br />
              гибко
              <br />с глубиной
            </span>
          </div>
        </div>
        <div className="synth-hero-art">
          <Image
            src="/design/crowd-collage.webp"
            alt="Чёрно-белый коллаж с силуэтами людей и синими печатными слоями"
            width={1000}
            height={1250}
            priority
            sizes="(max-width: 700px) 100vw, 52vw"
          />
          <span className="hand-note hero-top-note">
            Синтетические
            <br />
            респонденты
            <br />
            для реальных
            <br />
            вопросов
            <InkArrow />
          </span>
          <span className="paper-note hero-side-note">
            Быстрые
            <br />
            инсайты
            <br />
            для больших
            <br />
            решений
          </span>
          <span className="paper-note hero-bottom-note">
            Идеи
            <br />
            продукты
            <br />
            коммуникации
            <br />
            сервисы
            <br />
            бренды
          </span>
        </div>
      </section>
      <section id="research-methods" className="home-methods">
        <div className="section-strip">
          <span className="section-number">01</span>
          <h2>
            Выберите подход
            <br />и получите инсайты
          </h2>
          <i />
          <span className="strip-note">
            Три способа
            <br />
            одна платформа
          </span>
          <div className="strip-arrows" aria-hidden="true">
            <ArrowRight className="rotate-180" size={23} />
            <ArrowRight size={23} />
          </div>
        </div>
        <StudyMethodCards />
        {latest && (
          <Link className="home-resume" href={latest.href}>
            <span>
              <small>Продолжить · {latest.type}</small>
              <strong>{latest.topic}</strong>
            </span>
            <ArrowRight size={22} />
          </Link>
        )}
      </section>
      <section className="home-data" id="data-basis">
        <div className="home-data-art">
          <Image
            src="/design/earth-collage.webp"
            alt="Коллаж Земли, печатных текстур и картографической сетки"
            width={1200}
            height={800}
            sizes="(max-width: 700px) 100vw, 55vw"
          />
        </div>
        <div className="home-data-copy">
          <span className="section-number">02</span>
          <span className="data-margin-note">
            Синтетические
            <br />
            респонденты,
            <br />
            построенные
            <br />
            на данных
          </span>
          <h2>
            ОСНОВА —<br />
            <span>РЕАЛЬНЫЕ ДАННЫЕ</span>
          </h2>
          <p>
            Мы используем открытые исследования, статистику и проверенные
            источники. Статистическая основа помогает формировать выборку, а
            ответы участников моделирует нейросеть.
          </p>
          <a
            className="inline-link"
            href="#data-method"
            onClick={() => {
              const detail = document.getElementById(
                "data-method",
              ) as HTMLDetailsElement | null;
              if (detail) detail.open = true;
            }}
          >
            Узнать больше о данных <ArrowRight size={16} />
          </a>
          <details id="data-method">
            <summary>Метод и источники</summary>
            <p>
              Для статистической выборки используются демографические данные
              Всемирного банка и ООН за 2024 год для возраста 20–79 лет. Можно
              выбрать моделирование без статистической калибровки. Основа и
              источники каждого исследования указаны в его отчёте.
            </p>
            <a
              className="inline-link"
              href="https://data.worldbank.org/indicator/SP.POP.TOTL"
              target="_blank"
              rel="noopener noreferrer"
            >
              Всемирный банк ↗
            </a>
          </details>
          <div className="data-materials">
            <span className="contour-paper" aria-hidden="true" />
            <p>
              Открытые исследования
              <br />
              Статистика
              <br />
              Социальные тренды
              <br />
              Экспертные материалы
            </p>
            <Scribble />
          </div>
        </div>
      </section>
      <section className="home-report">
        <div className="home-report-copy">
          <span className="section-number">03</span>
          <h2>
            ПОЛУЧАЙТЕ
            <br />
            <span>ПОНЯТНЫЙ ОТЧЁТ</span>
          </h2>
          <p>
            После исследования мы собираем ваши результаты в структурированный
            PDF-отчёт: ключевые выводы, цитаты, графики и рекомендации.
          </p>
          <Link className="app-button app-button--black" href="/report-example">
            Посмотреть пример отчёта <ArrowRight size={20} />
          </Link>
          <span className="hand-note report-pdf-note">
            PDF
            <InkArrow />
          </span>
        </div>
        <ReportBooklets />
      </section>
      <aside className="synth-disclaimer">
        <span className="disclaimer-star" aria-hidden="true">
          *
        </span>
        <h2>
          СИНТЕТИЧЕСКИЕ ОТВЕТЫ
          <br />
          НЕ ЗАМЕНЯЮТ РЕАЛЬНЫХ ЛЮДЕЙ.
        </h2>
        <p>
          Наши респонденты — это модель, основанная на данных. Они помогают
          быстро проверять идеи и находить направления, но не заменяют
          полноценные исследования с живыми людьми.
        </p>
        <span className="hand-note disclaimer-note">
          Дополнение,
          <br />а не замена.
        </span>
      </aside>
    </main>
  );
}
