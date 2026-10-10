export type GroqQuotaKind = 'tokens-day' | 'requests-day' | 'tokens-minute' | 'requests-minute' | 'request-size' | 'rate-limit';

export function groqQuota(reason: string, retryHeader: string | null) {
  const named = reason.match(/on\s+(?:input\s+|output\s+)?(?:tokens|requests)\s+per\s+(?:day|minute)\s*\((TPD|RPD|TPM|RPM|ITPM|OTPM)\)/i)?.[1];
  const metric = named ?? reason.match(/\b(TPD|RPD|TPM|RPM|ITPM|OTPM)\b/i)?.[1];
  const kind: GroqQuotaKind = /request too large/i.test(reason) ? 'request-size'
    : metric?.toUpperCase() === 'TPD' || (!metric && /tokens per day/i.test(reason)) ? 'tokens-day'
    : metric?.toUpperCase() === 'RPD' || (!metric && /requests per day/i.test(reason)) ? 'requests-day'
    : metric && ['TPM', 'ITPM', 'OTPM'].includes(metric.toUpperCase()) ? 'tokens-minute'
    : metric?.toUpperCase() === 'RPM' ? 'requests-minute' : 'rate-limit';
  const headerSeconds = Number(retryHeader);
  const duration = reason.match(/try again in\s+((?:\d+(?:\.\d+)?\s*[hms]\s*)+)/i)?.[1];
  const parsedSeconds = duration ? [...duration.matchAll(/(\d+(?:\.\d+)?)\s*([hms])/gi)].reduce((sum, part) => sum + Number(part[1]) * ({ h: 3600, m: 60, s: 1 }[part[2].toLowerCase()] ?? 0), 0) : 0;
  const candidate = Number.isFinite(headerSeconds) && headerSeconds > 0 ? headerSeconds : parsedSeconds;
  const retrySeconds = candidate > 0 && candidate <= 172800 ? Math.ceil(candidate) : null;
  const base = kind === 'request-size' ? 'Объём этого этапа превышает лимит одного запроса Groq. Сократите число участников или длину интервью.'
    : kind === 'tokens-day' ? 'Дневной квоты Groq на объём текста пока недостаточно для следующего ответа.'
    : kind === 'requests-day' ? 'Достигнут дневной лимит запросов Groq.'
    : 'Groq ограничил скорость генерации. Нужно дождаться восстановления квоты.';
  const delay = retrySeconds && kind !== 'request-size'
    ? ` Следующая попытка — примерно через ${retrySeconds < 60 ? `${retrySeconds} сек.` : retrySeconds < 3600 ? `${Math.ceil(retrySeconds / 60)} мин.` : `${Math.ceil(retrySeconds / 3600)} ч.`}`
    : kind !== 'request-size' ? ' Повторите после восстановления квоты.' : '';
  return { kind, retrySeconds, message: base + delay + ' Полученные ответы сохранены.' };
}
