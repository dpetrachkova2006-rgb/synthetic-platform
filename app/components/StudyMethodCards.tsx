import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MethodArt } from "./EditorialArt";
const methods = [
  {
    type: "quantitative" as const,
    href: "/research",
    title: "Количественные",
    question: "Сколько и как часто?",
    text: "Проверьте гипотезы на большой выборке синтетических респондентов. Получайте наглядные метрики, сегменты и статистику.",
    path: "Выборка → ответы → отчёт",
  },
  {
    type: "qualitative" as const,
    href: "/study?type=qualitative",
    title: "Качественные",
    question: "Почему люди так думают?",
    text: "Проводите глубинные интервью с ИИ-респондентами. Исследуйте мотивы, барьеры и потребности в свободном диалоге.",
    path: "Участники → интервью → отчёт",
  },
  {
    type: "mixed" as const,
    href: "/study?type=mixed",
    title: "Смешанные",
    question: "Что происходит и почему?",
    text: "Объединяйте силу чисел и глубину понимания. Сначала проведите опрос, затем уточните результаты в интервью.",
    path: "Опрос → отбор → интервью → отчёт",
  },
];
export default function StudyMethodCards() {
  return (
    <div className="study-methods">
      {methods.map((m, i) => (
        <Link
          href={m.href}
          key={m.type}
          className={`method-card method-card--${m.type}`}
        >
          <MethodArt type={m.type} />
          <span className="method-index">0{i + 1}</span>
          <h3>{m.title}</h3>
          <p className="method-question">{m.question}</p>
          <p className="method-description">{m.text}</p>
          <span className="method-route">{m.path}</span>
          <ArrowRight className="method-arrow" size={22} />
        </Link>
      ))}
    </div>
  );
}
