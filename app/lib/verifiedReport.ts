export type ReportEvidence = {
  type: string;
  sample?: { size: number; age?: number[] };
  quantitative?: { text: string; distribution: { option: string; count: number }[] }[];
  selectionReason?: string;
  interviewCoverage?: { included: number; selected: number; preliminary?: boolean };
};
type Theme = { title: string; interpretation: string };

/** Numerical findings come from saved counts. Model prose is never a source of statistics. */
export function verifiedReportText(evidence: ReportEvidence, themes: Theme[] = []) {
  const blocks: string[] = [];
  const quantitative = evidence.type !== 'qualitative';
  const size = evidence.sample?.size ?? 0;
  blocks.push(`Характеристики выборки\nСинтетических профилей: ${size}. Люди не опрашивались.`);
  if (evidence.type !== 'quantitative' && evidence.interviewCoverage) {
    const coverage = evidence.interviewCoverage;
    blocks.push(`Общая информация\n${coverage.preliminary ? 'Предварительный отчёт. ' : ''}Завершённых интервью в отчёте: ${coverage.included} из ${coverage.selected} выбранных участников. Незавершённые интервью не анализируются.`);
  }
  if (quantitative && evidence.quantitative?.length) {
    const findings = evidence.quantitative.map(q => {
      const total = q.distribution.reduce((sum, d) => sum + d.count, 0);
      const max = Math.max(...q.distribution.map(d => d.count));
      const leaders = q.distribution.filter(d => d.count === max).map(d => d.option);
      const percent = (total ? max / total * 100 : 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 });
      return `${q.text}\n${leaders.length > 1 ? 'Равная наибольшая доля' : 'Самый частый ответ'}: «${leaders.join('», «')}» — ${max} из ${total} ответов (${percent}%).`;
    });
    blocks.push(`Результаты анкеты\n${findings.join('\n\n')}`);
  }
  if (evidence.type !== 'quantitative') {
    if (evidence.selectionReason) blocks.push(`Принципы отбора\n${evidence.selectionReason}`);
    if (themes.length) blocks.push(`Темы и мотивы интервью\n${themes.map(theme => `${theme.title}\n${theme.interpretation}`).join('\n\n')}`);
    if (evidence.type === 'mixed') blocks.push('Сопоставление результатов\nОпрос и интервью связаны через номера участников. Дословные цитаты раскрывают отдельные случаи; их нельзя автоматически переносить на всю выборку. Противоречия проверяйте по сохранённым ответам одного участника.');
  }
  blocks.push(`Выводы\n${evidence.type === 'quantitative' ? 'Частоты показывают распределение смоделированных ответов. Причины выбора без интервью не установлены.' : 'Интерпретации опираются на приведённые цитаты и помогают формулировать гипотезы для проверки реальными людьми.'}`);
  blocks.push('Ограничения\nВсе ответы синтетические. Репрезентативность не установлена. Моделирование не подтверждает причинные связи и не заменяет реальное исследование. Числа и проценты рассчитаны из сохранённых ответов, а не сгенерированы моделью.');
  return blocks.join('\n\n');
}
