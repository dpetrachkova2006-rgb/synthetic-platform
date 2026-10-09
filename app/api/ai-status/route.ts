import { getAIConfig } from '../../lib/aiProvider';
export async function GET() {
  const c = getAIConfig();
  const free = c.provider === 'openrouter' && (c.model.endsWith(':free') || c.model === 'openrouter/free');
  const inputPrice=Number(process.env.AI_INPUT_USD_PER_MILLION), outputPrice=Number(process.env.AI_OUTPUT_USD_PER_MILLION);
  const maxPrice=free?0:!!process.env.AI_INPUT_USD_PER_MILLION&&!!process.env.AI_OUTPUT_USD_PER_MILLION&&Number.isFinite(inputPrice)&&Number.isFinite(outputPrice)&&inputPrice>=0&&outputPrice>=0?Math.max(inputPrice,outputPrice):null;
  return Response.json({ provider: c.provider, model: c.model, configured: !!c.apiKey, free, maxPricePerMillion: maxPrice, priceNote: free ? '$0; дневная квота аккаунта общая для всех проектов' : 'Стоимость зависит от тарифа аккаунта; лимиты проекта контролируют токены и запросы, не денежные списания', maxRequestTokens: Number(process.env.AI_MAX_REQUEST_TOKENS || 60000) }, { headers: { 'Cache-Control': 'no-store' } });
}
