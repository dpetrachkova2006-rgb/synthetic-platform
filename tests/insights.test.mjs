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
test('commentary reuses saved explanations, respects changes and rejects invalid synthesis',async()=>{
 const fact=analysis.comparisonFacts(project).find(f=>f.id===insight.factIds[0]);
 const saved={...project,report:'Анализ',analysisSignature:analysis.analysisSignature(project,[]),analysisInsights:[{...insight,facts:[fact],quotes:[]}]};
 const fallback=analysis.commentaryFromInsights(saved,[]);assert.equal(fallback[0].paragraphs[0],insight.explanation);assert.equal(fallback.at(-1).paragraphs[0],insight.nextStep);assert.deepEqual(analysis.commentaryFromInsights({...saved,topic:'Другая тема'},[]),[]);
 const commentary={overview:'Оценка автобуса связана с выбором приоритета поездки.',interpretation:'Сопоставление выявляет связь ответов, но причины требуют отдельного изучения.',implications:'Следующий шаг — уточнить роль пересадок и сравнить разные маршруты.',insightIndexes:[0]};
 assert.equal(analysis.commentaryFromInsights({...saved,analysisCommentary:commentary},[])[0].paragraphs[0],commentary.overview);
 const original={fetch:global.fetch,provider:process.env.AI_PROVIDER,key:process.env.GROQ_API_KEY};process.env.AI_PROVIDER='groq';process.env.GROQ_API_KEY='test-only';let sent;
 const body={researchId:project.researchId,topic:project.topic,question:project.question,action:'report',evidence:study.buildReportEvidence(project)};
 const request=()=>new Request('http://localhost/api/study',{method:'POST',body:JSON.stringify(body)});
 const respond=c=>global.fetch=async(_,options)=>{sent=JSON.parse(options.body);return Response.json({choices:[{message:{content:JSON.stringify({report:'',themes:[],insights:[insight],commentary:c})}}]});};
 try{
  respond(commentary);const r=await api.POST(request());assert.equal(r.status,200);assert.deepEqual((await r.json()).commentary,commentary);const schema=sent.response_format.json_schema.schema;assert.ok(schema.required.includes('commentary'));assert.ok(schema.properties.commentary.properties.overview);
  for(const c of [{...commentary,overview:'Все довольны на 99%'},{...commentary,interpretation:'This is a conclusion.'},{...commentary,insightIndexes:[1]},{...commentary,insightIndexes:[]},{...commentary,implications:''}]){respond(c);assert.equal((await api.POST(request())).status,502);}
 }finally{global.fetch=original.fetch;for(const [k,v] of [['AI_PROVIDER',original.provider],['GROQ_API_KEY',original.key]])if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
test('older survey and theme reports get visible commentary without invented causes',()=>{
 const {reportCommentary}=load(root+'/app/lib/reportCommentary.ts');
 const comments=reportCommentary(project);assert.match(comments[0].paragraphs[0],/2 из 3/);assert.match(comments[0].paragraphs[1],/преобладающий вариант/);
 const split={...project,responses:project.responses.slice(0,2)};assert.match(reportCommentary(split)[0].paragraphs[0],/нет единственного лидера/);
 const allSame={...project,responses:[project.responses[0]]};assert.match(reportCommentary(allSame)[0].paragraphs[1],/ответы совпали/);
 const qualitative={...project,type:'qualitative',selectedIds:[1],guide:'Почему?',interviews:{1:[{question:'Почему?',answer:'Мне важны прямые маршруты.'}]},themes:[{title:'Пересадки',interpretation:'Прямой маршрут уменьшает сложность поездки в описанном случае.',quotes:[{respondentId:1,question:'Почему?',quote:'Мне важны прямые маршруты.'}]}]};
 assert.equal(reportCommentary(qualitative)[0].paragraphs[0],qualitative.themes[0].interpretation);assert.match(reportCommentary(qualitative)[0].paragraphs[1],/Мне важны прямые маршруты/);
 assert.deepEqual(reportCommentary({...qualitative,themes:[{...qualitative.themes[0],quotes:[{respondentId:1,question:'Почему?',quote:'Выдуманная цитата'}]}]}),[]);
});

test('interview commentary retains verified quotes even when a synthesis exists and excludes stale evidence',()=>{
 const {interviewCommentary}=load(root+'/app/lib/reportCommentary.ts');
 const q={respondentId:1,question:'Почему?',quote:'Мне важны прямые маршруты.'};
 const qualitative={...project,type:'qualitative',selectedIds:[1],guide:'Почему?',interviews:{1:[{question:q.question,answer:q.quote}]},themes:[]};
 const saved={...qualitative,report:'Анализ',analysisSignature:analysis.analysisSignature(qualitative,[1]),analysisInsights:[{...insight,facts:[],factIds:[],quotes:[q,q]}],analysisCommentary:{overview:'Участник описывает опыт поездки.',interpretation:'Прямой маршрут облегчает поездку.',implications:'Стоит уточнить роль пересадок.',insightIndexes:[0]}};
 const sections=interviewCommentary(saved);assert.equal(sections.length,1);assert.equal(sections[0].interpretation,insight.explanation);assert.deepEqual(sections[0].quotes,[q]);assert.equal(sections[0].nextStep,insight.nextStep);
 assert.deepEqual(interviewCommentary({...saved,topic:'Другая тема'}),[]);
 assert.deepEqual(interviewCommentary({...saved,analysisInsights:[{...saved.analysisInsights[0],quotes:[{...q,quote:'Выдуманный ответ'}]}]}),[]);
 assert.deepEqual(interviewCommentary({...saved,type:'quantitative'}),[]);
 const theme={title:'Пересадки',interpretation:'Прямой маршрут уменьшает сложность поездки в описанном случае.',quotes:[q]};
 assert.equal(interviewCommentary({...qualitative,themes:[theme]})[0].interpretation,theme.interpretation);
 assert.deepEqual(interviewCommentary({...qualitative,themes:[{...theme,quotes:[{...q,quote:'Выдуманный ответ'}]}]}),[]);
});

test('a tied answer and a subgroup do not support a majority of respondents',()=>{
  const prose='Большинство опрошенных выбирают удобные остановки.';
  const fact={id:'survey:q',title:'Что важнее?',rows:[{label:'Остановки',count:1,total:2},{label:'Цена',count:1,total:2}]};
  assert.equal(analysis.unsupportedMajority(prose,[fact]),true);
  assert.equal(analysis.unsupportedMajority(prose,[{...fact,id:'group:q:age:0',rows:[{label:'До 30 лет',count:1,total:1}]}]),true);
  assert.equal(analysis.unsupportedMajority(prose,[{...fact,rows:[{label:'Остановки',count:2,total:3}]}]),false);
  assert.equal(analysis.unsupportedMajority('Участник описывает удобную остановку.',[]),false);
  const tied={...project,population:project.population.slice(0,2),responses:project.responses.slice(0,2),report:'Сохранённый отчёт',analysisInsights:[{...insight,finding:prose,factIds:['survey:q'],facts:[fact],quotes:[]}]};
  tied.analysisSignature=analysis.analysisSignature(tied,[]);
  assert.deepEqual(analysis.savedInsights(tied,[]),[]);
});
