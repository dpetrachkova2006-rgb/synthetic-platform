import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MethodArt, InkArrow } from "../components/EditorialArt";
export default function Tools() {
  return (
    <main className="editorial-page tools-page">
      <header className="editorial-page-header">
        <p className="eyebrow">Исследовательская лаборатория</p>
        <h1>
          ИНСТРУМЕНТЫ
          <br />
          <span>ДЛЯ ВОПРОСОВ.</span>
        </h1>
        <p>Подготовьте вопросы, прежде чем запускать исследование.</p>
        <span className="hand-note page-margin-note">
          Хороший вопрос —<br />
          половина дела.
          <InkArrow />
        </span>
      </header>
      <Link href="/guide-test" className="lab-instrument">
        <span className="section-number">01</span>
        <div>
          <h2>ТЕСТИРОВАНИЕ ГАЙДА</h2>
          <p>Проверка вопросов интервью и моделирование прохождения гайда.</p>
          <span>
            Открыть инструмент <ArrowUpRight size={20} />
          </span>
        </div>
        <MethodArt type="qualitative" />
      </Link>
      <aside className="lab-note">
        <p className="eyebrow">Перед запуском интервью</p>
        <p>
          Проверьте, понятны ли вопросы, нет ли повторов и достаточно ли места
          для подробного ответа.
        </p>
      </aside>
    </main>
  );
}
