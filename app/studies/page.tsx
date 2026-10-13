"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { readStudies, TYPE_LABELS, type Study } from "../lib/study";
import {
  activateProject,
  snapshotActiveProject,
} from "../lib/projectNavigation";
import { InkArrow, MethodArt } from "../components/EditorialArt";
export default function Projects() {
  const [projects, setProjects] = useState<Study[]>([]),
    [error, setError] = useState(""),
    [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        snapshotActiveProject();
        setProjects(readStudies().reverse());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка чтения.");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  function open(p: Study) {
    try {
      window.location.assign(activateProject(p));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка открытия.");
    }
  }
  const visible = projects.filter((p) =>
    (p.topic + " " + p.question + " " + TYPE_LABELS[p.type])
      .toLocaleLowerCase("ru")
      .includes(query.toLocaleLowerCase("ru")),
  );
  return (
    <main className="editorial-page catalogue-page">
      <header className="editorial-page-header">
        <p className="eyebrow">Каталог проектов</p>
        <h1>
          МОИ
          <br />
          <span>ИССЛЕДОВАНИЯ.</span>
        </h1>
        <span className="hand-note page-margin-note">
          Идеи, ответы,
          <br />
          новые вопросы.
          <InkArrow />
        </span>
        <p>
          Проекты и черновики сохраняются в этом браузере. Очистка данных
          браузера удалит их. Исследования на другом адресе сайта не появляются
          здесь автоматически.
        </p>
        <Link href="/new-study" className="app-button">
          Новое исследование <ArrowUpRight size={20} />
        </Link>
      </header>
      {error && (
        <p role="alert" className="catalogue-error">
          {error}
        </p>
      )}
      <label id="project-search" className="catalogue-search">
        <Search size={20} />
        <span className="sr-only">Найти исследование</span>
        <input
          data-ephemeral
          type="search"
          placeholder="Название или тема исследования"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="project-catalogue">
        {visible.map((p, i) => (
          <article
            className={`catalogue-entry catalogue-entry--${p.type}`}
            key={p.researchId}
          >
            <span className="catalogue-index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="eyebrow">
                {TYPE_LABELS[p.type]} ·{" "}
                {new Date(p.createdAt).toLocaleDateString("ru-RU")}
              </p>
              <h2>{p.topic}</h2>
              <p>{p.question}</p>
              <p className="catalogue-meta">
                {p.report || p.legacy?.latest_ai_research_report
                  ? "Есть аналитический отчёт"
                  : "Черновик"}{" "}
                · {p.population.length} респондентов · {p.responses.length}{" "}
                анкет
              </p>
              <button className="catalogue-open" onClick={() => open(p)}>
                Продолжить исследование <ArrowUpRight size={21} />
              </button>
            </div>
            <MethodArt type={p.type} />
          </article>
        ))}
      </div>
      {!visible.length && !error && (
        <section className="catalogue-empty">
          <span className="empty-mark" aria-hidden="true">
            *
          </span>
          <h2>
            {query ? "НИЧЕГО НЕ НАЙДЕНО" : "ЗДЕСЬ БУДУТ ВАШИ ИССЛЕДОВАНИЯ."}
          </h2>
          <p>
            {query
              ? "Попробуйте другое название или тему."
              : "Пока нет сохранённых исследований. Начните с вопроса, который хотите проверить."}
          </p>
          {!query && (
            <Link href="/new-study" className="inline-link">
              Создать первое исследование <ArrowUpRight size={20} />
            </Link>
          )}
        </section>
      )}
    </main>
  );
}
