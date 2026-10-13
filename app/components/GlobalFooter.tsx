import Link from "next/link";
import { Brand } from "./EditorialArt";
export default function GlobalFooter() {
  return (
    <footer className="synth-footer print:hidden">
      <Link href="/" aria-label="SYNTH Respondents — главная">
        <Brand compact />
      </Link>
      <nav aria-label="Меню внизу страницы">
        <Link href="/">Главная</Link>
        <Link href="/new-study">Новое исследование</Link>
        <Link href="/studies">Мои исследования</Link>
      </nav>
      <div>
        <Link href="/#data-basis">Метод и источники</Link>
      </div>
    </footer>
  );
}
