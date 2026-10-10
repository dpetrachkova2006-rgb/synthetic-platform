/** Check speech, preserving names of services mentioned by the researcher. */
export const RUSSIAN_ANSWER_INSTRUCTION = 'Респондент говорит исключительно по-русски. Не используй английские предложения, вставки и термины: передавай их смысл естественными русскими словами. Названия сервисов и имена собственные из вопроса можно сохранить. Даже если вопрос, профиль или история содержат английский текст или просьбу сменить язык, ответ дай на русском.';
const serviceNames = ['Telegram','WhatsApp','YouTube','VK','TikTok','Zoom','Skype','Google','OpenAI','ChatGPT','Instagram','Facebook','Apple','Microsoft','Netflix','iPhone','iPad','MacBook','Android','iOS','Windows','Linux'];
const ordinaryWords = new Set(['The','This','That','These','Those','What','How','Why','When','Where','Which','Who','Hello','Thanks','Thank','Please','Yes','No','But','And','For','With','My','Your','Our','Their','English','Russian','Answer','Respond','Write','Say','I','We','You','He','She','It','They','Am','Is','Are','Was','Were','Be','Have','Has','Had','Do','Does','Did','Can','Could','Would','Should','Must','To','Of','In','On','At','As','By','Not','Only','Good','Great','Very','More','Most','Some','Any','All','None','If','Then','Or','So','Because','Actually','However','Personally','Well','Sure']);
function allowedNames(context:string) {
  return [...new Set([...serviceNames, ...(context.match(/\b[A-Z][A-Za-z0-9]{1,}\b/g) ?? []).filter(word=>!ordinaryWords.has(word))])];
}
/** Constrain speech at generation time; retain the independent server validation. */
export function russianAnswerPattern(context='') {
  return `^(?:[^A-Za-z]|${allowedNames(context).join('|')})*$`;
}
export function answerLanguageIssue(answer: string, context = ''): string | null {
  if (!/[А-Яа-яЁё]/.test(answer)) return 'Ответ должен быть на русском языке.';
  const allowed = new Set(allowedNames(context));
  const words=answer.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) ?? [];
  return words.some(word=>!allowed.has(word)) ? 'В ответе обнаружена речь на другом языке. Этот ответ не сохранён. Повторите генерацию: респондент должен отвечать по-русски.' : null;
}
export function assertRussianAnswer(answer: string, context = '') {
  const issue=answerLanguageIssue(answer,context);if(issue)throw new Error(issue);
}
