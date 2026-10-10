import Link from 'next/link';
import { ArrowUpRight, ChartColumn, Layers, MessagesSquare } from 'lucide-react';

const methods = [
  { href: '/research', title: 'Количественное', question: 'Сколько и как часто?', text: 'Узнайте, как распределяются ответы в большой группе.', path: 'Выборка → ответы → отчёт', icon: ChartColumn },
  { href: '/study?type=qualitative', title: 'Качественное', question: 'Почему люди так думают?', text: 'Изучите опыт, мотивы и сомнения через глубинные интервью.', path: 'Участники → интервью → отчёт', icon: MessagesSquare },
  { href: '/study?type=mixed', title: 'Смешанное', question: 'Что происходит и почему?', text: 'Сначала проведите опрос, затем уточните его результаты в интервью.', path: 'Опрос → отбор → интервью → отчёт', icon: Layers },
];

export default function StudyMethodCards() {
  return <div className="grid gap-4 md:grid-cols-3">{methods.map(({ href, title, question, text, path, icon: Icon }) =>
    <Link href={href} key={href} className="method-card group">
      <div className="flex items-center justify-between"><span className="method-card__icon"><Icon size={23} strokeWidth={1.7}/></span><ArrowUpRight size={22} className="text-gray-400 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"/></div>
      <h3 className="mt-6 text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-3 font-semibold text-blue-700">{question}</p>
      <p className="mt-2 text-sm leading-6 text-gray-700">{text}</p>
      <p className="mt-auto pt-6 text-xs leading-5 text-gray-500">{path}</p>
    </Link>
  )}</div>;
}
