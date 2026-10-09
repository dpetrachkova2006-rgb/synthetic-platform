import PDFDocument from 'pdfkit';
import path from 'node:path';
import { completedInterviewIds, distributions, guideQuestions, surveyComplete, TYPE_LABELS, type Study } from './study';

const BLUE = '#3154ff', INK = '#18202e', MUTED = '#667085';
export function reportBlocker(s: Study): string | null {
  if (!s.population.length) return 'Сначала сформируйте выборку.';
  if (s.type === 'quantitative') return s.population.some(p => p.answer?.trim()) || surveyComplete(s) ? null : 'Получите ответы респондентов или завершите анкету. Одних позиций профилей недостаточно для отчёта.';
  if (s.type === 'mixed' && !surveyComplete(s)) return 'Завершите количественный опрос.';
  const ids = s.reportRespondentIds ?? s.selectedIds;
  if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !completedInterviewIds(s).includes(id))) return 'Завершите интервью выбранных участников или сформируйте предварительный отчёт по завершённым интервью.';
  return null;
}
export async function generatePDF(s: Study): Promise<Buffer> {
  const blocked = reportBlocker(s); if (blocked) throw new Error(blocked);
  const doc = new PDFDocument({ size: 'A4', margins: { top: 60, bottom: 64, left: 52, right: 52 }, bufferPages: true, info: { Title: s.topic, Author: 'Synthetic Platform', Subject: 'Синтетическое исследование' } });
  doc.registerFont('regular', path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf'));
  doc.registerFont('bold', path.join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf'));
  const chunks: Buffer[] = [];
  const ready = new Promise<Buffer>((resolve, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  const width = doc.page.width - 104;
  function room(height: number) { if (doc.y + height > doc.page.height - 70) doc.addPage(); }
  function paragraph(text: string, color = INK) { doc.font('regular').fontSize(10); const h=doc.heightOfString(text,{width,lineGap:4}); if(h < doc.page.height-130) room(h+10); doc.fillColor(color).text(text, 52, doc.y, { width, lineGap: 4 }); doc.moveDown(0.65); }
  function heading(title: string, newPage = false) { if (newPage) doc.addPage(); room(140); doc.font('bold').fontSize(19).fillColor(INK).text(title, 52, doc.y, { width, lineGap: 3 }); doc.moveDown(0.65); }
  function label(text: string) { room(50); doc.font('bold').fontSize(11).fillColor(BLUE).text(text, 52, doc.y, { width }); doc.moveDown(0.5); }
  function table(rows: [string, string][]) {
    for (const [name, value] of rows) {
      doc.font('regular').fontSize(9);
      const h = Math.max(doc.heightOfString(name, { width: width - 140 }), doc.heightOfString(value, { width: 110 })) + 18;
      room(h); const y = doc.y;
      doc.rect(52, y, width, h).fill('#f3f5fa');
      doc.fillColor(INK).text(name, 61, y + 8, { width: width - 140, lineGap: 2 });
      doc.font('bold').text(value, 52 + width - 115, y + 8, { width: 105, align: 'right', lineGap: 2 });
      doc.y = y + h + 3;
    } doc.moveDown();
  }
  function chart(title: string, rows: { option: string; count: number }[], base: number) {
    label(title);
    for (const row of rows) {
      doc.font('regular').fontSize(9);
      const text = `${row.option} — ${row.count} / ${base} (${base ? (row.count * 100 / base).toFixed(1) : '0'}%)`;
      const h = doc.heightOfString(text, { width }) + 26;
      room(h); const y = doc.y;
      doc.fillColor(INK).text(text, 52, y, { width });
      const barY = doc.y + 6;
      doc.rect(52, barY, width, 7).fill('#e6eaff');
      if (base && row.count) doc.rect(52, barY, width * row.count / base, 7).fill(BLUE);
      doc.y = y + h;
    } doc.moveDown();
  }
  const included = s.type === 'quantitative' ? s.population.filter(p => p.answer?.trim()).map(p => p.id) : s.reportRespondentIds ?? s.selectedIds;
  const preliminary = s.type !== 'quantitative' && included.length < s.selectedIds.length;
  const survey = distributions(s);
  const total = s.population.length;
  const countBy = (field: 'gender' | 'city' | 'education' | 'income') => [...new Set(s.population.map(p => p[field]))].map(value => [value, String(s.population.filter(p => p[field] === value).length)] as [string, string]);

  doc.rect(0, 0, doc.page.width, 16).fill(BLUE);
  doc.font('bold').fontSize(11).fillColor(BLUE).text('SYNTHETIC PLATFORM', 52, 68);
  doc.font('regular').fontSize(12).fillColor(MUTED).text(TYPE_LABELS[s.type], 52, 130, { width });
  doc.font('bold').fontSize(30).fillColor(INK).text(s.topic, 52, 175, { width, lineGap: 5 });
  doc.moveDown();
  paragraph(s.question);
  doc.y = Math.max(doc.y + 35, 430);
  table([['Дата исследования', new Date(s.createdAt).toLocaleDateString('ru-RU')], ['Размер синтетической выборки', String(total)], ['Смоделированных интервью', String(included.length)], ['Статус', preliminary ? 'Предварительный' : 'Итоговый']]);
  paragraph('Синтетическое исследование. Ответы созданы моделью, люди не опрашивались. Материал предназначен для проверки гипотез и подготовки реального исследования.', MUTED);

  heading('02 / Краткое резюме', true);
  paragraph(`Проект «${s.topic}». Сохранено ${s.responses.length} анкет и ${included.length} смоделированных интервью. Все числа рассчитаны из сохранённых данных; PDF формируется без API-запроса.`);
  if (preliminary) paragraph(`Предварительный анализ: включено ${included.length} из ${s.selectedIds.length} выбранных участников. Незавершённые интервью исключены.`);
  if (s.type !== 'qualitative') for (const q of survey) { const leader = [...q.distribution].sort((a,b) => b.count-a.count)[0]; if (leader?.count) paragraph(`Вопрос «${q.text}»: самый частый вариант — «${leader.option}», ${leader.count} из ${s.responses.length} анкет. Это свойство моделирования, а не оценка мнений населения.`); }
  if (!survey.length) paragraph('Анкета не проводилась. Тематический материал представлен в разделе 7.');
  heading('03 / Цель и исследовательские вопросы');
  paragraph(`Тема: ${s.topic}`); paragraph(`Основной вопрос: ${s.question}`);
  for (const q of s.questionnaire) paragraph(`Анкета: ${q.text}`);
  for (const q of guideQuestions(s.guide)) paragraph(`Интервью: ${q}`);
  heading('04 / Методология');
  paragraph('Социально-демографические профили создаются программно. Позиции профилей являются модельной гипотезой. Ответы анкеты и интервью моделируются ИИ индивидуально с учётом профиля. Пакетная генерация объединяет запросы, но не тиражирует ответы. Частоты и проценты вычисляются кодом; цитаты берутся дословно из сохранённых ответов.');
  if (s.type === 'mixed') paragraph('Последовательность: количественный опрос → отбор участников → интервью. Качественная часть раскрывает ответы выбранных участников, а не представляет всю исходную выборку.');
  if (s.selectionReason) paragraph(`Основание отбора: ${s.selectionReason}`);
  heading('05 / Характеристики выборки', true);
  table([['Всего профилей', String(total)], ['Возраст, минимум–максимум', `${Math.min(...s.population.map(p=>p.age))}–${Math.max(...s.population.map(p=>p.age))}`]]);
  label('Пол / количество профилей'); table(countBy('gender'));
  label('Города / количество профилей'); table(countBy('city'));
  label('Образование / количество профилей'); table(countBy('education'));
  heading('06 / Источники реальных данных');
  const sources = s.sources ?? [];
  if (!sources.length) paragraph('Проверенные статистические распределения для этого проекта не применялись. Характеристики и позиции профилей смоделированы. Источники для старых проектов не добавляются задним числом.');
  for (const source of sources) { label(source.title); paragraph(`${source.organization}. Период: ${source.date}. География: ${source.geography}. Совокупность: ${source.population}. Версия: ${source.version}. Получено: ${source.retrievedAt}. Использование: ${source.application}.`); doc.font('regular').fontSize(9).fillColor(BLUE).text(source.url,52,doc.y,{width,link:source.url.startsWith('https://')?source.url:undefined,lineGap:3}); doc.moveDown(); }
  heading('07 / Результаты', true);
  if (s.type !== 'qualitative') {
    for (const q of survey) chart(q.text, q.distribution, s.responses.length);
    if (!survey.length) { paragraph('Следующий график показывает позиции, заложенные в профили при генерации. Это НЕ распределение ответов реального или синтетического массового опроса.'); chart('Позиции профилей (модельная гипотеза)', [...new Set(s.population.map(p=>p.opinion))].map(option=>({option,count:s.population.filter(p=>p.opinion===option).length})), total); }
  }
  if (s.type === 'quantitative') {
    label('Дословные фрагменты сохранённых смоделированных ответов');
    for (const id of included) { const p=s.population.find(p=>p.id===id)!; label(`#${id} · ${p.name}, ${p.age} лет, ${p.city}`); paragraph(`«${p.answer}»`); }
  } else {
    for (const theme of s.themes ?? []) {
      if (!theme.quotes.length || !theme.quotes.every(q => included.includes(q.respondentId) && s.interviews[q.respondentId]?.some(t => t.question === q.question && t.answer.includes(q.quote)))) continue;
      label(theme.title); paragraph(`Интерпретация модели: ${theme.interpretation}`);
      for (const quote of theme.quotes) paragraph(`Участник #${quote.respondentId}: «${quote.quote}»`);
    }
    paragraph('Тематические блоки следуют вопросам гайда. Цитаты воспроизведены дословно; они не служат оценкой частоты мнений в населении.');
    for (const q of guideQuestions(s.guide)) { label(q); for (const id of included) { const turn=s.interviews[id]?.find(t=>t.question===q); if(turn) { label(`Участник #${id}`); paragraph(`«${turn.answer}»`); } } }
  }
  heading('08 / Сравнение групп', true);
  if (survey.length && s.type !== 'qualitative') {
    for (const q of survey) { label(q.text); for (const gender of ['женщина','мужчина']) { const ids = new Set(s.population.filter(p=>p.gender===gender).map(p=>p.id)); const responses=s.responses.filter(r=>ids.has(r.respondentId)); label(`${gender} · анкет ${responses.length}`); table(q.options.map(o=>[o, `${responses.filter(r=>r.answers[q.id]===o).length} / ${responses.length}`])); } }
    if (s.type === 'mixed') { label('Связь опроса и интервью'); for (const id of included) { paragraph(`Участник #${id}: ${s.questionnaire.map(q=>`${q.text} — ${s.responses.find(r=>r.respondentId===id)?.answers[q.id] ?? 'нет ответа'}`).join('; ')}. Цитаты приведены в разделе 7.`); } }
  } else if(s.type === 'quantitative') {
    paragraph('Сравнение заложенных в профили позиций, не ответов анкеты. Эти числа описывают генерацию профилей.');
    for(const gender of ['женщина','мужчина']) { const people=s.population.filter(p=>p.gender===gender);label(`${gender}: профилей ${people.length}`);table([...new Set(people.map(p=>p.opinion))].map(o=>[o, String(people.filter(p=>p.opinion===o).length)])); }
  } else paragraph('Проект не содержит достаточных сопоставимых анкет для количественного сравнения. Содержание интервью можно сравнивать по вопросам и профилям, но нельзя превращать число упоминаний в оценку распространённости мнения.');
  heading('09 / Выводы');
  if (survey.length && s.type !== 'qualitative') { for (const q of survey) { const answered=s.responses.filter(r=>q.options.includes(r.answers[q.id])).length; paragraph(`По вопросу «${q.text}» получено ${answered} валидных ответов из ${total} профилей. Распределение представлено в разделе 7; перенос на население не обоснован.`); } }
  else paragraph(`Собрано ${included.length} смоделированных интервью. Материал помогает уточнять формулировки вопросов и готовить гипотезы для проверки людьми. Он не подтверждает причинные связи и не заменяет реальное исследование.`);
  heading('10 / Ограничения');
  paragraph('Респонденты и ответы синтетические. Репрезентативность не установлена. Модель может воспроизводить стереотипы и допускать ошибки. Число профилей не равно числу независимых наблюдений людей; доверительные интервалы и статистическая значимость не рассчитываются. Доступные статистические распределения задают только указанные характеристики и не подтверждают достоверность мнений. Для решений о людях нужна проверка реальными данными.');
  if (preliminary) paragraph('Часть интервью не завершена; причины отсутствия ответов могут влиять на состав включённой группы.');
  const range = doc.bufferedPageRange();
  for (let i=0;i<range.count;i++) { doc.switchToPage(i); const bottom=doc.page.margins.bottom; doc.page.margins.bottom=0; doc.font('regular').fontSize(8).fillColor(MUTED).text('SYNTHETIC PLATFORM · Смоделированные данные',52,doc.page.height-36,{width:width-70,lineBreak:false}); doc.text(`${i+1} / ${range.count}`,doc.page.width-100,doc.page.height-36,{width:48,align:'right',lineBreak:false}); doc.page.margins.bottom=bottom; }
  doc.end(); return ready;
}
