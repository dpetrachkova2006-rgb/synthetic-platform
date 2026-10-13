import StudyMethodCards from "../components/StudyMethodCards";
import { InkArrow, Scribble } from "../components/EditorialArt";
export default function NewStudy() {
  return (
    <main className="editorial-page new-study-page">
      <header className="editorial-page-header">
        <p className="eyebrow">01 / Новое исследование</p>
        <h1>
          ЧТО ХОТИТЕ
          <br />
          <span>УЗНАТЬ?</span>
        </h1>
        <p>
          Выберите метод под свой вопрос.
          <br />
          Проект сохранится автоматически.
        </p>
        <span className="hand-note page-margin-note">
          От идеи
          <br />к ответам
          <InkArrow />
        </span>
        <Scribble />
      </header>
      <StudyMethodCards />
    </main>
  );
}
