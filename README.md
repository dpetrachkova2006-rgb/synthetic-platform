This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Hosted generation (Groq / OpenRouter / Netlify)

The current deployment uses server-only Groq configuration:

```dotenv
AI_PROVIDER=groq
GROQ_API_KEY=<your own key>
GROQ_MODEL=openai/gpt-oss-120b
```

Create a key at https://console.groq.com/keys and choose the Free plan. Configure the same values in Netlify and deploy again. Every route uses the configured model, including older routes that previously referenced retired models. Questions, survey answers and interview batches use strict structured outputs on supported models. A schema rejection can trigger one repair request on the same Groq model; independent server validation still rejects foreign speech or invalid data. Report quotations are copied on the server from exact transcript excerpts chosen by reference. Groq interviews normally generate two ordered answers per request, with a smaller output allowance and the full original history. Long contexts use a single-question batch. Saved answers are skipped on resume. The browser respects explicit provider pauses of up to fifteen minutes and never switches to a paid provider. Quotas apply to the whole account, and large studies can still exceed them. Check your actual account limits at https://console.groq.com/settings/limits.

Groq interviews use `openai/gpt-oss-20b` by default. Set `GROQ_INTERVIEW_MODEL=openai/gpt-oss-120b` to retain the larger model. Analysis uses `GROQ_MODEL`, with one attempt on 20B when the larger model returns a daily quota error. Minute limits and oversized requests do not trigger model fallback. Both models use the same account and its applicable quotas. The response records the actual serving model, which is saved in study usage metadata.

### OpenRouter configuration

All generation API routes share `app/lib/aiProvider.ts`. To enable OpenRouter, set **server-only** environment variables locally and in Netlify:

```dotenv
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<your own key>
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
```

Create the key at https://openrouter.ai/settings/keys. Never prefix keys with `NEXT_PUBLIC_` or commit them. Deploy again after setting Netlify variables. The local configuration does not update Netlify automatically.

The adapter accepts only `:free` models (or `openrouter/free`), removes model fallbacks, and caps provider prompt, completion and request pricing at zero. JSON support is required. It returns actionable errors on rejected keys, exhausted limits and unavailable models. It does not retry automatically or switch to a paid model. Groq and xAI remain available through `AI_PROVIDER`.

As checked on 2026-10-09, OpenRouter advertises 50 free requests per day per account. All site visitors share this allowance. One research project can use many requests. Availability and limits can change; a free endpoint is not a guarantee of unrestricted topics. NVIDIA's free endpoint asks users not to upload personal or confidential data; this project should send synthetic profiles only.

Validation: `npm run test:study`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Provider tests mock completions; successful live generation requires a valid OpenRouter key.

### Визуальный отчёт

На сайте результаты представлены краткими карточками, кольцевой диаграммой и распределениями по выбранному вопросу, сравнением групп, картой проверенных цитат и связью анкеты с интервью. Подробности раскрываются по запросу. Карта тем показывает наличие цитаты, а не долю участников с определённым мнением. Возраст и пол описывают исходную группу.

PDF использует те же сохранённые данные, диаграммы и цитаты, но добавляет связные пояснения к каждому результату, описание связи этапов, метода и источников. Полные ответы сохраняются в приложении. Визуализации и расширенный текст PDF не требуют дополнительных запросов к модели. Старые проекты используют новую подачу без изменения сохранённых ответов.
