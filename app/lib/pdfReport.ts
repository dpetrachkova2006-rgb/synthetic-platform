import PDFDocument from 'pdfkit';
import path from 'node:path';
import { guideQuestions, TYPE_LABELS, type Study } from './study';
import { makeReportData, profileFrequencies, quoteExcerpt } from './reportData';
import { reportBlocker } from './studyFlow';
export { reportBlocker } from './studyFlow';

const BLUE = '#3154ff', INK = '#18202e', MUTED = '#667085', PALE = '#f4f6fc';
export async function generatePDF(s: Study): Promise<Buffer> {
  const blocked = reportBlocker(s); if (blocked) throw new Error(blocked);
  const data = makeReportData(s);
  const doc = new PDFDocument({ size:'A4', margins:{top:58,bottom:64,left:52,right:52}, bufferPages:true, info:{Title:s.topic,Author:'Synthetic Platform',Subject:'Синтетическое исследование'} });
  doc.registerFont('regular',path.join(process.cwd(),'public/fonts/NotoSans-Regular.ttf'));
  doc.registerFont('bold',path.join(process.cwd(),'public/fonts/NotoSans-Bold.ttf'));
  const chunks:Buffer[]=[];
  const ready=new Promise<Buffer>((resolve,reject)=>{doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  const left=52, width=doc.page.width-104, bottom=doc.page.height-72;
  function room(h:number){if(doc.y+h>bottom)doc.addPage();}
  function paragraph(text:string,color=INK){doc.font('regular').fontSize(10);const h=doc.heightOfString(text,{width,lineGap:4});if(h<bottom-58)room(h+12);doc.fillColor(color).text(text,left,doc.y,{width,lineGap:4});doc.moveDown(.7);}
  function heading(number:string,title:string,newPage=false,reserve=170){if(newPage)doc.addPage();room(reserve);doc.font('bold').fontSize(9).fillColor(BLUE).text(`${number} / ИССЛЕДОВАТЕЛЬСКИЙ ОТЧЁТ`,left,doc.y,{width});doc.moveDown(.6);doc.font('bold').fontSize(22).fillColor(INK).text(title,left,doc.y,{width,lineGap:2});doc.moveDown(.65);}
  function label(text:string){doc.font('bold').fontSize(11);room(doc.heightOfString(text,{width})+65);doc.fillColor(INK).text(text,left,doc.y,{width,lineGap:3});doc.moveDown(.6);}
  function card(title:string,text:string){doc.font('bold').fontSize(11);const th=doc.heightOfString(title,{width:width-32,lineGap:3});doc.font('regular').fontSize(10);const bh=doc.heightOfString(text,{width:width-32,lineGap:4});const h=th+bh+38;
    if(h>bottom-58){label(title);paragraph(text);return;}room(h+14);const y=doc.y;doc.roundedRect(left,y,width,h,12).fill(PALE);doc.rect(left,y+12,3,h-24).fill(BLUE);doc.font('bold').fontSize(11).fillColor(INK).text(title,left+16,y+15,{width:width-32,lineGap:3});doc.font('regular').fontSize(10).fillColor(MUTED).text(text,left+16,y+21+th,{width:width-32,lineGap:4});doc.y=y+h+14;
  }
  function quote(text:string,caption:string){card(`Участник ${caption}`,`«${text}»`);}
  function table(rows:[string,string][],caption='Показатель',valueCaption='Количество'){
    const nameWidth=width-150;
    function tableHead(){room(70);const y=doc.y;doc.roundedRect(left,y,width,29,6).fill('#e9edff');doc.font('bold').fontSize(9).fillColor(BLUE).text(caption,left+12,y+8,{width:nameWidth});doc.text(valueCaption,left+width-126,y+8,{width:114,align:'right'});doc.y=y+34;}
    tableHead();rows.forEach(([name,value],i)=>{doc.font('regular').fontSize(9);const h=Math.max(doc.heightOfString(name,{width:nameWidth,lineGap:3}),doc.heightOfString(value,{width:114,lineGap:3}))+18;if(doc.y+h>bottom){doc.addPage();tableHead();}const y=doc.y;if(i%2===0)doc.roundedRect(left,y,width,h,5).fill('#f7f8fb');doc.fillColor(INK).text(name,left+12,y+9,{width:nameWidth,lineGap:3});doc.font('bold').text(value,left+width-126,y+9,{width:114,align:'right',lineGap:3});doc.y=y+h+2;});doc.moveDown();
  }
  function chart(title:string,rows:{option:string;count:number}[],base:number){room(140);label(title);paragraph(`База: ${base}. Доли рассчитаны от сохранённых ответов.`,MUTED);
    for(const row of rows){doc.font('regular').fontSize(10);const textH=doc.heightOfString(row.option,{width:width-108,lineGap:3});const h=textH+28;room(h);const y=doc.y;doc.fillColor(INK).text(row.option,left,y,{width:width-108,lineGap:3});const percent=base?row.count/base*100:0;doc.font('bold').text(`${percent.toLocaleString('ru-RU',{maximumFractionDigits:1})}% · ${row.count}`,left+width-103,y,{width:103,align:'right'});const by=y+textH+8;doc.roundedRect(left,by,width,7,3).fill('#e9edff');if(percent>0)doc.roundedRect(left,by,Math.max(7,width*percent/100),7,3).fill(BLUE);doc.y=y+h;}doc.moveDown();
  }
  // Обложка задаёт ту же иерархию, что и экранный отчёт.
  doc.font('bold').fontSize(27);const titleHeight=doc.heightOfString(s.topic,{width:width-40,lineGap:4});doc.font('regular').fontSize(11);const questionHeight=doc.heightOfString(s.question,{width:width-40,lineGap:4});const coverHeight=Math.min(540,Math.max(290,titleHeight+questionHeight+178));
  doc.roundedRect(left,58,width,coverHeight,18).fill('#172443');
  doc.font('bold').fontSize(9).fillColor('#b9c8ff').text('SYNTHETIC PLATFORM',left+20,80,{width:width-40});
  doc.font('regular').fontSize(10).fillColor('#d9e2ff').text(TYPE_LABELS[s.type],left+20,117,{width:width-40});
  doc.font('bold').fontSize(27).fillColor('#ffffff').text(s.topic,left+20,151,{width:width-40,lineGap:4});
  doc.y+=15;doc.font('regular').fontSize(11).fillColor('#d9e2ff').text(s.question,left+20,doc.y,{width:width-40,lineGap:4});
  doc.font('bold').fontSize(9).fillColor('#b9c8ff').text(data.preliminary?'ПРЕДВАРИТЕЛЬНЫЙ ОТЧЁТ':'ИССЛЕДОВАТЕЛЬСКИЙ ОТЧЁТ',left+20,58+coverHeight-34,{width:width-40});
  doc.y=58+coverHeight+22;
  const metrics=[[String(s.population.length),'Профилей'],[String(s.type==='qualitative'?data.included.length:s.responses.length),s.type==='qualitative'?'Интервью':'Анкет'],[String(s.type==='qualitative'?data.quotes.length:s.type==='quantitative'?(s.workflow==='survey'?data.survey.length:data.quotes.length):data.included.length),s.type==='qualitative'?'Сохранённых ответов':s.type==='quantitative'?(s.workflow==='survey'?'Вопросов в анкете':'Развёрнутых ответов'):'Интервью']] as const;
  room(78);const my=doc.y,mw=(width-20)/3;metrics.forEach(([value,text],i)=>{const x=left+i*(mw+10);doc.roundedRect(x,my,mw,72,10).fill(PALE);doc.font('bold').fontSize(23).fillColor(INK).text(value,x+14,my+10,{width:mw-28});doc.font('regular').fontSize(9).fillColor(MUTED).text(text,x+14,my+44,{width:mw-28});});doc.y=my+92;
  paragraph(`Дата: ${new Date(s.createdAt).toLocaleDateString('ru-RU')}. Ответы смоделированы — люди не опрашивались. Отчёт помогает уточнять гипотезы и готовить реальное исследование.`,MUTED);
  paragraph('В отчёте: краткая сводка → метод и выборка → результаты и цитаты → сравнение групп → выводы и ограничения. Полные ответы приведены в приложении.',MUTED);
  heading('02','Краткая сводка',true);
  if(data.preliminary)card('Предварительный материал',`Включено ${data.included.length} из ${s.selectedIds.length} выбранных участников. Незавершённые интервью исключены.`);
  for(const insight of data.insights)card(insight.title,insight.text);
  paragraph('Числа рассчитаны из сохранённых данных. Наблюдения описывают это моделирование и не являются оценкой мнений населения.',MUTED);
  heading('03','Цель и исследовательские вопросы');
  card('Главный вопрос',s.question);
  for(const q of s.questionnaire)paragraph(`Анкета: ${q.text}`);
  for(const q of guideQuestions(s.guide))paragraph(`Интервью: ${q}`);
  heading('04','Как проводилось моделирование',false,290);
  paragraph('Социально-демографические профили создаются программно. Позиции профилей — модельная гипотеза. Ответы моделируются индивидуально с учётом профиля. Пакетная генерация объединяет запросы, но не тиражирует ответы. Частоты и проценты вычисляются кодом; цитаты воспроизводятся дословно.');
  if(s.type==='mixed')card('Два последовательных этапа','Количественный опрос → отбор участников → интервью. Качественная часть раскрывает отдельные случаи из исходной выборки.');
  if(s.selectionReason)paragraph(`Принцип отбора: ${s.selectionReason}`);
  heading('05','Характеристики выборки',false,210);
  table([['Всего профилей',String(s.population.length)],['Возраст, минимум–максимум',`${Math.min(...s.population.map(p=>p.age))}–${Math.max(...s.population.map(p=>p.age))}`]],'Характеристика','Значение');
  for(const key of ['gender','education','city'] as const){room(95+Math.min(profileFrequencies(s,key).length,4)*36);label(key==='gender'?'Пол':key==='education'?'Образование':'Города');table(profileFrequencies(s,key).map(([name,count])=>[name,String(count)]));}
  heading('06','Источники и их применение',false,280);
  if(!s.sources?.length)paragraph('Проверенные статистические распределения для этого проекта не применялись. Характеристики и позиции профилей смоделированы.');
  for(const source of s.sources??[]){card(source.title,`${source.organization} · ${source.date} · ${source.geography}\nСовокупность: ${source.population}. Версия: ${source.version}. Получено: ${source.retrievedAt}.\nПрименение: ${source.application}`);doc.font('bold').fontSize(9).fillColor(BLUE).text('Открыть первоисточник ↗',left,doc.y,{width,link:source.url.startsWith('https://')?source.url:undefined});doc.moveDown(1.2);}
  heading('07','Результаты и цитаты',true);
  for(const q of data.survey)chart(q.text,q.distribution,q.distribution.reduce((n,r)=>n+r.count,0));
  if(s.type==='quantitative'&&!data.survey.length){paragraph('Следующее распределение показывает позиции, заложенные в профили. Это модельная гипотеза; оно не является распределением ответов анкеты.',MUTED);chart('Позиции профилей',[...new Set(s.population.map(p=>p.opinion))].map(option=>({option,count:s.population.filter(p=>p.opinion===option).length})),s.population.length);}
  for(const theme of data.themes){label(theme.title);paragraph(theme.interpretation);paragraph('Интерпретация модели по приведённым фрагментам.',MUTED);for(const q of theme.quotes)quote(quoteExcerpt(q.quote),`№${q.respondentId} · ${q.question}`);}
  if(!data.themes.length)for(const q of data.quotes.slice(0,4))quote(quoteExcerpt(q.quote),`№${q.respondentId} · ${q.question}`);
  heading('08','Сопоставление групп',true);
  if(data.survey.length){for(const q of data.survey){label(q.text);for(const gender of ['женщина','мужчина']){const ids=new Set(s.population.filter(p=>p.gender===gender).map(p=>p.id));const responses=s.responses.filter(r=>ids.has(r.respondentId)&&q.options.includes(r.answers[q.id]));label(`${gender} · ${responses.length} анкет`);table(q.options.map(o=>[o,`${responses.filter(r=>r.answers[q.id]===o).length} / ${responses.length}`]));}}}
  else paragraph('Количественное сравнение анкет для этого проекта недоступно. Содержание интервью можно сопоставлять по вопросам и профилям, но число упоминаний не показывает распространённость мнения.');
  if(s.type==='mixed'){label('Как интервью дополняют опрос');for(const id of data.included)card(`Участник №${id}`,s.questionnaire.map(q=>`${q.text}: ${s.responses.find(r=>r.respondentId===id)?.answers[q.id]??'Нет ответа'}`).join('\n'));}
  heading('09','Выводы');
  for(const insight of data.insights)paragraph(`${insight.title}. ${insight.text}`);
  paragraph('Полученный материал помогает уточнять формулировки и готовить гипотезы для проверки людьми. Он не подтверждает причинные связи и не заменяет реальное исследование.');
  if(s.report){label('Сохранённый аналитический текст');for(const block of s.report.replace(/\*\*/g,'').split(/\n\s*\n/))paragraph(block.replace(/^#+\s*/gm,''));}
  heading('10','Границы интерпретации');
  card('Как использовать результаты','Респонденты и ответы синтетические. Репрезентативность не установлена. Модель может воспроизводить стереотипы и допускать ошибки. Число профилей не равно числу независимых наблюдений людей. Доверительные интервалы и статистическая значимость не рассчитываются. Для решений о людях нужна проверка реальными данными.');
  if(data.preliminary)paragraph('Часть интервью не завершена; причины отсутствия ответов могут влиять на состав включённой группы.');
  heading('ПРИЛОЖЕНИЕ','Полные сохранённые ответы',true);
  for(const q of data.quotes){const person=s.population.find(p=>p.id===q.respondentId);quote(q.quote,`№${q.respondentId} · ${person?.name??'Участник'} · ${person?.age??'—'} лет · ${person?.city??'Город не указан'}\n${q.question}`);}
  const range=doc.bufferedPageRange();
  for(let i=0;i<range.count;i++){doc.switchToPage(i);doc.page.margins.bottom=0;doc.moveTo(left,doc.page.height-48).lineTo(left+width,doc.page.height-48).strokeColor('#e1e6f0').stroke();doc.font('regular').fontSize(8).fillColor(MUTED).text('SYNTHETIC PLATFORM · Смоделированные данные',left,doc.page.height-34,{width:width-70,lineBreak:false});doc.text(`${i+1} / ${range.count}`,doc.page.width-100,doc.page.height-34,{width:48,align:'right',lineBreak:false});}
  doc.end();return ready;
}
