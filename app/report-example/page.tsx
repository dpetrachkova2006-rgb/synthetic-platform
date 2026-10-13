import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ReportBooklets } from "../components/EditorialArt";
export default function ReportExample() {
  return (
    <main className="editorial-page report-example-page">
      <header className="editorial-page-header">
        <p className="eyebrow">Пример оформления</p>
        <h1>
          ОТВЕТЫ.
          <br />
          <span>ВЫВОДЫ. ОТЧЁТ.</span>
        </h1>
        <p>Так устроен отчёт вашего исследования.</p>
      </header>
      <p className="example-disclosure">
        Это пример структуры, без вымышленных участников, ответов и статистики.
        В вашем отчёте появятся только результаты сохранённого исследования.
      </p>
      <ReportBooklets />
      <article className="example-report">
        <h2>ЧТО ВХОДИТ В ОТЧЁТ</h2>
        <div className="example-outline">
          {[
            "Ключевые выводы",
            "Распределения ответов",
            "Цитаты и источники",
          ].map((label, i) => (
            <div key={label}>
              <span>0{i + 1}</span>
              <h3>{label}</h3>
            </div>
          ))}
        </div>
        {[
          [
            "Выводы и комментарий",
            "Главные наблюдения, объяснения и вопросы для дальнейшей проверки. Каждый вывод связан с данными исследования.",
          ],
          [
            "Диаграммы и ответы",
            "Количество и доли рассчитываются из сохранённых ответов. В смешанном исследовании опрос и интервью связаны через участников исходной выборки.",
          ],
          [
            "Голоса участников",
            "Дословные фрагменты завершённых интервью с указанием участника и исходного вопроса.",
          ],
          [
            "Метод и источники",
            "Состав группы, способ моделирования, источники статистической основы и ограничения исследования.",
          ],
          [
            "PDF для скачивания",
            "Подробный текст, диаграммы, полные ответы и источники собираются в единый документ.",
          ],
        ].map(([title, text], i) => (
          <section className="example-report-section" key={title}>
            <span className="section-number">0{i + 1}</span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </section>
        ))}
      </article>
      <Link href="/new-study" className="app-button">
        Создать исследование <ArrowUpRight size={20} />
      </Link>
    </main>
  );
}
