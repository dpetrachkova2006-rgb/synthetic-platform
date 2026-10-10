import { estimateTokens } from './researchEconomy';
import { readStudies, saveStudy } from './study';
/** Keep usage records for legacy projects without a hidden per-project cutoff. */
export async function budgetedFetch(url: string, options: RequestInit): Promise<Response> {
  const id=localStorage.getItem('research_id');
  const project=readStudies().find(p=>p.researchId===id&&p.type==='quantitative');
  if(!project) return fetch(url,options);
  const input=JSON.parse(String(options.body || '{}'));
  const outputLimit=url.includes('generate-report')?9000:6000;
  const reserved=estimateTokens(input)+outputLimit;
  const usage=project.usage??{requests:0,tokens:0};
  saveStudy({...project,usage:{requests:usage.requests+1,tokens:usage.tokens+reserved,estimated:true}});
  const response=await fetch(url,options);
  if(response.ok){
    const data=await response.clone().json();
    const latest=readStudies().find(p=>p.researchId===id)!;
    const actual=typeof data.usage?.tokens==='number'?data.usage.tokens:estimateTokens(input)+estimateTokens(data)+512;
    saveStudy({...latest,usage:{requests:latest.usage!.requests,tokens:latest.usage!.tokens-reserved+actual,estimated:!data.usage?.tokens||!!usage.estimated}});
  }
  return response;
}
