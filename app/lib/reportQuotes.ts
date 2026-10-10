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
