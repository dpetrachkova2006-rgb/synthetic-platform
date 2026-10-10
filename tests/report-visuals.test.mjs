import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url), cache=new Map();
function load(file){file=path.resolve(file);if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));if(cache.has(file))return cache.get(file);const m={exports:{}};cache.set(file,m.exports);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name.endsWith('.json')?name:name+'.ts')):require(name),m,m.exports);return m.exports;}
const visual=load('app/lib/reportVisuals.ts');
const s={version:1,type:'mixed',workflow:'survey',researchId:'test',topic:'Транспорт',question:'Что важно?',createdAt:'2026-10-11',stage:3,population:[{id:7,age:29,gender:'женщина'},{id:91,age:30,gender:'мужчина'},{id:101,age:59,gender:'женщина'},{id:200,age:60,gender:'мужчина'}],questionnaire:[{id:'q',text:'Удобно?',options:['Да','Нет','Не знаю']}],responses:[{respondentId:7,answers:{q:'Да'}},{respondentId:91,answers:{q:'Нет'}},{respondentId:101,answers:{q:'Да'}},{respondentId:200,answers:{q:'Нет'}}],selectedIds:[7,91],selectionReason:'Разные ответы',guide:'Почему?',interviews:{7:[{question:'Почему?',answer:'Близкая остановка. Вечером долго ждать.'}],91:[{question:'Почему?',answer:'Долгая дорога.'}]},report:'',themes:[{title:'Ожидание',interpretation:'Важно время ожидания.',quotes:[{respondentId:7,question:'Почему?',quote:'Вечером долго ждать.'},{respondentId:7,question:'Почему?',quote:'Близкая остановка.'}]}]};
test('visual report links count participants once and never infer themes from absent quotes',()=>{
  assert.deepEqual(visual.themeEvidence(s)[0].respondentIds,[7]);
  assert.deepEqual(visual.mixedEvidence(s,'q').map(g=>({option:g.option,ids:g.respondentIds,themes:g.themes})),[{option:'Да',ids:[7],themes:[{title:'Ожидание',respondentIds:[7]}]},{option:'Нет',ids:[91],themes:[]}]);
  assert.equal(visual.themeEvidence({...s,themes:[{...s.themes[0],quotes:[{respondentId:91,question:'Почему?',quote:'Поддельная цитата'}]}]}).length,0);
  const partial={...s,type:'qualitative',reportRespondentIds:[7],interviews:{7:s.interviews[7]}};
  assert.deepEqual(visual.themeEvidence(partial)[0].respondentIds,[7]);
});
test('chart bases, age boundaries and continuous PDF prose use only saved evidence',()=>{
  assert.deepEqual(visual.ageDistribution(s).map(r=>r.count),[1,1,1,1]);
  const groups=visual.surveyGroups(s,'q');assert.equal(groups.reduce((n,g)=>n+g.total,0),4);assert.equal(groups[0].rows[0].count,2);
  assert.equal(visual.percentText(0,0),'0%');assert.equal(visual.percentText(1,4),'25%');
  const text=visual.extendedReportSections(s).flatMap(section=>section.paragraphs).join('\n');
  assert.match(text,/нет единственного лидирующего варианта/);assert.match(text,/по 2 ответов \(50%\)/);assert.match(text,/«Не знаю» — 0/);assert.match(text,/№7/);assert.match(text,/не отсутствие такого мнения/);
  assert.equal(visual.mixedEvidence({...s,type:'quantitative'},'q').length,0);
  assert.equal(visual.surveyGroups(s,'unknown').length,0);
});
