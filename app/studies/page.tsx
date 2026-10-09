'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readStudies, TYPE_LABELS, type Study } from '../lib/study';
import { activateProject, snapshotActiveProject } from '../lib/projectNavigation';
export default function Projects() {
  const [projects, setProjects] = useState<Study[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { const timer = setTimeout(() => { try { snapshotActiveProject(); setProjects(readStudies().reverse()); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка чтения.'); } }, 0); return () => clearTimeout(timer); }, []);
  function open(p: Study) { try { window.location.assign(activateProject(p)); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка открытия.'); } }
  return <main className="mx-auto w-full max-w-5xl px-5 py-10"><h1 className="text-3xl font-black">Мои исследования</h1><p className="my-4 text-gray-600">Проекты и черновики сохраняются в этом браузере. Очистка данных браузера удалит их; резервную копию проекта можно скачать на странице исследования.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<Link href="/new-study" className="app-button inline-block px-5 py-3">Новое исследование</Link><div className="mt-6 grid gap-4">{projects.map(p => <article className="editorial-card p-6" key={p.researchId}><p className="text-sm text-blue-700">{TYPE_LABELS[p.type]} · {new Date(p.createdAt).toLocaleDateString('ru-RU')}</p><h2 className="my-2 text-xl font-bold">{p.topic}</h2><p>{p.question}</p><p className="my-3 text-sm text-gray-500">{p.report || p.legacy?.latest_ai_research_report ? 'Есть аналитический отчёт' : 'Черновик'} · {p.population.length} респондентов · {p.responses.length} анкет</p><button className="app-button-secondary px-5 py-3" onClick={() => open(p)}>Продолжить исследование</button></article>)}{!projects.length && !error && <p>Пока нет сохранённых исследований.</p>}</div></main>;
}
