// Run manually; preserve the verified snapshot on missing values or network failure.
import fs from 'node:fs/promises';
const year=2024, ids=['SP.POP.TOTL.MA.IN','SP.POP.TOTL.FE.IN'];
for(let min=20;min<=75;min+=5)for(const sex of ['MA','FE'])ids.push(`SP.POP.${min}${min+4}.${sex}.5Y`);
const rows=[];
for(const id of ids){const url=`https://api.worldbank.org/v2/country/RUS/indicator/${id}?format=json&date=${year}`;const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error(`World Bank ${response.status}: ${id}`);const data=await response.json();const row=data?.[1]?.find(r=>r.date===String(year)&&r.countryiso3code==='RUS'&&typeof r.value==='number'&&r.value>=0);if(!row)throw Error(`Missing ${id}; snapshot not changed`);rows.push({id,url,value:row.value,label:row.indicator.value,updated:data[0].lastupdated});}
if(new Set(rows.map(r=>r.updated)).size!==1)throw Error('Inconsistent versions; snapshot not changed');
rows.sort((a,b)=>a.id.localeCompare(b.id));
const file=new URL('../app/data/worldbank-rus-2024.json',import.meta.url);
await fs.writeFile(new URL('../app/data/worldbank-rus-2024.json.tmp',import.meta.url),JSON.stringify({retrievedAt:new Date().toISOString(),year,country:'RUS',rows},null,2));
await fs.rename(new URL('../app/data/worldbank-rus-2024.json.tmp',import.meta.url),file);console.log(`Updated ${rows.length} verified indicators for RUS ${year}`);
