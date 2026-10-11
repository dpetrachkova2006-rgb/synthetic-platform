import PDFDocument from 'pdfkit';
import path from 'node:path';
import { guideQuestions, TYPE_LABELS, type Study } from './study';
import { makeReportData, profileFrequencies, quoteExcerpt, reportNarrative } from './reportData';
import { reportCommentary } from './reportCommentary';
import { reportBlocker } from './studyFlow';
import { ageDistribution, extendedReportSections, mixedEvidence, percentText, REPORT_COLORS, themeEvidence } from './reportVisuals';
export { reportBlocker } from './studyFlow';

const BLUE = '#489de0', INK = '#172333', MUTED = '#6c7b88', PALE = '#f2f7fb';
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
  function label(text:string,nextText?:string){doc.font('regular').fontSize(10);const reserve=nextText?Math.min(bottom-120,doc.heightOfString(nextText,{width,lineGap:4})+32):110;doc.font('bold').fontSize(11);room(doc.heightOfString(text,{width})+reserve);doc.fillColor(INK).text(text,left,doc.y,{width,lineGap:3});doc.moveDown(.6);}
  function card(title:string,text:string){doc.font('bold').fontSize(11);const th=doc.heightOfString(title,{width:width-32,lineGap:3});doc.font('regular').fontSize(10);const bh=doc.heightOfString(text,{width:width-32,lineGap:4});const h=th+bh+38;
    if(h>bottom-58){label(title);paragraph(text);return;}room(h+14);const y=doc.y;doc.roundedRect(left,y,width,h,6).fill(PALE);doc.rect(left,y+12,3,h-24).fill(BLUE);doc.font('bold').fontSize(11).fillColor(INK).text(title,left+16,y+15,{width:width-32,lineGap:3});doc.font('regular').fontSize(10).fillColor(MUTED).text(text,left+16,y+21+th,{width:width-32,lineGap:4});doc.y=y+h+14;
  }
  function quote(text:string,caption:string){card(`Участник ${caption}`,`«${text}»`);}
  function chartHeight(rows:{option:string;count:number}[]){doc.font('regular').fontSize(10);return 95+rows.reduce((n,row)=>n+doc.heightOfString(row.option,{width:width-108,lineGap:3})+28,0);}
  function chart(title:string,rows:{option:string;count:number}[],base:number,caption=`База: ${base}. Доли рассчитаны от сохранённых ответов.`){room(Math.min(550,chartHeight(rows)));label(title);paragraph(caption,MUTED);
    for(const [index,row] of rows.entries()){doc.font('regular').fontSize(10);const textH=doc.heightOfString(row.option,{width:width-108,lineGap:3});const h=textH+28;if(doc.y+h>bottom){doc.addPage();label(`${title} — продолжение`);paragraph(caption,MUTED);}const y=doc.y;doc.fillColor(INK).text(row.option,left,y,{width:width-108,lineGap:3});const percent=base?row.count/base*100:0;doc.font('bold').text(`${percent.toLocaleString('ru-RU',{maximumFractionDigits:1})}% · ${row.count}`,left+width-103,y,{width:103,align:'right'});const by=y+textH+8;doc.roundedRect(left,by,width,7,3).fill('#e9edff');if(percent>0)doc.roundedRect(left,by,Math.max(7,width*percent/100),7,3).fill(REPORT_COLORS[index % REPORT_COLORS.length]);doc.y=y+h;}doc.moveDown();
  }
  function donut(rows:{option:string;count:number}[],base:number){
    room(235);const y=doc.y,cx=left+width/2,cy=y+94,r=74;let angle=-Math.PI/2;
    doc.circle(cx,cy,r).lineWidth(28).strokeColor('#edf1f5').stroke();
    rows.forEach((row,i)=>{const fraction=base?row.count/base:0,span=fraction*Math.PI*2;if(span){const steps=Math.max(2,Math.ceil(span*28));doc.moveTo(cx+r*Math.cos(angle),cy+r*Math.sin(angle));for(let step=1;step<=steps;step++){const a=angle+span*step/steps;doc.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));}doc.lineWidth(28).strokeColor(REPORT_COLORS[i%REPORT_COLORS.length]).stroke();if(fraction>=.07){const mid=angle+span/2;doc.font('bold').fontSize(9).fillColor(INK).text(percentText(row.count,base),cx+r*Math.cos(mid)-22,cy+r*Math.sin(mid)-5,{width:44,align:'center'});}angle+=span;}});
    doc.lineWidth(1);doc.font('bold').fontSize(String(base).length>5?22:26).fillColor(INK).text(String(base),cx-45,cy-20,{width:90,align:'center'});doc.font('regular').fontSize(9).fillColor(MUTED).text('ответов',cx-45,cy+18,{width:90,align:'center'});doc.y=y+202;
    paragraph('Цвета соответствуют вариантам ответа на диаграмме ниже.',MUTED);
  }
  function evidenceMap(){
    const themes=themeEvidence(s);if(!themes.length)return;
    label('Карта тем интервью');paragraph('Точка означает наличие проверенной цитаты участника по теме. Пустая ячейка означает отсутствие цитаты в анализе, а не отсутствие мнения. Это карта оснований, а не распространённости тем.',MUTED);
    for(let start=0;start<data.included.length;start+=10){
      const ids=data.included.slice(start,start+10),nameWidth=210,cell=(width-nameWidth)/ids.length;
      function header(){room(80);const y=doc.y;doc.rect(left,y,width,28).fill('#e9edff');doc.font('bold').fontSize(8).fillColor(BLUE).text('Тема / участник',left+10,y+9,{width:nameWidth-20});ids.forEach((id,i)=>doc.text(`№${id}`,left+nameWidth+i*cell,y+9,{width:cell,align:'center'}));doc.y=y+30;}
      header();themes.forEach((theme,index)=>{doc.font('regular').fontSize(9);const h=Math.max(32,doc.heightOfString(theme.title,{width:nameWidth-20,lineGap:3})+18);if(doc.y+h>bottom){doc.addPage();header();}const y=doc.y;doc.rect(left,y,width,h).fill(index%2===0?PALE:'#ffffff');doc.fillColor(INK).text(theme.title,left+10,y+9,{width:nameWidth-20,lineGap:3});ids.forEach((id,i)=>{if(theme.respondentIds.includes(id))doc.circle(left+nameWidth+(i+.5)*cell,y+h/2,4).fill(BLUE);else doc.moveTo(left+nameWidth+(i+.5)*cell-3,y+h/2).lineTo(left+nameWidth+(i+.5)*cell+3,y+h/2).lineWidth(1).strokeColor('#b8c0cd').stroke();});doc.y=y+h+2;});doc.moveDown();
    }
  }
  // Светлая обложка и паспорт исследовательской публикации.
  doc.roundedRect(left,58,width,390,22).fill('#e1f0fc');
  doc.font('bold').fontSize(9).fillColor('#397cac').text('ПЛАТФОРМА СИНТЕТИЧЕСКИХ РЕСПОНДЕНТОВ',left+24,83,{width:width-48});
  doc.font('regular').fontSize(10).fillColor(MUTED).text(TYPE_LABELS[s.type],left+24,123,{width:width-48});
  const coverTitle=quoteExcerpt(s.topic,180),coverQuestion=quoteExcerpt(s.question,240);let coverSize=27;
  function coverTextHeight(){doc.font('bold').fontSize(coverSize);const titleH=doc.heightOfString(coverTitle,{width:width-48,lineGap:3});doc.font('regular').fontSize(11);return titleH+doc.heightOfString(coverQuestion,{width:width-48,lineGap:4})+24;}
  while(coverSize>18&&coverTextHeight()>235)coverSize--;
  doc.font('bold').fontSize(coverSize).fillColor(INK).text(coverTitle,left+24,155,{width:width-48,lineGap:3});
  doc.moveDown(.7);doc.font('regular').fontSize(11).fillColor(INK).text(coverQuestion,left+24,doc.y,{width:width-48,lineGap:4});
  doc.font('regular').fontSize(9).fillColor(MUTED).text('Синтетические данные. Люди не опрашивались.',left+24,414,{width:width-48});
  doc.y=478;
  const method=s.type==='quantitative'?'Моделирование ответов на анкету':s.type==='qualitative'?'Моделирование глубинных интервью':'Анкета и глубинные интервью с теми же участниками';
  label('Выборка');paragraph(`${s.population.length} профилей.${s.type!=='qualitative'?` Сохранено ${s.responses.length} анкет.`:''}${s.type!=='quantitative'?` Завершено ${data.included.length} интервью.`:''}`);
  label('Метод');paragraph(method);
  label('Дата');paragraph(new Date(s.createdAt).toLocaleDateString('ru-RU'));
  paragraph(`В отчёте: главные выводы, диаграммы с пояснениями, аналитический комментарий, метод и источники.${data.quotes.length?' Полные ответы приведены в приложении.':''}`,MUTED);
  heading('01','Главные результаты',true);
  if(data.preliminary)card('Предварительный материал',`Включено ${data.included.length} из ${s.selectedIds.length} выбранных участников. Незавершённые интервью исключены.`);
  if(data.analysisInsights.length)for(const insight of data.analysisInsights){label(insight.title,insight.finding);paragraph(insight.finding);for(const f of insight.facts)paragraph(`${f.title}: ${f.rows.map(r=>`${r.label} — ${r.count} из ${r.total}`).join('; ')}.`,MUTED);for(const q of insight.quotes)quote(quoteExcerpt(q.quote,300),`Участник №${q.respondentId}`);}
  else if(data.survey.length)for(const insight of data.insights.slice(0,3))card(insight.title,insight.text);
  else if(data.themes.length)for(const theme of data.themes.slice(0,3))card(theme.title,theme.interpretation);
  else for(const insight of data.insights)card(insight.title,insight.text);
  paragraph('Сводка помогает увидеть основные результаты; ниже приведены их распределения, основания и развёрнутые пояснения.',MUTED);
  heading('02','Визуальные результаты',false,data.survey.length?610:240);
  for(const q of data.survey){const base=q.distribution.reduce((n,r)=>n+r.count,0);room(Math.min(620,255+chartHeight(q.distribution)));label(q.text);donut(q.distribution,base);chart('Варианты ответа',q.distribution,base);const insight=data.insights.find(i=>i.title===q.text);if(insight)paragraph(insight.text);}
  if(s.type==='quantitative'&&!data.survey.length){paragraph('Позиции профилей описывают гипотезу при генерации группы и не являются результатами анкеты.',MUTED);chart('Позиции профилей',[...new Set(s.population.map(p=>p.opinion))].map(option=>({option,count:s.population.filter(p=>p.opinion===option).length})),s.population.length,`База: ${s.population.length} профилей. Это гипотеза генерации.`);}
  evidenceMap();
  for(const theme of data.themes){label(theme.title);paragraph(theme.interpretation);for(const q of theme.quotes)quote(quoteExcerpt(q.quote),`№${q.respondentId} · ${q.question}`);}
  if(!data.themes.length)for(const q of data.quotes.slice(0,4))quote(quoteExcerpt(q.quote),`№${q.respondentId} · ${q.question}`);
  if(s.type==='mixed'&&data.themes.length){heading('03','Опрос и интервью: связь этапов',false,340);paragraph('Сопоставление строится по одним и тем же участникам. Для каждого ответа анкеты показаны темы, подтверждённые цитатами интервью этой группы.',MUTED);for(const q of data.survey){label(q.text);for(const group of mixedEvidence(s,q.id))card(`Ответ «${group.option}»: темы интервью`,`${group.respondentIds.map(id=>`№${id}`).join(', ')}\n${group.themes.length?group.themes.map(t=>`${t.title} (${t.respondentIds.map(id=>`№${id}`).join(', ')})`).join('\n'):'Темы для этих участников ещё не выделены.'}`);}}
  const prose=extendedReportSections(s);doc.font('regular').fontSize(10);const firstHeight=doc.heightOfString(prose[0]?.paragraphs[0]??'',{width,lineGap:4});
  heading('04','Развёрнутые пояснения',false,Math.min(620,firstHeight+150));
  const commentary=reportCommentary(s);if(s.analysisCommentary&&commentary[0]?.title==='Общая картина')for(const section of commentary){label(section.title,section.paragraphs[0]);for(const text of section.paragraphs)paragraph(text);}
  for(const section of prose){label(section.title,section.paragraphs[0]);for(const text of section.paragraphs)paragraph(text);}
  if(s.type==='quantitative'&&s.workflow!=='survey'&&s.report){label('Сохранённый аналитический обзор');for(const block of reportNarrative(s).replace(/\*\*/g,'').split(/\n\s*\n/))paragraph(block.replace(/^#+\s*/gm,''));}
  heading('05','Выборка и метод');
  paragraph(`Исследование посвящено теме «${s.topic}». Его главный вопрос: ${s.question} Для моделирования создано ${s.population.length} социально-демографических профилей.${data.survey.length?` Сохранено ${s.responses.length} анкет по ${data.survey.length} вопросам.`:''}${s.type!=='quantitative'?` В качественный анализ включено ${data.included.length} завершённых интервью из ${s.selectedIds.length} выбранных участников.`:''} Ответы сформированы индивидуально с учётом профиля, а их связь с участником сохранена на всех этапах.`);
  if(s.selectionReason)paragraph(`Принцип отбора участников: ${s.selectionReason}`);
  chart('Возраст исходной группы',ageDistribution(s),s.population.length,`База: ${s.population.length} профилей исходной группы.`);
  chart('Пол исходной группы',profileFrequencies(s,'gender').map(([option,count])=>({option,count})),s.population.length,`База: ${s.population.length} профилей исходной группы.`);
  paragraph('Диаграммы состава группы показывают характеристики исходных профилей, а не мнения участников. Программное моделирование не устанавливает репрезентативность. Число профилей не равно числу независимых наблюдений людей.',MUTED);
  label('Исследовательские вопросы');paragraph([...s.questionnaire.map(q=>`Анкета: ${q.text}`),...guideQuestions(s.guide).map(q=>`Интервью: ${q}`)].join('\n'));
  heading('06','Источники и проверка выводов',false,210);
  if(!s.sources?.length)paragraph('Проверенные статистические распределения для этого проекта не применялись. Характеристики и позиции профилей смоделированы. При подготовке реального исследования необходимо отдельно проверить статистическую основу и соответствие выборки целевой аудитории.');
  for(const source of s.sources??[]){label(source.title);paragraph(`${source.organization} · ${source.date} · ${source.geography}. Совокупность: ${source.population}. Версия: ${source.version}. Получено: ${source.retrievedAt}. Применение: ${source.application}`);doc.font('bold').fontSize(9).fillColor(BLUE).text('Открыть первоисточник',left,doc.y,{width,link:source.url.startsWith('https://')?source.url:undefined});doc.moveDown(1.2);}
  paragraph('Частоты и проценты вычислены по сохранённым анкетам, а цитаты воспроизводятся дословно. Интерпретации тем опираются на проверенные фрагменты ответов. Модель может воспроизводить стереотипы и допускать ошибки; синтетические данные не заменяют эмпирическое исследование и не подтверждают причинные связи.');
  if(data.preliminary)paragraph('Часть интервью не завершена. Такой отчёт представляет предварительный материал, а причины отсутствия ответов могут влиять на состав включённой группы.');
  if(data.quotes.length)heading('ПРИЛОЖЕНИЕ','Полные сохранённые ответы',true);
  for(const q of data.quotes){const person=s.population.find(p=>p.id===q.respondentId);quote(q.quote,`№${q.respondentId} · ${person?.name??'Участник'} · ${person?.age??'—'} лет · ${person?.city??'Город не указан'}\n${q.question}`);}
  const range=doc.bufferedPageRange();
  for(let i=0;i<range.count;i++){doc.switchToPage(i);doc.page.margins.bottom=0;doc.moveTo(left,doc.page.height-48).lineTo(left+width,doc.page.height-48).strokeColor('#e1e6f0').stroke();doc.font('regular').fontSize(8).fillColor(MUTED).text('SYNTHETIC PLATFORM · Смоделированные данные',left,doc.page.height-34,{width:width-70,lineBreak:false});doc.text(`${i+1} / ${range.count}`,doc.page.width-100,doc.page.height-34,{width:48,align:'right',lineBreak:false});}
  doc.end();return ready;
}
