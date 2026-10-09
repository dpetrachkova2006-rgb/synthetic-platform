import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = process.cwd();
test('linked studies: persistence, selection, completion, evidence and API validation', async () => {
const modules=new Map();
function load(file){file=path.resolve(file);if(modules.has(file))return modules.get(file);const loadedModule={exports:{}};modules.set(file,loadedModule.exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts')):require(path.resolve(root,'node_modules',name)),loadedModule,loadedModule.exports);return loadedModule.exports;}
const m=load(root+'/app/lib/study.ts');
const storage=new Map();global.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
const s=m.createStudy('mixed','Транспорт','Поддержка транспорта?');
s.population=[{id:7,name:'Анна',age:25,gender:'женщина',city:'Москва',education:'высшее',income:'средний'},{id:91,name:'Иван',age:60,gender:'мужчина',city:'Тверь',education:'среднее',income:'низкий'}];
s.questionnaire=[{id:'q1',text:'Поддерживаете?',options:['Да','Нет']}];
s.responses=[{respondentId:7,answers:{q1:'Да'}}];assert.equal(m.surveyComplete(s),false);
s.responses.push({respondentId:91,answers:{q1:'Нет'}});assert.equal(m.surveyComplete(s),true);
assert.deepEqual(m.filterRespondents(s,{gender:'женщина',minAge:18,maxAge:30,city:'моск',questionId:'q1',answer:'Да'}).map(p=>p.id),[7]);
assert.deepEqual(m.contrastIds(s,'q1','Да','Нет'),[7,91]);assert.throws(()=>m.contrastIds(s,'q1','Да','Да'));
s.selectedIds=[7,91];s.selectionReason='Контрастные группы по ответу';s.guide='Почему?';s.interviews={7:[{question:'Почему?',answer:'Есть оговорки.'}]};assert.equal(m.interviewsComplete(s),false);s.interviews[91]=[{question:'Почему?',answer:'Хотя я ответил нет, некоторые изменения поддерживаю.'}];assert.equal(m.interviewsComplete(s),true);
m.saveStudy(s);assert.deepEqual(m.readStudies()[0],s);assert.deepEqual(m.buildReportEvidence(s).interviews.map(i=>i.respondent.id),[7,91]);assert.equal(m.buildReportEvidence(s).quantitative[0].distribution[0].count,1);
assert.throws(()=>m.saveStudy({...s,selectedIds:[999]}));assert.throws(()=>m.saveStudy({...s,population:[s.population[0],s.population[0]]}));assert.throws(()=>m.saveStudy({...s,interviews:{999:[]}}));
const partial = { ...s, type: 'qualitative', interviews: { 7: s.interviews[7] } };
assert.deepEqual(m.completedInterviewIds(partial), [7]);
assert.equal(m.interviewsComplete(partial), false);
const draftEvidence = m.buildReportEvidence(partial, [7]);
assert.deepEqual(draftEvidence.interviews.map(i => i.respondent.id), [7]);
assert.deepEqual(draftEvidence.interviewCoverage, { selected: 2, completed: 1, included: 1, excludedIds: [91], preliminary: true });
assert.throws(() => m.buildReportEvidence(partial));
assert.throws(() => m.buildReportEvidence(partial, [91]));
assert.throws(() => m.buildReportEvidence(partial, [7, 7]));
assert.deepEqual(m.completedInterviewIds({ ...partial, interviews: { 7: [{ question: 'Почему?', answer: ' ' }] } }), []);
assert.equal(m.buildReportEvidence(s).interviewCoverage.preliminary, false);
m.saveStudy({ ...partial, report: 'Предварительный отчёт', reportRespondentIds: [7], stage: 3 });
assert.deepEqual(m.readStudies()[0].reportRespondentIds, [7]);

const snapshot=localStorage.getItem(m.STUDY_KEY);localStorage.setItem=()=>{throw Error('quota')};assert.throws(()=>m.saveStudy({...s,topic:'other'}));assert.equal(localStorage.getItem(m.STUDY_KEY),snapshot);localStorage.setItem=(k,v)=>storage.set(k,v);

const {POST}=load(root+'/app/api/study/route.ts');const request=body=>new Request('http://localhost/api/study',{method:'POST',body:JSON.stringify(body)});
assert.equal((await POST(new Request('http://localhost',{method:'POST',body:'invalid'}))).status,400);
const base={researchId:s.researchId,topic:s.topic,question:s.question};assert.equal((await POST(request({...base,action:'survey',respondents:[],questionnaire:s.questionnaire}))).status,400);
const originalKey = process.env.GROQ_API_KEY;
process.env.GROQ_API_KEY='test-only';const realFetch=global.fetch;const upstream=data=>global.fetch=async()=>Response.json({choices:[{message:{content:JSON.stringify(data)}}]});
upstream({ report: 'Предварительный отчёт по одному завершённому интервью.' });
assert.equal((await POST(request({ ...base, action: 'report', evidence: draftEvidence }))).status, 200);
const input={...base,action:'survey',respondents:s.population,questionnaire:s.questionnaire};upstream({responses:s.responses});assert.equal((await POST(request(input))).status,200);
upstream({responses:[s.responses[0],s.responses[0]]});assert.equal((await POST(request(input))).status,502);
upstream({responses:[s.responses[0],{respondentId:91,answers:{q1:'invalid-option'}}]});assert.equal((await POST(request(input))).status,502);
upstream({answer:''});assert.equal((await POST(request({...base,action:'interview',respondent:s.population[0],interviewQuestion:'Почему?',history:[],survey:[]}))).status,502);
assert.equal((await POST(request({...base,action:'report',evidence:{interviews:[]}}))).status,400);
global.fetch=realFetch;
if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey;
const provider = load(root + '/app/lib/aiProvider.ts');
const originalProvider = process.env.AI_PROVIDER;
const originalXAIKey = process.env.XAI_API_KEY;
const originalXAIModel = process.env.XAI_MODEL;
process.env.AI_PROVIDER = 'xai';
process.env.XAI_API_KEY = 'test-only-key';
process.env.XAI_MODEL = 'grok-4.7';
let requestConfig;
global.fetch = async (url, options) => {
  requestConfig = { url, options };
  return Response.json({ choices: [{ message: { content: 'ok' } }] });
};
await provider.aiFetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', body: JSON.stringify({ model: 'old-groq-model', max_completion_tokens: 500, response_format: { type: 'json_object' }, messages: [] }) });
assert.equal(requestConfig.url, 'https://api.x.ai/v1/chat/completions');
assert.equal(requestConfig.options.headers.get('Authorization'), 'Bearer test-only-key');
assert.equal(JSON.parse(requestConfig.options.body).model, 'grok-4.7');
assert.equal(JSON.parse(requestConfig.options.body).max_tokens, 500);
assert.equal(JSON.parse(requestConfig.options.body).max_completion_tokens, undefined);
assert.equal(provider.getAIModel('old-groq-model'), 'grok-4.7');
global.fetch = async () => Response.json({ error: 'Your team has no credits or licenses' }, { status: 403 });
await assert.rejects(() => provider.aiFetch('', { body: '{}' }), /нет кредитов/);
global.fetch = async () => Response.json({ error: 'invalid key' }, { status: 401 });
await assert.rejects(() => provider.aiFetch('', { body: '{}' }), /отклонил API-ключ/);
const originalRouterKey = process.env.OPENROUTER_API_KEY;
const originalRouterModel = process.env.OPENROUTER_MODEL;
process.env.AI_PROVIDER = 'openrouter';
process.env.OPENROUTER_API_KEY = 'test-only-router-key';
delete process.env.OPENROUTER_MODEL;
global.fetch = async (url, options) => {
  requestConfig = { url, options };
  return Response.json({ choices: [{ message: { content: 'ok' } }] });
};
await provider.aiFetch('', { body: JSON.stringify({ model: 'paid-model', models: ['paid-fallback'], max_completion_tokens: 4500, response_format: { type: 'json_object' }, messages: [] }) });
assert.equal(requestConfig.url, 'https://openrouter.ai/api/v1/chat/completions');
assert.equal(requestConfig.options.headers.get('Authorization'), 'Bearer test-only-router-key');
const routerPayload = JSON.parse(requestConfig.options.body);
assert.equal(routerPayload.model, 'nvidia/nemotron-3-super-120b-a12b:free');
assert.equal(routerPayload.max_tokens, 4500);
assert.equal(routerPayload.models, undefined);
assert.deepEqual(routerPayload.provider.max_price, { prompt: 0, completion: 0, request: 0 });
assert.equal(routerPayload.provider.require_parameters, true);
process.env.OPENROUTER_MODEL = 'paid-model';
await assert.rejects(() => provider.aiFetch('', { body: '{}' }), /только бесплатные/);
delete process.env.OPENROUTER_MODEL;
for (const [status, expected] of [[401, /отклонил/], [402, /отключена/], [429, /бесплатный лимит/], [503, /недоступна/]]) {
  global.fetch = async () => Response.json({ error: { message: 'private upstream details' } }, { status });
  const response = await provider.aiFetch('', { body: '{}' });
  assert.equal(response.status, status);
  assert.match((await response.json()).error.message, expected);
}
delete process.env.OPENROUTER_API_KEY;
await assert.rejects(() => provider.aiFetch('', { body: '{}' }), /Не настроен серверный ключ/);
for (const [key, value] of Object.entries({ OPENROUTER_API_KEY: originalRouterKey, OPENROUTER_MODEL: originalRouterModel })) {
  if (value === undefined) delete process.env[key]; else process.env[key] = value;
}
global.fetch = realFetch;
for (const [key, value] of Object.entries({ AI_PROVIDER: originalProvider, XAI_API_KEY: originalXAIKey, XAI_MODEL: originalXAIModel })) {
  if (value === undefined) delete process.env[key]; else process.env[key] = value;
}
global.localStorage = undefined;
});
