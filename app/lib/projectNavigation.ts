import { createStudy, readStudies, saveStudy, type Study } from './study';
const LEGACY_KEYS = ['research_topic', 'research_question', 'research_gender', 'research_age', 'research_sample_size', 'synthetic_population', 'latest_ai_research_report'];
export function snapshotActiveProject() {
  let id = localStorage.getItem('research_id');
  if (!id && localStorage.getItem('research_topic') && localStorage.getItem('synthetic_population')) {
    const population = JSON.parse(localStorage.getItem('synthetic_population')!);
    if (Array.isArray(population) && population.length) {
      const migrated = { ...createStudy('quantitative', localStorage.getItem('research_topic')!, localStorage.getItem('research_question') || 'Исследовательский вопрос не указан'), population };
      saveStudy(migrated); id = migrated.researchId; localStorage.setItem('research_id', id); localStorage.setItem('research_type', 'quantitative');
    }
  }
  const project = readStudies().find(p => p.researchId === id && p.type === 'quantitative');
  if (!project || project.workflow === 'survey') return;
  const legacy = Object.fromEntries(LEGACY_KEYS.flatMap(k => { const v = localStorage.getItem(k); return v === null ? [] : [[k, v]]; }));
  const population = legacy.synthetic_population ? JSON.parse(legacy.synthetic_population) : project.population;
  saveStudy({ ...project, population, legacy });
}
export function activateProject(project: Study) {
  snapshotActiveProject();
  if (project.type !== 'quantitative' || project.workflow === 'survey') return `/study?id=${project.researchId}`;
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  for (const [key, value] of Object.entries(project.legacy ?? {})) if (LEGACY_KEYS.includes(key)) localStorage.setItem(key, value);
  localStorage.setItem('research_id', project.researchId);
  localStorage.setItem('research_type', project.type);
  localStorage.setItem('research_topic', project.topic);
  localStorage.setItem('research_question', project.question);
  localStorage.setItem('synthetic_population', JSON.stringify(project.population));
  return project.population.length ? '/map' : '/generation';
}
export function beginNewQuantitative() {
  snapshotActiveProject();
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  localStorage.removeItem('research_id');
  localStorage.removeItem('research_type');
}
