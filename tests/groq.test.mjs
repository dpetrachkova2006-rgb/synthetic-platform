import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), root = process.cwd(), modules = new Map();
function load(file) {
  file = path.resolve(file);
  if (modules.has(file)) return modules.get(file);
  const mod = { exports: {} }; modules.set(file, mod.exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name + '.ts')) : require(require.resolve(name, { paths: [root] })), mod, mod.exports);
  return mod.exports;
}
test('Groq uses the configured current model, strict interviews and safe quota errors', async () => {
  const original = { fetch: global.fetch, AI_PROVIDER: process.env.AI_PROVIDER, GROQ_API_KEY: process.env.GROQ_API_KEY, GROQ_MODEL: process.env.GROQ_MODEL };
  process.env.AI_PROVIDER = 'groq'; process.env.GROQ_API_KEY = 'test-only'; process.env.GROQ_MODEL = 'openai/gpt-oss-120b';
  const provider = load(root + '/app/lib/aiProvider.ts');
  let sent;
  global.fetch = async (_, options) => { sent = JSON.parse(options.body); return Response.json({ choices: [{ message: { content: JSON.stringify({ distribution: { fullySupport: 100 }, explanation: 'Тестовая гипотеза.' }) } }] }); };
  try {
    const distribution = load(root + '/app/api/generate-distribution/route.ts');
    const r = await distribution.POST(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ topic: 'Транспорт', question: 'Удобно ли ездить?' }) }));
    assert.equal((await r.json()).sourceMode, 'ai-estimate');
    assert.equal(sent.model, 'openai/gpt-oss-120b'); // The retired llama model never reaches Groq.
    assert.equal(sent.reasoning_effort, 'low'); assert.equal(sent.include_reasoning, false);
    assert.equal(provider.getAIModel('retired-model'), 'openai/gpt-oss-120b');
    assert.equal(provider.supportsStrictJSON(), true);
    const study = load(root + '/app/api/study/route.ts');
    const turns = [{ question: 'Почему?', answer: 'Мне удобно.' }];
    global.fetch = async (_, options) => { sent = JSON.parse(options.body); return Response.json({ choices: [{ message: { content: JSON.stringify({ turns }) } }] }); };
    const request = new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ researchId: 'test', topic: 'Транспорт', question: 'Удобно ли?', action: 'interviewBatch', respondent: { id: 7, name: 'Анна' }, questions: ['Почему?'], history: [], survey: [] }) });
    assert.equal((await study.POST(request)).status, 200);
    assert.equal(sent.response_format.json_schema.name, 'interview_turns');
    assert.equal(sent.response_format.json_schema.schema.properties.turns.minItems, 1);
    let repairCalls = 0;
    const signal = new AbortController().signal;
    global.fetch = async (_, options) => {
      assert.equal(options.signal, signal);
      sent = JSON.parse(options.body);
      return ++repairCalls === 1 ? Response.json({ error: { code: 'json_validate_failed', failed_generation: '{"answer":"SMS не приходит."}' } }, { status: 400 }) : Response.json({ choices: [{ message: { content: '{"answer":"СМС не приходит."}' } }] });
    };
    const repaired = await provider.aiFetch('', { signal, body: JSON.stringify({ messages: [], response_format: { type: 'json_schema' } }) });
    assert.equal(repaired.status, 200); assert.equal(repairCalls, 2);
    assert.match(sent.messages.at(-1).content, /SMS — СМС/);
    assert.equal(sent.model, 'openai/gpt-oss-120b');
    global.fetch = async () => Response.json({ error: { message: 'Private organization detail' } }, { status: 429, headers: { 'Retry-After': '2.5' } });
    const limited = await provider.aiFetch('', { body: '{}' });
    assert.equal(limited.headers.get('retry-after'), '3');
    assert.doesNotMatch((await limited.json()).error.message, /Private/);
  } finally {
    global.fetch = original.fetch;
    for (const name of ['AI_PROVIDER', 'GROQ_API_KEY', 'GROQ_MODEL']) { if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name]; }
  }
});

test('Groq quota errors identify the actual limit and expose only a safe retry time', () => {
  const { groqQuota } = load(root + '/app/lib/groqQuota.ts');
  const daily = groqQuota('Rate limit reached for model in organization org_private on tokens per day (TPD): Limit 200000, Used 199700, Requested 800. Please try again in 3m14s.', null);
  assert.equal(daily.kind, 'tokens-day');
  assert.equal(daily.retrySeconds, 194);
  assert.match(daily.message, /объём текста.*недостаточно/);
  assert.match(daily.message, /4 мин/);
  assert.doesNotMatch(daily.message, /org_private|199700|Исчерпан/);
  assert.equal(groqQuota('on tokens per minute (TPM); TPD quota still available', '8').kind, 'tokens-minute');
  assert.equal(groqQuota('on requests per day (RPD)', '3600').kind, 'requests-day');
  assert.equal(groqQuota('Request too large for tokens per day (TPD)', '15').kind, 'request-size');
  assert.equal(groqQuota('Rate limit reached', 'bad').retrySeconds, null);
});

test('optimized interviews retain all context, return ordered answers and reject incomplete pairs', async () => {
  const original = { fetch: global.fetch, AI_PROVIDER: process.env.AI_PROVIDER, GROQ_API_KEY: process.env.GROQ_API_KEY };
  process.env.AI_PROVIDER = 'groq'; process.env.GROQ_API_KEY = 'test-only';
  const body = { researchId: 'preserve-history', topic: 'Покупки', question: 'Как выбираете доставку?', action: 'interviewBatch', respondent: { id: 1, name: 'Анна', city: 'Москва' }, questions: ['Почему?', 'Что изменить?'], history: [{ question: 'Как заказываете?', answer: 'Заказываю по телефону, потому что сайт мне неудобен.' }], survey: [{ question: 'Как часто?', answer: 'Раз в неделю' }] };
  const snapshot = JSON.stringify(body);
  let sent;
  let turns = [{ question: body.questions[0], answer: 'Мне удобнее поговорить с оператором.' }, { question: body.questions[1], answer: 'Хочу проще выбирать время доставки.' }];
  global.fetch = async (_, options) => { sent = JSON.parse(options.body); return Response.json({ choices: [{ message: { content: JSON.stringify({ turns }) } }] }); };
  try {
    const { GET } = load(root + '/app/api/ai-status/route.ts');
    assert.equal((await (await GET()).json()).interviewBatchSize, 2);
    const { POST } = load(root + '/app/api/study/route.ts');
    const request = () => new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) });
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).turns, turns);
    const context = JSON.parse(sent.messages.at(-1).content);
    assert.deepEqual(context.history, body.history);
    assert.deepEqual(context.survey, body.survey);
    assert.deepEqual(context.questions, body.questions);
    assert.equal(context.respondent.id, 1);
    assert.equal(Object.keys(context).at(-1), 'questions');
    assert.equal(sent.model, 'openai/gpt-oss-20b');
    assert.equal(context.researchId, undefined);
    assert.ok(sent.max_completion_tokens >= 2500 && sent.max_completion_tokens < 4000);
    assert.equal(JSON.stringify(body), snapshot);
    turns = turns.slice(0, 1);
    assert.equal((await POST(request())).status, 502);
  } finally {
    global.fetch = original.fetch;
    for (const name of ['AI_PROVIDER', 'GROQ_API_KEY']) if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name];
  }
});

test('daily analysis fallback is bounded to one smaller Groq model and uses the same cancellation signal', async () => {
  const original = { fetch: global.fetch, AI_PROVIDER: process.env.AI_PROVIDER, GROQ_API_KEY: process.env.GROQ_API_KEY, GROQ_MODEL: process.env.GROQ_MODEL };
  process.env.AI_PROVIDER = 'groq'; process.env.GROQ_API_KEY = 'test-only'; process.env.GROQ_MODEL = 'openai/gpt-oss-120b';
  const provider = load(root + '/app/lib/aiProvider.ts');
  const signal = new AbortController().signal;
  const sent = [];
  try {
    global.fetch = async (_, options) => {
      assert.equal(options.signal, signal);
      sent.push(JSON.parse(options.body));
      return sent.length === 1 ? Response.json({ error: { message: 'on tokens per day (TPD)' } }, { status: 429 }) : Response.json({ model: 'openai/gpt-oss-20b', choices: [{ message: { content: '{}' } }] });
    };
    const options = { signal, body: JSON.stringify({ messages: [{ role: 'user', content: 'Проанализируй цитаты.' }], response_format: { type: 'json_schema', json_schema: { name: 'report' } } }) };
    const result = await provider.aiFetch('', options, { smallerModelOnDailyQuota: true });
    assert.equal(result.status, 200);
    assert.deepEqual(sent.map(p => p.model), ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);
    assert.deepEqual(sent[0].messages, sent[1].messages);
    assert.deepEqual(sent[0].response_format, sent[1].response_format);
    sent.length = 0;
    global.fetch = async (_, options) => { sent.push(JSON.parse(options.body)); return Response.json({ error: { message: 'on tokens per minute (TPM)' } }, { status: 429 }); };
    assert.equal((await provider.aiFetch('', options, { smallerModelOnDailyQuota: true })).status, 429);
    assert.equal(sent.length, 1);
    sent.length = 0;
    global.fetch = async (_, options) => { sent.push(JSON.parse(options.body)); return Response.json({ error: { message: 'on tokens per day (TPD)' } }, { status: 429 }); };
    assert.equal((await provider.aiFetch('', options, { smallerModelOnDailyQuota: true })).status, 429);
    assert.equal(sent.length, 2);
    await assert.rejects(provider.aiFetch('', options, { model: 'unknown-paid-model' }), /Недопустимая модель/);
  } finally {
    global.fetch = original.fetch;
    for (const name of ['AI_PROVIDER', 'GROQ_API_KEY', 'GROQ_MODEL']) if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name];
  }
});

test('interview batches adapt to long histories without removing saved turns', () => {
  const { nextGroqInterviewBatch } = load(root + '/app/lib/researchEconomy.ts');
  const questions = ['Почему?', 'Что изменить?', 'Как выбираете?'];
  const short = { history: [{ question: 'Что важно?', answer: 'Точность доставки.' }] };
  assert.deepEqual(nextGroqInterviewBatch(questions, short), questions.slice(0, 2));
  const long = { history: Array.from({ length: 8 }, (_, i) => ({ question: `Вопрос ${i}`, answer: 'Подробный ответ участника. '.repeat(50) })) };
  const saved = JSON.stringify(long);
  assert.deepEqual(nextGroqInterviewBatch(questions, long), questions.slice(0, 1));
  assert.equal(JSON.stringify(long), saved);
  assert.deepEqual(nextGroqInterviewBatch(questions.slice(2), short), [questions[2]]);
});

test('report analysis receives the complete answer once and still returns an exact verified quote', async () => {
  const original = { fetch: global.fetch, AI_PROVIDER: process.env.AI_PROVIDER, GROQ_API_KEY: process.env.GROQ_API_KEY };
  process.env.AI_PROVIDER = 'groq'; process.env.GROQ_API_KEY = 'test-only';
  const answer = 'Мне важна точность доставки. Ещё я хочу выбирать удобное время. Цены тоже сравниваю. Но иногда выбираю магазин рядом.';
  let sent;
  global.fetch = async (_, options) => { sent = JSON.parse(options.body); return Response.json({ choices: [{ message: { content: JSON.stringify({ report: '', themes: [{ title: 'Точность доставки', interpretation: 'Участник ценит соблюдение времени доставки.', quotes: [{ quoteId: 1 }] }] }) } }] }); };
  try {
    const { POST } = load(root + '/app/api/study/route.ts');
    const evidence = { type: 'qualitative', sample: { size: 1 }, interviewCoverage: { selected: 1, included: 1 }, interviews: [{ respondent: { id: 7, name: 'Анна' }, transcript: [{ question: 'Что важно?', answer }] }] };
    const r = await POST(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ researchId: 'quote-check', topic: 'Доставка', question: 'Что важно при выборе?', action: 'report', evidence }) }));
    assert.equal(r.status, 200);
    const input = JSON.parse(sent.messages.at(-1).content);
    assert.equal(input.evidence.availableQuotes, undefined);
    assert.equal(input.evidence.interviews[0].transcript[0].segments.map(s => s.text).join(''), answer);
    const result = await r.json();
    assert.deepEqual(result.themes[0].quotes, [{ respondentId: 7, question: 'Что важно?', quote: 'Мне важна точность доставки.' }]);
  } finally {
    global.fetch = original.fetch;
    for (const name of ['AI_PROVIDER', 'GROQ_API_KEY']) if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name];
  }
});

test('interview pause accepts a three-minute wait and remains cancellable', async () => {
  const { providerRetryDelay, waitForProvider } = load(root + '/app/lib/providerPause.ts');
  const limited = new Response(null, { status: 429, headers: { 'Retry-After': '194', 'X-AI-Quota': 'tokens-day' } });
  assert.equal(providerRetryDelay(limited), 194);
  assert.equal(providerRetryDelay(new Response(null, { status: 429, headers: { 'Retry-After': '901' } })), null);
  assert.equal(providerRetryDelay(new Response(null, { status: 429, headers: { 'Retry-After': '10', 'X-AI-Quota': 'request-size' } })), null);
  const controller = new AbortController();
  let remaining = 0;
  const pause = waitForProvider(194, controller.signal, seconds => { remaining = seconds; });
  const cancelled = assert.rejects(pause, { name: 'AbortError' });
  assert.ok(remaining >= 194 && remaining <= 195);
  controller.abort();
  await cancelled;
  await assert.rejects(waitForProvider(194, controller.signal, () => assert.fail('Aborted pause must not start')), { name: 'AbortError' });
});

test('study forwards the quota type and provider retry time without private details', async () => {
  const original = { fetch: global.fetch, AI_PROVIDER: process.env.AI_PROVIDER, GROQ_API_KEY: process.env.GROQ_API_KEY };
  process.env.AI_PROVIDER = 'groq'; process.env.GROQ_API_KEY = 'test-only';
  global.fetch = async () => Response.json({ error: { message: 'Rate limit reached in organization org_private on tokens per day (TPD). Please try again in 3m14s.' } }, { status: 429 });
  try {
    const { POST } = load(root + '/app/api/study/route.ts');
    const response = await POST(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ researchId: 'resume', topic: 'Оплата', question: 'Как удобно платить?', action: 'interviewBatch', respondent: { id: 1, name: 'Анна' }, questions: ['Почему?'], history: [{ question: 'Как платите?', answer: 'Пользуюсь картой.' }], survey: [] }) }));
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('X-AI-Quota'), 'tokens-day');
    assert.equal(response.headers.get('Retry-After'), '194');
    assert.doesNotMatch((await response.json()).error, /org_private/);
  } finally {
    global.fetch = original.fetch;
    for (const name of ['AI_PROVIDER', 'GROQ_API_KEY']) if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name];
  }
});
test('report quote references preserve exact source excerpts and participant numbers', () => {
  const { reportQuoteLibrary, reportTranscriptSegments } = load(root + '/app/lib/reportQuotes.ts');
  const source = 'Мне удобно. Но хотелось бы чаще ездить вечером. Это важный вопрос.';
  const quotes = reportQuoteLibrary([{ respondent: { id: 91 }, transcript: [{ question: 'Почему?', answer: source }] }]);
  assert.equal(quotes.length, 3);
  assert.deepEqual(quotes.map(q => q.quoteId), [1, 2, 3]);
  assert.ok(quotes.every(q => q.respondentId === 91 && q.question === 'Почему?' && source.includes(q.quote)));
  assert.deepEqual(reportQuoteLibrary([null, { transcript: [] }]), []);
  const segments = reportTranscriptSegments(91, 'Почему?', source, quotes);
  assert.equal(segments.map(s => s.text).join(''), source);
  assert.deepEqual(segments.filter(s => s.quoteId).map(s => s.quoteId), [1, 2, 3]);
  const long = 'Подробный ответ.\n\n' + 'Большое предложение без завершения '.repeat(40) + '. Последнее пояснение.';
  const longQuotes = reportQuoteLibrary([{ respondent: { id: 7 }, transcript: [{ question: 'Что важно?', answer: long }] }]);
  assert.equal(reportTranscriptSegments(7, 'Что важно?', long, longQuotes).map(s => s.text).join(''), long);
});

test('saved reports use counted statistics and never reuse fabricated model percentages', () => {
  const { verifiedReportText } = load(root + '/app/lib/verifiedReport.ts');
  const evidence = { type: 'mixed', sample: { size: 30 }, quantitative: [{ text: 'Как оформляете заказ?', distribution: [{ option: 'Приложение', count: 10 }, { option: 'Сайт', count: 10 }, { option: 'Телефон', count: 10 }] }], interviewCoverage: { selected: 2, included: 1, preliminary: true } };
  const text = verifiedReportText(evidence, [{ title: 'Удобство', interpretation: 'Участнику удобно сравнивать товары.' }]);
  assert.match(text, /Предварительный отчёт/);
  assert.match(text, /1 из 2/);
  assert.match(text, /«Приложение», «Сайт», «Телефон» — 10 из 30 ответов \(33,3%\)/);
  assert.match(text, /Участнику удобно/);
  const study = load(root + '/app/lib/study.ts');
  const { reportNarrative } = load(root + '/app/lib/reportData.ts');
  const project = { ...study.createStudy('quantitative', 'Покупки', 'Как оформляете заказ?'), workflow: 'survey', population: [{ id: 1, age: 30, gender: 'женщина' }, { id: 2, age: 35, gender: 'мужчина' }], questionnaire: [{ id: 'q', text: 'Как оформляете заказ?', options: ['Приложение', 'Сайт'] }], responses: [{ respondentId: 1, answers: { q: 'Приложение' } }, { respondentId: 2, answers: { q: 'Сайт' } }], report: 'Приложение выбирают 99% участников.' };
  assert.match(reportNarrative(project), /1 из 2 ответов \(50%\)/);
  assert.doesNotMatch(reportNarrative(project), /99%/);
  assert.equal(reportNarrative({ ...project, workflow: undefined }), project.report); // Preserve the separate legacy report format.
});
