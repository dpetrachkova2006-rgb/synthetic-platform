'use client';

import Link from 'next/link';
import { ArrowRight, Check, FileText, MessageCircle, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import StudyMethodCards from './components/StudyMethodCards';
import { readStudies, TYPE_LABELS } from './lib/study';

export default function Home() {
  const [latest, setLatest] = useState<{ topic: string; href: string; type: string } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const study = readStudies().at(-1);
        if (study) setLatest({ topic: study.topic, type: TYPE_LABELS[study.type], href: study.type === 'quantitative' && study.workflow !== 'survey' ? '/studies' : `/study?id=${study.researchId}` });
        else {
          const topic = localStorage.getItem('research_topic');
          if (topic) setLatest({ topic, href: '/map', type: 'Сохранённое исследование' });
        }
      } catch { /* Existing projects are still available from the navigation. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return <main className="mx-auto w-full min-w-0 max-w-[1280px] px-5 py-8 sm:px-10 sm:py-12">
    <section className="home-hero">
      <div className="home-hero__copy">
        <p className="eyebrow">Платформа синтетических респондентов</p>
        <h1>Проверьте гипотезу.<br/><span>Поймите причины.</span></h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-gray-700 sm:text-lg">Задайте исследовательский вопрос, получите ответы смоделированных участников и соберите понятный отчёт.</p>
        <div className="mt-8 flex flex-wrap items-center gap-4"><a className="app-button inline-flex min-h-12 items-center gap-3 px-6" href="#research-methods">Выбрать метод <ArrowRight size={18}/></a><Link className="text-sm font-semibold text-gray-700 hover:text-blue-700" href="/studies">Мои исследования →</Link></div>
      </div>
      <div className="home-process hidden md:block" aria-label="Как проходит исследование">
        <div className="flex items-center justify-between gap-4"><span className="text-xs font-bold uppercase tracking-wider text-blue-700">От вопроса к выводам</span><span className="h-2 w-2 rounded-full bg-blue-600"/></div>
        <div className="home-process__steps"><div><Users size={18}/><span>Выборка</span></div><i/><div><MessageCircle size={18}/><span>Ответы</span></div><i/><div><FileText size={18}/><span>Отчёт</span></div></div>
        <div className="home-process__paper">
          <div className="flex items-center justify-between"><p className="font-bold">Всё исследование — в одном месте</p><Check size={18} className="shrink-0 text-blue-600"/></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1.1fr]"><div aria-hidden="true" className="space-y-3"><div className="home-process__bar w-4/5"/><div className="home-process__bar w-3/5 opacity-60"/><div className="home-process__bar w-2/5 opacity-30"/></div><p className="border-l-2 border-blue-200 pl-4 text-sm leading-6 text-gray-600">Распределения ответов, цитаты участников и выводы для вашей гипотезы.</p></div>
          <div className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-500">Итоговый отчёт можно посмотреть и скачать в PDF</div>
        </div>
      </div>
    </section>
    <section id="research-methods" className="scroll-mt-8 pt-10 sm:pt-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2"><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">С чего начнём?</h2><p className="text-sm text-gray-600">Выберите метод под свой вопрос</p></div>
      <StudyMethodCards/>
    </section>
    {latest && <Link href={latest.href} className="home-resume mt-6"><div className="min-w-0"><p className="text-xs text-gray-500">Продолжить · {latest.type}</p><p className="mt-1 truncate font-semibold">{latest.topic}</p></div><ArrowRight size={20} className="shrink-0 text-blue-600"/></Link>}
    <div className="mt-8 flex flex-wrap items-start justify-between gap-4 text-xs leading-5 text-gray-500"><p className="max-w-2xl">Ответы создаёт модель. Используйте их для проверки идей и подготовки исследования: они не заменяют ответы реальных людей.</p><Link href="/guide-test" className="shrink-0 font-semibold text-gray-700 hover:text-blue-700">Проверить вопросы интервью ↗</Link></div>
  </main>;
}
