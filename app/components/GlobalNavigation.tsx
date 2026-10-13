"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, ArrowUpRight, X } from "lucide-react";
import { Brand } from "./EditorialArt";
import { snapshotActiveProject } from "../lib/projectNavigation";

export default function GlobalNavigation() {
  const path = usePathname();
  const dirty = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    function input(event: Event) {
      if ((event.target as HTMLElement).closest("[data-ephemeral]")) return;
      dirty.current = true;
    }
    function saved() {
      dirty.current = false;
    }
    function unload(event: BeforeUnloadEvent) {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    function leave(event: MouseEvent) {
      const link = (event.target as HTMLElement).closest("a");
      if (
        !link ||
        link.origin !== location.origin ||
        (link.pathname === location.pathname &&
          link.search === location.search) ||
        event.metaKey ||
        event.ctrlKey
      )
        return;
      if (
        dirty.current &&
        !window.confirm("Есть несохранённые изменения. Покинуть страницу?")
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      try {
        snapshotActiveProject();
      } catch (e) {
        event.preventDefault();
        event.stopPropagation();
        alert(e instanceof Error ? e.message : "Не удалось сохранить проект.");
      }
    }
    document.addEventListener("input", input, true);
    window.addEventListener("research-saved", saved);
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", leave, true);
    return () => {
      document.removeEventListener("input", input, true);
      window.removeEventListener("research-saved", saved);
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", leave, true);
    };
  }, []);
  return (
    <header className="synth-nav print:hidden">
      <div className="synth-nav-inner">
        <Link
          href="/"
          className="nav-brand"
          aria-label="SYNTH Respondents — главная"
        >
          <Brand />
        </Link>
        <button
          className="nav-menu-toggle"
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={25} /> : <Menu size={25} />}
        </button>
        <nav
          id="site-navigation"
          aria-label="Главное меню"
          className={menuOpen ? "nav-links is-open" : "nav-links"}
        >
          {[
            ["/", "Главная"],
            ["/new-study", "Новое исследование"],
            ["/studies", "Мои исследования"],
            ["/tools", "Инструменты"],
          ].map(([href, label]) => (
            <Link
              href={href}
              key={href}
              onClick={() => setMenuOpen(false)}
              aria-current={path === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <Link href="/studies#project-search" aria-label="Найти исследование">
            <Search size={19} />
          </Link>
          <Link
            href="/studies"
            className="nav-projects"
            aria-label="Мои исследования"
          >
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
      {path !== "/" && (
        <div className="nav-breadcrumb">
          <Link href="/studies">← К исследованиям</Link>
          <span>SYNTH / ИССЛЕДОВАТЕЛЬСКАЯ ПЛАТФОРМА</span>
        </div>
      )}
    </header>
  );
}
