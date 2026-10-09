import { generatePDF } from '../../lib/pdfReport';
import { validateLinks, type Study } from '../../lib/study';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 4000000) return Response.json({ error: 'Проект слишком большой для PDF. Максимум 4 МБ.' }, { status: 413 });
    const s = JSON.parse(raw) as Study;
    if (!s || s.version !== 1 || !['quantitative','qualitative','mixed'].includes(s.type) || typeof s.topic !== 'string' || typeof s.question !== 'string' || !Array.isArray(s.population) || s.population.length > 100000 || !Array.isArray(s.responses) || !Array.isArray(s.questionnaire) || !Array.isArray(s.selectedIds) || !s.interviews || typeof s.guide !== 'string') return Response.json({ error: 'Некорректный проект.' }, { status: 400 });
    validateLinks(s);
    const pdf = await generatePDF(s);
    return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="synthetic-research.pdf"', 'Cache-Control': 'no-store' } });
  } catch (e) { return Response.json({ error: e instanceof Error ? e.message : 'Не удалось сформировать PDF.' }, { status: 400 }); }
}
