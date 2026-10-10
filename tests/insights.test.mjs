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
const study=load(root+'/app/lib/study.ts'),analysis=load(root+'/app/lib/reportInsights.ts'),api=load(root+'/app/api/study/route.ts');
const project={...study.createStudy('quantitative','Транспорт','Что мешает поездкам?'),workflow:'survey',population:[{id:1,age:25,gender:'женщина'},{id:2,age:65,gender:'мужчина'},{id:3,age:28,gender:'женщина'}],questionnaire:[{id:'q',text:'Удобен автобус?',options:['Да','Нет']},{id:'reason',text:'Что важнее?',options:['Время','Цена']}],responses:[{respondentId:1,answers:{q:'Да',reason:'Время'}},{respondentId:2,answers:{q:'Нет',reason:'Цена'}},{respondentId:3,answers:{q:'Да',reason:'Время'}}]};
const insight={title:'Приоритет зависит от опыта поездок',finding:'Выбор времени совпадает с положительной оценкой автобуса.',explanation:'Это связь внутри смоделированной группы; причины ещё не изучены.',nextStep:'Уточнить, что важнее при пересадке: стоимость или длительность.',factIds:['cross:q:reason:0'],quoteIds:[]};
test('comparisons use actual answers, conditional bases and preserve stale-analysis isolation',()=>{
 const fact=analysis.comparisonFacts(project).find(f=>f.id===insight.factIds[0]);assert.deepEqual(fact.rows,[{label:'Да',count:2,total:2},{label:'Нет',count:0,total:1}]);
 const saved={...project,report:'Анализ',analysisSignature:analysis.analysisSignature(project,[]),analysisInsights:[{...insight,facts:[fact],quotes:[]}]};assert.equal(analysis.savedInsights(saved,[]).length,1);
 assert.equal(analysis.savedInsights({...saved,topic:'Другая тема'},[]).length,0);
 assert.equal(analysis.savedInsights({...saved,responses:saved.responses.slice(0,1)},[]).length,0);
 assert.equal(analysis.savedInsights({...saved,report:''},[]).length,0);
 assert.deepEqual(analysis.comparisonFacts({...project,type:'qualitative'}),[]);
});
test('analysis rejects fake references, statistics, English prose and empty unsupported findings',async()=>{
 const original={fetch:global.fetch,provider:process.env.AI_PROVIDER,key:process.env.GROQ_API_KEY};process.env.AI_PROVIDER='groq';process.env.GROQ_API_KEY='test-only';let sent;
 const body={researchId:project.researchId,topic:project.topic,question:project.question,action:'report',evidence:study.buildReportEvidence(project)};
 const request=()=>new Request('http://localhost/api/study',{method:'POST',body:JSON.stringify(body)});
 const respond=i=>global.fetch=async(_,options)=>{sent=JSON.parse(options.body);return Response.json({choices:[{message:{content:JSON.stringify({report:'99% выдумка',themes:[],insights:i})}}]});};
 try{
  respond([insight]);const r=await api.POST(request());assert.equal(r.status,200);const data=await r.json();assert.doesNotMatch(data.report,/99%/);assert.equal(data.insights[0].facts[0].rows[0].count,2);assert.equal(JSON.parse(sent.messages[1].content).evidence.facts.some(f=>f.id==='survey:q'),true);
  for(const i of [{...insight,factIds:['fake']},{...insight,quoteIds:[999]},{...insight,finding:'Все довольны: 99%'},{...insight,explanation:'This is unsupported.'},{...insight,factIds:[]}]){respond([i]);assert.equal((await api.POST(request())).status,502);}
  respond([]);assert.equal((await api.POST(request())).status,502);
 }finally{global.fetch=original.fetch;for(const [k,v] of [['AI_PROVIDER',original.provider],['GROQ_API_KEY',original.key]])if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
