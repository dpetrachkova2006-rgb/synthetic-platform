import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), root = process.cwd(), modules = new Map();
function load(file) {
  file = path.resolve(file);
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (modules.has(file)) return modules.get(file);
  const mod = { exports: {} }; modules.set(file, mod.exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name.endsWith('.json') ? name : name + '.ts')) : require(path.resolve(root, 'node_modules', name)), mod, mod.exports);
  return mod.exports;
}
const study = load(root + '/app/lib/study.ts');
const drafts = load(root + '/app/lib/questionDrafts.ts');
const flow = load(root + '/app/lib/studyFlow.ts');
const navigation = load(root + '/app/lib/projectNavigation.ts');
const api = load(root + '/app/api/generate-questions/route.ts');
const studyApi = load(root + '/app/api/study/route.ts');
const surveyDrafts = [{ text: 'Как часто вы пользуетесь автобусом?', options: ['Каждый день', 'Несколько раз в неделю', 'Редко', 'Никогда'] }];
const interviewDrafts = [{ text: 'Расскажите о последней поездке на автобусе.', options: [] }];
test('drafts append without replacing questions or answers; survey reports skip interviews', () => {
  const project = { ...study.createStudy('quantitative', 'Транспорт', 'Как ездят на автобусе?'), workflow: 'survey' };
  const first = drafts.appendQuestionDrafts(project, 'survey', surveyDrafts);
  assert.equal(project.questionnaire.length, 0);
  assert.equal(first.questionnaire.length, 1);
  assert.ok(first.questionnaire[0].id);
  assert.throws(() => drafts.appendQuestionDrafts(first, 'survey', [{ ...surveyDrafts[0], text: '  КАК часто вы пользуетесь автобусом? ' }]), /уже есть/);
  const second = drafts.appendQuestionDrafts(first, 'survey', [{ text: 'Насколько вам удобно расписание?', options: ['Удобно', 'Неудобно'] }]);
  assert.deepEqual(second.questionnaire[0], first.questionnaire[0]);
  assert.notEqual(second.questionnaire[0].id, second.questionnaire[1].id);
  assert.throws(() => drafts.appendQuestionDrafts({ ...first, responses: [{ respondentId: 7, answers: {} }] }, 'survey', [{ text: 'Почему?', options: ['Да', 'Нет'] }]), /нельзя изменить/);
  const qualitative = { ...study.createStudy('qualitative', 'Транспорт', 'Поездки'), guide: 'Что для вас важно?' };
  const added = drafts.appendQuestionDrafts(qualitative, 'interview', interviewDrafts);
  assert.equal(added.guide, 'Что для вас важно?\nРасскажите о последней поездке на автобусе.');
  assert.throws(() => drafts.appendQuestionDrafts({ ...qualitative, interviews: { 7: [{ question: 'Что для вас важно?', answer: 'Удобство.' }] } }, 'interview', interviewDrafts), /нельзя изменить/);
  assert.throws(() => drafts.validateQuestionDrafts([{ text: 'Почему?', options: ['Да', ' да '] }], 'survey'), /разных/);
  assert.throws(() => drafts.validateQuestionDrafts([{ text: 'Почему?\nКак?', options: [] }], 'interview'), /переноса/);
  assert.throws(() => drafts.validateQuestionDrafts([{ text: 'Почему?', options: ['Да', 'Нет'] }], 'interview'), /открытые/);
  assert.throws(() => drafts.appendQuestionDrafts({ ...first, questionnaire: Array.from({ length: 10 }, (_, i) => ({ id: String(i), text: `Вопрос ${i}`, options: ['Да', 'Нет'] })) }, 'survey', surveyDrafts), /до 10/);
  assert.ok(flow.stageAccess(first, 3));
  assert.ok(flow.reportBlocker(first));
  const complete = { ...first, population: [{ id: 7, name: 'Анна', age: 25, gender: 'женщина', city: 'Москва', education: 'высшее', income: 'средний' }], responses: [{ respondentId: 7, answers: { [first.questionnaire[0].id]: 'Каждый день' } }] };
  assert.equal(flow.stageAccess(complete, 3), null);
  assert.equal(flow.reportBlocker(complete), null);
  assert.deepEqual(flow.reportIncludedIds(complete), [7]);
  const evidence = study.buildReportEvidence(complete);
  assert.deepEqual(evidence.interviews, []);
  assert.equal(evidence.quantitative[0].distribution[0].count, 1);
  const storage = new Map(); global.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };
  study.saveStudy(complete);
  assert.equal(navigation.activateProject(complete), `/study?id=${complete.researchId}`);
  localStorage.setItem('research_id', complete.researchId); localStorage.setItem('synthetic_population', '[]');
  navigation.snapshotActiveProject();
  assert.equal(study.readStudies()[0].population.length, 1);
});
test('question API validates generation, language, errors and quantitative evidence', async () => {
  const original = { fetch: global.fetch, provider: process.env.AI_PROVIDER, key: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL };
  process.env.AI_PROVIDER = 'openrouter'; process.env.OPENROUTER_API_KEY = 'test-only'; delete process.env.OPENROUTER_MODEL;
  const body = { mode: 'survey', topic: 'Транспорт', brief: 'Хочу узнать привычки поездок', count: 1, existing: [] };
  const request = value => new Request('http://localhost/api/generate-questions', { method: 'POST', body: typeof value === 'string' ? value : JSON.stringify(value) });
  let calls = 0, sent;
  const upstream = result => { global.fetch = async (_, options) => { calls++; sent = JSON.parse(options.body); return Response.json({ choices: [{ message: { content: JSON.stringify(result) } }] }); }; };
  try {
    upstream({ questions: surveyDrafts });
    for (const invalid of ['bad json', { ...body, count: 0 }, { ...body, count: 11 }, { ...body, brief: '' }, { ...body, mode: 'other' }, { ...body, existing: Array(31).fill('Почему?') }]) assert.equal((await api.POST(request(invalid))).status, 400);
    assert.equal(calls, 0);
    const valid = await api.POST(request(body)); assert.equal(valid.status, 200); assert.deepEqual((await valid.json()).questions, surveyDrafts);
    assert.equal(sent.response_format.type, 'json_schema'); assert.equal(sent.response_format.json_schema.strict, true);
    assert.deepEqual(sent.provider.max_price, { prompt: 0, completion: 0, request: 0 });
    upstream({ questions: interviewDrafts }); assert.equal((await api.POST(request({ ...body, mode: 'interview', surveyQuestions: [surveyDrafts[0].text] }))).status, 200);
    assert.deepEqual(JSON.parse(sent.messages[1].content).surveyQuestions, [surveyDrafts[0].text]);
    for (const result of [{ questions: [] }, { questions: [surveyDrafts[0], surveyDrafts[0]] }, { questions: [{ text: 'Why do you like buses?', options: ['Да', 'Нет'] }] }, { questions: [{ text: 'Почему?', options: ['Yes', 'Нет'] }] }, { questions: [{ text: 'Почему?', options: ['Да'] }] }]) { upstream(result); assert.equal((await api.POST(request(body))).status, 502); }
    upstream({ questions: surveyDrafts }); assert.equal((await api.POST(request({ ...body, existing: [surveyDrafts[0].text] }))).status, 502);
    global.fetch = async () => Response.json({ error: { message: 'rate limit' } }, { status: 429 });
    const limited = await api.POST(request(body)); assert.equal(limited.status, 429); assert.match((await limited.json()).error, /лимит/);
    global.fetch = async () => Response.json({ choices: [{ finish_reason: 'length', message: { content: '{"questions":[' } }] });
    assert.match((await (await api.POST(request(body))).json()).error, /прервалась/);
    upstream({ report: 'Количественный анализ сохранённых ответов.', themes: [] });
    const quantitative = { ...study.createStudy('quantitative', 'Транспорт', 'Поездки'), workflow: 'survey', population: [{ id: 7, name: 'Анна', age: 25, gender: 'женщина', city: 'Москва', education: 'высшее', income: 'средний' }], questionnaire: [{ id: 'q', text: 'Ездите на автобусе?', options: ['Да', 'Нет'] }], responses: [{ respondentId: 7, answers: { q: 'Да' } }] };
    const reportBody = { researchId: quantitative.researchId, topic: quantitative.topic, question: quantitative.question, action: 'report', evidence: study.buildReportEvidence(quantitative) };
    assert.equal((await studyApi.POST(request(reportBody))).status, 200);
    reportBody.evidence.quantitative[0].distribution[0].count = 0;
    assert.equal((await studyApi.POST(request(reportBody))).status, 400);
  } finally {
    global.fetch = original.fetch;
    for (const [name, value] of [['AI_PROVIDER', original.provider], ['OPENROUTER_API_KEY', original.key], ['OPENROUTER_MODEL', original.model]]) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});
