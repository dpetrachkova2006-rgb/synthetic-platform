'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { snapshotActiveProject } from '../lib/projectNavigation';

export default function GlobalNavigation() {
  const path = usePathname();
  const dirty = useRef(false);
  useEffect(() => {
    function input() { dirty.current = true; }
    function saved() { dirty.current = false; }
    function unload(event: BeforeUnloadEvent) { if (dirty.current) { event.preventDefault(); event.returnValue = ''; } }
    function leave(event: MouseEvent) {
      const link = (event.target as HTMLElement).closest('a');
      if (!link || link.origin !== location.origin || link.pathname === location.pathname && link.search === location.search || event.metaKey || event.ctrlKey) return;
      if (dirty.current && !window.confirm('Есть несохранённые изменения. Покинуть страницу?')) { event.preventDefault(); event.stopPropagation(); return; }
      try { snapshotActiveProject(); } catch (e) { event.preventDefault(); event.stopPropagation(); alert(e instanceof Error ? e.message : 'Не удалось сохранить проект.'); }
    }
    document.addEventListener('input', input, true);
    window.addEventListener('research-saved', saved);
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', leave, true);
    return () => { document.removeEventListener('input', input, true); window.removeEventListener('research-saved', saved); window.removeEventListener('beforeunload', unload); document.removeEventListener('click', leave, true); };
  }, []);
  return <header className="relative z-20 border-b border-gray-200 bg-white/95 px-5 py-4 print:hidden"><div className="mx-auto flex max-w-[1380px] flex-wrap items-center gap-x-8 gap-y-3"><Link href="/" className="text-sm font-black tracking-tight text-blue-700">● SYNTHETIC PLATFORM</Link><nav aria-label="Главное меню" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">{[['/', 'Главная'], ['/new-study', 'Новое исследование'], ['/studies', 'Мои исследования'], ['/tools', 'Исследовательские инструменты']].map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className={path === href ? 'font-bold text-blue-700' : 'text-gray-600 hover:text-blue-700'}>{label}</Link>)}</nav>{path !== '/' && <Link href="/studies" className="ml-auto text-sm text-gray-500">← К исследованиям</Link>}</div></header>;
}
