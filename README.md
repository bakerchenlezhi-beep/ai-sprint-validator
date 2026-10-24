# AI Sprint Validator

Pitch a product idea and watch three synthetic users discuss it in turn. Jump in with your own questions, then generate a validation report you can export.

Built with Next.js (App Router), TypeScript, Tailwind v4 and shadcn/ui. See `PLAN.md` for the architecture.

## Setup

```bash
corepack enable
pnpm install
cp .env.example .env.local   # optional: add an API key (see below)
pnpm dev                     # http://localhost:3000
```

## LLM configuration

All LLM access goes through `lib/llm.ts` using the `openai` SDK, so any OpenAI-compatible provider works. Defaults target DeepSeek.

| Variable | Default | Notes |
| --- | --- | --- |
| `LLM_BASE_URL` | `https://api.deepseek.com` | e.g. `https://api.openai.com/v1` |
| `LLM_API_KEY` | _(empty)_ | falls back to `DEEPSEEK_API_KEY` |
| `LLM_MODEL` | `deepseek-chat` | e.g. `gpt-4o-mini` |

**No key = mock mode.** Without a key the app runs the full flow on scripted demo data (the report shows a "Demo data" badge). If a real call fails, personas and the report fall back to demo data with a toast.

## Using it

1. Enter a pitch; three personas are generated and discuss it for two rounds.
2. Use **Stop** or type a question to interject; the personas answer you.
3. If a reply fails, press **Retry** on that message to regenerate just that turn.
4. **Generate report**, then export it as Markdown, JSON, or copy it to the clipboard.

A refresh resumes the session from the last completed turn (stored in `localStorage`). **New pitch** starts over. Dark mode follows your system setting; use the button in the corner to override.

## Scripts

```bash
pnpm dev        # dev server
pnpm build      # production build
pnpm lint       # eslint
npx tsc --noEmit
pnpm test       # Vitest unit tests
```
