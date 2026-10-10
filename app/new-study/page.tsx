import StudyMethodCards from '../components/StudyMethodCards';
export default function NewStudy() {
  return <main className="mx-auto w-full min-w-0 max-w-[1200px] px-5 py-10 sm:px-10"><p className="eyebrow">Новое исследование</p><h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Что хотите узнать?</h1><p className="mb-8 mt-4 text-gray-600">Выберите метод под свой вопрос. Проект сохранится автоматически.</p><StudyMethodCards/></main>;
}
