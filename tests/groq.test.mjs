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
  const { reportQuoteLibrary } = load(root + '/app/lib/reportQuotes.ts');
  const source = 'Мне удобно. Но хотелось бы чаще ездить вечером. Это важный вопрос.';
  const quotes = reportQuoteLibrary([{ respondent: { id: 91 }, transcript: [{ question: 'Почему?', answer: source }] }]);
  assert.equal(quotes.length, 3);
  assert.deepEqual(quotes.map(q => q.quoteId), [1, 2, 3]);
  assert.ok(quotes.every(q => q.respondentId === 91 && q.question === 'Почему?' && source.includes(q.quote)));
  assert.deepEqual(reportQuoteLibrary([null, { transcript: [] }]), []);
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
