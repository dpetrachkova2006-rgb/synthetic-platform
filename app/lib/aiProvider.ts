import { groqQuota } from './groqQuota';

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
export function getAIModel(_legacyModel: string) {
  void _legacyModel;
  return getAIConfig().model;
}
export function getInterviewModel() {
  const config = getAIConfig();
  if (config.provider !== 'groq') return config.model;
  const model = process.env.GROQ_INTERVIEW_MODEL || 'openai/gpt-oss-20b';
  if (!['openai/gpt-oss-20b', 'openai/gpt-oss-120b'].includes(model)) throw new Error('Неизвестная модель интервью Groq.');
  return model;
}
export function supportsStrictJSON(modelOverride?: string) {
  const { provider, model: configuredModel } = getAIConfig();
  const model = modelOverride ?? configuredModel;
  return (provider === 'openrouter' && model.startsWith('nvidia/nemotron-3-super')) ||
    (provider === 'groq' && ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'].includes(model));
}
type PatternSchema = { pattern?: string; properties?: Record<string, PatternSchema>; items?: PatternSchema };
function invalidPatternWords(value: unknown, schema: PatternSchema): string[] {
  if (typeof value === 'string' && schema.pattern) {
    const pattern = new RegExp(schema.pattern);
    return (value.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) ?? []).filter(word => !pattern.test(word));
  }
  if (Array.isArray(value)) return value.flatMap(item => invalidPatternWords(item, schema.items ?? {}));
  if (typeof value === 'object' && value !== null) return Object.entries(value).flatMap(([key, item]) => invalidPatternWords(item, schema.properties?.[key] ?? {}));
  return [];
}
export async function aiFetch(_legacyUrl: string, options: RequestInit, task: { model?: string; smallerModelOnDailyQuota?: boolean } = {}): Promise<Response> {
  const baseConfig = getAIConfig();
  if (task.model && task.model !== baseConfig.model && (baseConfig.provider !== 'groq' || !['openai/gpt-oss-20b', 'openai/gpt-oss-120b'].includes(task.model))) throw new Error('Недопустимая модель для этого этапа.');
  const config = { ...baseConfig, model: task.model ?? baseConfig.model };
  if (!config.apiKey) throw new Error('Не настроен серверный ключ сервиса генерации.');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${config.apiKey}`);
  headers.set('Content-Type', 'application/json');
  const payload = JSON.parse(String(options.body));
  payload.model = config.model;
  if (config.provider === 'groq') {
    if (config.model.startsWith('openai/gpt-oss-')) {
      payload.reasoning_effort = 'low';
      payload.include_reasoning = false;
    } else if (config.model === 'qwen/qwen3.8-27b') {
      payload.reasoning_effort = 'none';
    }
  }
  const limit = Number(process.env.AI_MAX_REQUEST_TOKENS || 60000);
  if (!Number.isFinite(limit) || limit < 2000) throw new Error('Некорректный серверный AI_MAX_REQUEST_TOKENS.');
  const estimatedInput = Math.ceil(JSON.stringify(payload.messages ?? []).length / 2);
  const outputLimit = Number(payload.max_completion_tokens ?? payload.max_tokens ?? 4500);
  if (estimatedInput + outputLimit > limit) throw new Error('Слишком большой объём данных для одного запроса. Сократите вопросы или историю интервью.');
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
    if (config.model.startsWith('nvidia/nemotron-3-super') && !payload.reasoning) {
      payload.reasoning = { max_tokens: Math.max(128, Math.min(Number(process.env.OPENROUTER_REASONING_TOKENS || 512), Math.floor((payload.max_tokens ?? 4500) / 4))), exclude: true };
    }
    // Never silently route this project to a paid model or provider.
    delete payload.models;
    delete payload.route;
    payload.provider = { require_parameters: true, max_price: { prompt: 0, completion: 0, request: 0 } };
    headers.set('HTTP-Referer', 'https://resilient-salamander-0ffc69.netlify.app');
    headers.set('X-OpenRouter-Title', 'Synthetic Respondents');
  }
  const signal = options.signal || AbortSignal.timeout(55000);
  let response = await fetch(config.url, { ...options, headers, body: JSON.stringify(payload), signal });
  if (config.provider === 'groq' && task.smallerModelOnDailyQuota && payload.model !== 'openai/gpt-oss-20b' && response.status === 429) {
    const failure = await response.clone().json().catch(() => null);
    const quota = groqQuota(typeof failure?.error?.message === 'string' ? failure.error.message : '', response.headers.get('retry-after'));
    if (quota.kind === 'tokens-day' || quota.kind === 'requests-day') {
      // One alternate-model attempt on the same Groq account; no new keys or paid service.
      payload.model = 'openai/gpt-oss-20b';
      payload.reasoning_effort = 'low';
      payload.include_reasoning = false;
      response = await fetch(config.url, { ...options, headers, body: JSON.stringify(payload), signal });
    }
  }
  if (config.provider === 'groq' && response.status === 400 && payload.response_format?.type === 'json_schema') {
    const failure = await response.clone().json().catch(() => null);
    if (failure?.error?.code === 'json_validate_failed' && typeof failure.error.failed_generation === 'string' && failure.error.failed_generation.length <= 40000) {
      // One repair on the same model, with the same schema and cancellation deadline.
      // Groq validates string patterns after generation, so even strict output may need a language repair.
      let invalidWords: string[] = [];
      try { invalidWords = [...new Set(invalidPatternWords(JSON.parse(failure.error.failed_generation), payload.response_format.json_schema?.schema ?? {}))].slice(0, 30); } catch { /* A malformed completion still gets one schema repair. */ }
      payload.messages.push({ role: 'assistant', content: failure.error.failed_generation }, { role: 'user', content: 'Предыдущий JSON не прошёл проверку. Исправь его строго по той же схеме, сохрани вопросы, порядок, номера участников и факты. Все текстовые значения должны быть на русском. Английские аббревиатуры переведи: SMS — СМС, ID — номер, PIN — ПИН-код, CVV — код безопасности. Размер выборки пиши словами «число участников», без латинских n и N. Не вставляй служебные коды проекта и вопросы вида q1 в текст отчёта. ' + (invalidWords.length ? `Обязательно переведи или убери следующие недопустимые вставки: ${invalidWords.join(', ')}. ` : '') + 'Верни только исправленный JSON.' });
      response = await fetch(config.url, { ...options, headers, body: JSON.stringify(payload), signal });
    }
  }
  if (config.provider === 'groq' && !response.ok) {
    const failure = await response.clone().json().catch(() => null);
    const reason = typeof failure?.error?.message === 'string' ? failure.error.message : '';
    const quota = groqQuota(reason, response.headers.get('retry-after'));
    const message = response.status === 401 ? 'Groq отклонил API-ключ. Проверьте серверные настройки.'
      : response.status === 429 ? quota.message
      : response.status === 404 ? 'Выбранная модель Groq недоступна. Проверьте серверные настройки.' : null;
    if (message) {
      const safeHeaders = new Headers();
      if (response.status === 429) {
        safeHeaders.set('X-AI-Quota', quota.kind);
        if (quota.retrySeconds) safeHeaders.set('Retry-After', String(quota.retrySeconds));
      }
      return Response.json({ error: { message } }, { status: response.status, headers: safeHeaders });
    }
  }
  if (config.provider === 'openrouter' && !response.ok) {
    let rateMessage = 'Исчерпан бесплатный лимит OpenRouter или модель временно перегружена. Сохранённые ответы доступны; повторите позже.';
    if (response.status === 429) {
      const failure = await response.clone().json().catch(() => null);
      const reason = typeof failure?.error?.message === 'string' ? failure.error.message : '';
      if (reason.includes('free-models-per-day')) {
        rateMessage = 'Исчерпан дневной бесплатный лимит OpenRouter.';
        const reset = Number(failure?.error?.metadata?.headers?.['X-RateLimit-Reset'] ?? response.headers.get('X-RateLimit-Reset'));
        if (Number.isFinite(reset) && reset > Date.now() && reset < Date.now() + 172800000) rateMessage += ` Лимит обновится ${new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(reset)} (МСК).`;
        rateMessage += ' Полученные результаты сохранены; после обновления лимита продолжите с этого этапа.';
      } else if (reason.includes('free-models-per-min')) rateMessage = 'Слишком много запросов к OpenRouter за минуту. Подождите минуту и продолжите. Полученные результаты сохранены.';
    }
    const error = response.status === 401 ? 'OpenRouter отклонил API-ключ. Проверьте серверные настройки.'
      : response.status === 402 ? 'OpenRouter требует оплату. Платная генерация в проекте отключена.'
      : response.status === 429 ? rateMessage
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
