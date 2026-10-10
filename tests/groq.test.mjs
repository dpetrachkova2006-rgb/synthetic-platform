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
    assert.equal(limited.headers.get('retry-after'), '2.5');
    assert.doesNotMatch((await limited.json()).error.message, /Private/);
  } finally {
    global.fetch = original.fetch;
    for (const name of ['AI_PROVIDER', 'GROQ_API_KEY', 'GROQ_MODEL']) { if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name]; }
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
