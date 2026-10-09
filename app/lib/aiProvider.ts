/** Server-side provider selection. Keys must never be imported into client components. */
export function getAIConfig() {
  const provider = process.env.AI_PROVIDER || (process.env.OPENROUTER_API_KEY ? 'openrouter' : process.env.XAI_API_KEY ? 'xai' : 'groq');
  if (provider !== 'xai' && provider !== 'groq' && provider !== 'openrouter') throw new Error('Неизвестный AI_PROVIDER.');
  return {
    provider,
    apiKey: provider === 'openrouter' ? process.env.OPENROUTER_API_KEY : provider === 'xai' ? process.env.XAI_API_KEY : process.env.GROQ_API_KEY,
    model: provider === 'openrouter' ? process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free' : provider === 'xai' ? process.env.XAI_MODEL || 'grok-4.7' : process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    url: provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : provider === 'xai' ? 'https://api.x.ai/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions',
  };
}
export function getAIKey() { return getAIConfig().apiKey; }
export function getAIModel(groqModel: string) {
  const config = getAIConfig();
  return config.provider === 'groq' ? groqModel : config.model;
}
export async function aiFetch(_legacyUrl: string, options: RequestInit): Promise<Response> {
  const config = getAIConfig();
  if (!config.apiKey) throw new Error('Не настроен серверный ключ сервиса генерации.');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${config.apiKey}`);
  headers.set('Content-Type', 'application/json');
  const payload = JSON.parse(String(options.body));
  if (config.provider !== 'groq') {
    payload.model = config.model;
    if (payload.max_completion_tokens !== undefined) {
      payload.max_tokens = payload.max_completion_tokens;
      delete payload.max_completion_tokens;
    }
  }
  if (config.provider === 'openrouter') {
    if (!config.model.endsWith(':free') && config.model !== 'openrouter/free') {
      throw new Error('Для OpenRouter разрешены только бесплатные модели с суффиксом :free.');
    }
    // Never silently route this project to a paid model or provider.
    delete payload.models;
    delete payload.route;
    payload.provider = { require_parameters: true, max_price: { prompt: 0, completion: 0, request: 0 } };
    headers.set('HTTP-Referer', 'https://resilient-salamander-0ffc69.netlify.app');
    headers.set('X-OpenRouter-Title', 'Synthetic Respondents');
  }
  const response = await fetch(config.url, { ...options, headers, body: JSON.stringify(payload), signal: options.signal || AbortSignal.timeout(55000) });
  if (config.provider === 'openrouter' && !response.ok) {
    const error = response.status === 401 ? 'OpenRouter отклонил API-ключ. Проверьте серверные настройки.'
      : response.status === 402 ? 'OpenRouter требует оплату. Платная генерация в проекте отключена.'
      : response.status === 429 ? 'Исчерпан бесплатный лимит OpenRouter или модель временно перегружена. Сохранённые ответы доступны; повторите позже.'
      : response.status === 404 || response.status === 503 ? 'Бесплатная модель OpenRouter сейчас недоступна. Повторите позже.' : null;
    if (error) return Response.json({ error: { message: error } }, { status: response.status });
  }
  if (!response.ok && config.provider === 'xai') {
    // Translate actionable failures without returning credentials or private team identifiers.
    const failure = await response.clone().text();
    const message = failure.toLowerCase();
    if (response.status === 403 && (message.includes('credits') || message.includes('licenses'))) throw new Error('В аккаунте xAI нет кредитов или лицензии для API. Пополните баланс в console.x.ai и повторите генерацию.');
    if (response.status === 401) throw new Error('xAI отклонил API-ключ. Проверьте серверные настройки.');
  }
  return response;
}
