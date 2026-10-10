export type ReportQuote = { quoteId: number; respondentId: number; question: string; quote: string };
/** Prepare exact, contiguous excerpts; the model chooses references, never rewrites quotes. */
export function reportQuoteLibrary(interviews: unknown[]): ReportQuote[] {
  const quotes: ReportQuote[] = [];
  for (const interview of interviews) {
    const item = interview as { respondent?: { id?: number }; transcript?: { question?: string; answer?: string }[] } | null;
    if (!Number.isInteger(item?.respondent?.id) || !Array.isArray(item?.transcript)) continue;
    for (const turn of item.transcript) {
      if (typeof turn.question !== 'string' || typeof turn.answer !== 'string') continue;
      const sentences = turn.answer.split(/(?<=[.!?])\s+/u).filter(s => s.trim()).slice(0, 3);
      for (const sentence of sentences) {
        // Cutting a long sentence preserves an exact substring without invented punctuation.
        const quote = sentence.trim().slice(0, 500);
        if (quote) quotes.push({ quoteId: quotes.length + 1, respondentId: item.respondent!.id!, question: turn.question, quote });
      }
    }
  }
  return quotes;
}

/** Send each answer once, labelling exact quote spans instead of duplicating their text. */
export function reportTranscriptSegments(respondentId: number, question: string, answer: string, quotes: ReportQuote[]) {
  const segments: { text: string; quoteId?: number }[] = [];
  let cursor = 0;
  for (const quote of quotes.filter(q => q.respondentId === respondentId && q.question === question)) {
    const start = answer.indexOf(quote.quote, cursor);
    if (start < 0) continue;
    if (start > cursor) segments.push({ text: answer.slice(cursor, start) });
    segments.push({ text: quote.quote, quoteId: quote.quoteId });
    cursor = start + quote.quote.length;
  }
  if (cursor < answer.length) segments.push({ text: answer.slice(cursor) });
  return segments;
}
