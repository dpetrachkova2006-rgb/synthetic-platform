import { makeReportData } from './reportData';
import type { Study } from './study';

export const REPORT_COLORS = ['#3154ff', '#18a999', '#9164d8', '#f0a33a', '#e56c86', '#6192b1', '#747c91', '#a89270', '#41756b', '#be6570', '#6262aa', '#b38b35'];
export const percentText = (count: number, total: number) => `${(total ? count / total * 100 : 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`;

/** Each cell means a verified source quote exists, not that other respondents disagreed. */
export function themeEvidence(s: Study) {
  const data = makeReportData(s);
  return data.themes.map(theme => ({ ...theme, respondentIds: [...new Set(theme.quotes.map(q => q.respondentId))] }));
}
export function surveyGroups(s: Study, questionId: string) {
  const q = makeReportData(s).survey.find(q => q.id === questionId);
  if (!q) return [];
  return [...new Set(s.population.map(p => p.gender))].map(name => {
    const ids = new Set(s.population.filter(p => p.gender === name).map(p => p.id));
    const answers = s.responses.filter(r => ids.has(r.respondentId) && q.options.includes(r.answers[q.id]));
    return { name, total: answers.length, rows: q.options.map(option => ({ option, count: answers.filter(r => r.answers[q.id] === option).length })) };
  }).filter(g => g.total > 0);
}
export function ageDistribution(s: Study) {
  return [{ option: 'До 30 лет', min: 0, max: 29 }, { option: '30–44 года', min: 30, max: 44 }, { option: '45–59 лет', min: 45, max: 59 }, { option: '60 лет и старше', min: 60, max: Infinity }].map(({ option, min, max }) => ({ option, count: s.population.filter(p => p.age >= min && p.age <= max).length }));
}
/** Links only interviewees' saved survey choices to verified quotes, never the whole survey. */
export function mixedEvidence(s: Study, questionId: string) {
  const data = makeReportData(s), q = data.survey.find(q => q.id === questionId);
  if (s.type !== 'mixed' || !q) return [];
  return q.options.map(option => {
    const ids = data.included.filter(id => s.responses.find(r => r.respondentId === id)?.answers[q.id] === option);
    return { option, respondentIds: ids, themes: themeEvidence(s).map(theme => ({ title: theme.title, respondentIds: theme.respondentIds.filter(id => ids.includes(id)) })).filter(t => t.respondentIds.length) };
  }).filter(g => g.respondentIds.length);
}

/** Longer PDF prose is derived from saved evidence, with no extra AI request or invented reasons. */
export function extendedReportSections(s: Study) {
  const data = makeReportData(s);
  const sections: { title: string; paragraphs: string[] }[] = [];
  if(data.analysisInsights.length)return [...data.analysisInsights.map(i=>({title:i.title,paragraphs:[i.finding+' '+i.explanation,...i.facts.map(f=>`Основание: ${f.title}. ${f.rows.map(r=>`${r.label}: ${r.count} из ${r.total} (${percentText(r.count,r.total)})`).join('; ')}.`),...(i.quotes.length?[`В интервью этот вывод опирается на слова ${[...new Set(i.quotes.map(q=>q.respondentId))].map(id=>`участника №${id}`).join(', ')}. Дословные цитаты представлены в начале отчёта; полные ответы сохранены в приложении.`]:[]),i.nextStep]})),{title:'Границы интерпретации',paragraphs:['Выводы описывают синтетические ответы и помогают сформулировать проверяемые гипотезы. Сравнения относятся к указанным группам, а интервью раскрывают отдельные случаи. Полученные связи не устанавливают причинность и не подтверждают распространённость мнений в реальном населении.']}];
  if (data.survey.length) sections.push({ title: 'Что показывают ответы анкеты', paragraphs: data.survey.map(q => {
    const total = q.distribution.reduce((n, r) => n + r.count, 0);
    const sorted = [...q.distribution].sort((a, b) => b.count - a.count);
    const leaders = sorted.filter(r => r.count === sorted[0].count);
    const opening = leaders.length > 1 ? `На вопрос «${q.text}» нет единственного лидирующего варианта: ответы ${leaders.map(r => `«${r.option}»`).join(' и ')} получили по ${leaders[0].count} ответов (${percentText(leaders[0].count, total)}).` : `На вопрос «${q.text}» чаще всего выбирали «${sorted[0].option}»: ${sorted[0].count} из ${total} ответивших (${percentText(sorted[0].count, total)}).`;
    const others = sorted.filter(r => !leaders.includes(r));
    return `${opening} ${others.length ? `Остальные варианты распределились следующим образом: ${others.map(r => `«${r.option}» — ${r.count} (${percentText(r.count, total)})`).join('; ')}. ` : ''}Это распределение сохранённых синтетических ответов на конкретный вопрос. Оно описывает выбор внутри смоделированной группы, но само по себе не раскрывает причины этого выбора.${s.type === 'mixed' ? ' Причины отдельных решений рассматриваются далее по интервью тех же участников.' : ' Для уточнения причин можно провести интервью или проверить гипотезу с реальными участниками.'}`;
  }) });
  if (data.themes.length) sections.push({ title: 'Как понимать темы интервью', paragraphs: data.themes.map(theme => {
    const ids = [...new Set(theme.quotes.map(q => q.respondentId))];
    return `Тема «${theme.title}» раскрывает следующую интерпретацию: ${theme.interpretation} Её основание — дословные фрагменты участников ${ids.map(id => `№${id}`).join(', ')}. Цитаты представлены в визуальной части, а полные ответы — в приложении, чтобы можно было прочитать контекст и проверить связь между словами участника и выводом. Карта тем показывает наличие этих подтверждений. Пустая ячейка означает отсутствие цитаты в данной теме, а не отсутствие такого мнения у участника. Количество цитат не используется для оценки распространённости темы во всей выборке.`;
  }) });
  else if (data.quotes.length) sections.push({ title: 'Что можно прочитать в интервью', paragraphs: [`В отчёт включено ${data.included.length} завершённых интервью и ${data.quotes.length} сохранённых ответов. Тематический анализ ещё не добавлен, поэтому отчёт показывает исходный материал без автоматического назначения мотивов или оценок. Ответы можно сопоставить по вопросам: сначала прочитать позицию участника, затем проверить, какие обстоятельства и изменения он описывает. Полные расшифровки приведены в приложении; они сохраняют формулировки и контекст каждого ответа.`] });
  if (s.type === 'mixed') sections.push({ title: 'Как связаны два этапа', paragraphs: [`Количественная часть охватывает ${s.responses.length} сохранённых анкет, а интервью раскрывают опыт ${data.included.length} участников этой же группы. Связь между этапами сохраняется через номер участника. В схеме сопоставления показано, какой вариант он выбрал в анкете и какие темы подтверждаются его цитатами. Таким образом можно рассмотреть разные объяснения одинакового ответа или сходные обстоятельства у участников с разными ответами.`, 'Интервью не позволяют автоматически объяснить решения всех ответивших на анкету. Участники были отобраны для качественного этапа, и приведённые случаи характеризуют эту группу. Сопоставление помогает формулировать гипотезы и уточнять вопросы для следующего исследования, но не устанавливает причинную связь между характеристиками профиля и ответом.'] });
  sections.push({ title: 'Как использовать результаты', paragraphs: ['Начните с наиболее заметных различий в распределениях и тем, которые подкреплены конкретными цитатами. Для каждой рабочей гипотезы зафиксируйте, какой ответ или фрагмент стал её основанием и какое дополнительное наблюдение потребуется для проверки. Это поможет превратить отчёт в понятный план следующего исследования, не смешивая данные и предположения.', 'Все респонденты и ответы синтетические. Доли рассчитаны из сохранённых анкет, а интерпретации интервью проверяются по цитатам. Репрезентативность для населения не установлена, доверительные интервалы и статистическая значимость не рассчитываются. Перед практическими решениями выводы следует проверить на реальных данных.'] });
  return sections;
}
