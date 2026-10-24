# Context

Greenfield repo (`package.json` only). Goal: plan the "AI Sprint Validator & Synthetic User Simulator" — Next.js App Router + TypeScript + Tailwind + shadcn/ui. A builder submits a pitch; 3 synthetic personas discuss it in turn; the user can interject; a final report is produced. The deliverable of this step is a `PLAN.md` at the repo root (no app code). **On approval, the content below is written verbatim to `/Users/chenyuezhi/Documents/Coding/my-first-vibe-app/PLAN.md`**, then we stop and wait for explicit go-ahead before any implementation.

Assumptions (flag if wrong):
- **Package manager: pnpm** (all commands below use `pnpm`; commit `pnpm-lock.yaml`).
- **Provider-agnostic LLM layer** using the standard `openai` SDK. Development and default runtime use **DeepSeek** (cost efficiency during iteration). Swapping to OpenAI, Anthropic (via its OpenAI-compatible endpoint) or another provider only requires changing env vars or editing `lib/llm.ts` in one place.
- No DB/auth (sessions live in client memory + optional localStorage); single-user local tool.

---

# PLAN.md content

## 1. Architecture & Folder Structure

```
app/
  layout.tsx                 # fonts, theme, <Toaster/>
  page.tsx                   # landing: PitchForm (server component shell)
  simulate/page.tsx          # 'use client' entry: wraps <SimulationProvider> around PersonaPanel, ChatStream, SummaryPanel
  api/
    personas/route.ts        # POST pitch -> Persona[3]   (LLM or mock)
    simulate/route.ts        # POST -> SSE stream of turn events
    report/route.ts          # POST transcript -> SimulationReport
components/
  ui/                        # shadcn primitives (button, card, textarea, badge, tabs, skeleton, scroll-area)
  pitch/PitchForm.tsx        # title, description, target audience, stage; zod validation
  personas/PersonaCard.tsx   # avatar, archetype, goals, objections, speaking/“active” indicator
  personas/PersonaPanel.tsx  # row of 3 cards
  chat/ChatStream.tsx        # scrollable transcript, auto-scroll, typing cursor on streaming msg
  chat/ChatMessageBubble.tsx # persona / user / system variants
  chat/InterjectionInput.tsx # human-in-the-loop composer
  summary/SummaryPanel.tsx   # verdict, scores, themes, risks, next steps
  summary/ExportMenu.tsx     # Markdown / JSON / copy
  simulation/SimulationProvider.tsx  # context + reducer
  simulation/useSimulation.ts        # hook: start, interject, stop, status
lib/
  llm.ts                     # ONLY file that touches the `openai` SDK: client init, runLLMCompletion, streaming, JSON mode
  prompts.ts                 # persona-generation, turn, report prompt builders (provider-neutral messages)
  sim/orchestrator.ts        # turn-taking loop (async generator of SimEvent)
  sim/sse.ts                 # encode SSE frames; client reader with chunk-buffered decoding
  sim/mock.ts                # mock personas + scripted transcript + mock report
  sim/reducer.ts             # pure reducer for client state
  validation.ts              # zod schemas mirroring /types
  export.ts                  # report -> markdown/JSON
  env.ts                     # LLM_BASE_URL / LLM_API_KEY(|DEEPSEEK_API_KEY) / LLM_MODEL defaults, hasApiKey(), limits
types/
  index.ts                   # domain types (below)
  events.ts                  # SimEvent union
```

Component boundaries: **PitchForm** owns only input + validation, emits a `ProductPitch`. **PersonaPanel/PersonaCard** are pure presentational (props: personas, activePersonaId). **ChatStream** renders `ChatMessage[]`, no fetching. **InterjectionInput** only calls `interject(text)` from the hook. **SummaryPanel** renders a `SimulationReport` or a skeleton. All network/stream logic lives in `useSimulation` + `lib/sim`, so UI is swappable between mock and real.

**Client entry boundary**: `app/simulate/page.tsx` is explicitly a client component (`'use client'`). It renders `SimulationProvider` and, inside it, `PersonaPanel`, `ChatStream`, `InterjectionInput` and `SummaryPanel`, so the reducer/context and all hooks live on the client. `app/page.tsx` and `layout.tsx` stay server components; `PitchForm` is the only client island on the landing page.

## 1a. LLM Service Layer (`lib/llm.ts`)

- **SDK**: `openai` package only. No provider-specific SDKs anywhere else in the codebase.
- **Config (`lib/env.ts`)**: `LLM_BASE_URL` (default `https://api.deepseek.com`), `LLM_API_KEY` falling back to `DEEPSEEK_API_KEY`, `LLM_MODEL` (default `deepseek-chat`). Client is `new OpenAI({ baseURL, apiKey })`, created lazily; `hasApiKey()` is false when no key is set, which triggers mock mode.
- **Wrapper API** (the only surface the orchestrator and routes see):
  - `runLLMCompletion({ system, messages, json?, signal }): Promise<string>`: non-streaming; `json: true` sets `response_format: { type: 'json_object' }` (used for personas and report).
  - `streamPersonaResponse({ system, messages, signal }): AsyncIterable<string>`: streaming token deltas via `stream: true`; used for each persona turn.
  - Both accept an `AbortSignal` and pass it to the SDK call as a request option (see Transport), and normalize errors (401/429/timeout) into a small `LLMError` type so the orchestrator is provider-neutral.
- **Swapping providers**: change env vars (e.g. `LLM_BASE_URL=https://api.openai.com/v1`, `LLM_MODEL=gpt-4o-mini`), or edit `lib/llm.ts` alone. Callers and prompts are untouched.
- **Caveat**: JSON-mode support and model names vary by provider; zod validation plus one retry (Section 2) covers drift.

## 2. Data Schemas (`/types`)

```ts
interface ProductPitch {
  id: string;
  title: string;
  description: string;          // 20–2000 chars
  targetAudience?: string;
  stage?: 'idea' | 'prototype' | 'launched';
  pricingNote?: string;
}

interface Persona {
  id: string;                   // 'p1' | 'p2' | 'p3'
  name: string;
  archetype: string;            // e.g. "Skeptical enterprise buyer"
  age?: number;
  occupation: string;
  goals: string[];
  frustrations: string[];
  budgetSensitivity: 'low' | 'medium' | 'high';
  techSavviness: 'low' | 'medium' | 'high';
  speakingStyle: string;        // injected into system prompt
  avatarColor: string;          // tailwind token for UI
}

type MessageRole = 'persona' | 'user' | 'system';
interface ChatMessage {
  id: string;
  role: MessageRole;
  personaId?: string;           // set when role === 'persona'
  content: string;
  round: number;                // 0 = opening; increments after P3
  status: 'streaming' | 'complete' | 'error';
  createdAt: number;
}

interface SimulationReport {
  verdict: 'strong' | 'promising' | 'risky' | 'weak';
  overallScore: number;         // 0–100
  perPersona: { personaId: string; sentiment: -1 | 0 | 1; wouldPay: boolean; keyQuote: string }[];
  themes: { label: string; type: 'strength' | 'concern'; mentions: number }[];
  risks: string[];
  suggestedExperiments: string[]; // sprint-sized validation tasks
  openQuestions: string[];
  generatedAt: number;
  source: 'llm' | 'mock';
}

type SimStatus = 'idle' | 'generatingPersonas' | 'running' | 'awaitingUser' | 'reporting' | 'done' | 'error';
```

`SimEvent` (SSE payloads, discriminated on `type`): `turn_start {personaId, round}`, `token {messageId, delta}`, `turn_end {messageId}`, `round_end {round}`, `error {message, recoverable}`, `done`.

Zod schemas in `lib/validation.ts` mirror these; LLM JSON outputs (personas, report) are parsed through them with one retry on failure, then fall back to mock.

**Mock/fallback data (`lib/sim/mock.ts`)** — used when `hasApiKey()` is false, on LLM failure, or via `?mock=1`:
- 3 fixed personas: **Dana Whitfield** (skeptical enterprise buyer — security, procurement, ROI), **Marcus Lee** (impatient power user — speed, shortcuts, integrations), **Priya Nair** (budget-conscious student — free tier, value).
- Scripted 2-round transcript (6 messages) parameterized with `pitch.title`, emitted token-by-token with ~20–40 ms delays through the same `SimEvent` pipeline so UI/streaming code paths are identical.
- Static `SimulationReport` with `source: 'mock'` and a visible "Demo data" badge.

## 3. State Management & Multi-Agent Flow

**Client state** (React `useReducer` in `SimulationProvider`, no external lib): `pitch`, `personas`, `messages`, `status`, `activePersonaId`, `round`, `report`, `error`. Reducer in `lib/sim/reducer.ts` is pure and unit-testable; actions map 1:1 to `SimEvent`s plus `USER_MESSAGE`, `RESET`. Persist snapshot to `localStorage` for refresh recovery (optional, milestone 4). **Server state**: none persisted — routes are stateless; the client sends the full context (pitch, personas, transcript) on each call, which makes interjection and resume trivial and avoids session storage.

**Flow**
1. `PitchForm` submit → `POST /api/personas` → 3 personas (status `generatingPersonas`) → navigate to `/simulate`.
2. `useSimulation.start()` → `POST /api/simulate` with `{pitch, personas, messages, maxRounds}`; response is `text/event-stream`.
3. Server `orchestrator.ts` (async generator) loops rounds; per round, in fixed order P1 → P2 → P3: emit `turn_start`, build that persona's prompt (system: persona profile + speaking style + "stay in character, ≤80 words, react to what others said, no repeating"; user: pitch + full transcript so far), stream tokens as `token` events, emit `turn_end`. Each turn awaits the previous completing, so later personas see earlier replies (true sequential turn-taking, one LLM call per turn). Emit `round_end` after P3.
4. Default `maxRounds = 2`. After the final round the stream ends with `done`, and status becomes `awaitingUser` (user may interject or finish).
5. "Generate report" → `POST /api/report` with transcript → `SimulationReport` (JSON-mode, zod-validated).

**Transport**: SSE over a `POST` fetch (`ReadableStream` response; `EventSource` can't POST). Route sets `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`.

- **Server abort handling**: `/api/simulate/route.ts` passes Next.js's `request.signal` straight through the orchestrator into `lib/llm.ts`, which hands it to the SDK call as a request option, e.g. `client.chat.completions.create({ model, messages, stream: true }, { signal: req.signal })`. When the client disconnects, hits **Stop**, or interjects (aborting its fetch), upstream token generation is cancelled immediately, with no orphan LLM calls. The orchestrator also checks `signal.aborted` between turns and stops the generator.
- **SSE chunk buffering**: the client reader in `lib/sim/sse.ts` must not assume one network chunk equals one frame. It uses a chunk-buffered decoder (`TextDecoder` with `{ stream: true }`, appending to a buffer and splitting on the `\n\n` frame delimiter, keeping the trailing partial frame for the next chunk), or alternatively `eventsource-parser`. This keeps frames split across TCP/HTTP chunk boundaries (including mid-UTF-8 characters) intact. Covered by a unit test that feeds a frame sliced at every byte offset.

**Human-in-the-loop injection**: `interject(text)` (a) aborts any in-flight stream via `AbortController`, keeping partial text marked `complete` (truncated), (b) appends a `role:'user'` message, (c) opens a fresh `POST /api/simulate` with the updated transcript and `mode:'respond'`, where the orchestrator runs one round starting with the persona most relevant to the question (round-robin from the next persona after the last speaker as the default; prompts tell personas to address the user's message directly). The user can also interject while status is `awaitingUser`. Guards: input disabled during `generatingPersonas`/`reporting`; cap total messages (~40) and message length (500 chars) to bound cost.

**Errors**: per-turn failure emits `error{recoverable:true}`; UI shows a retry on that bubble; repeated failure or 401/429 switches to mock with a toast. Missing key never errors — mock mode with a banner.

## 4. Implementation Roadmap (4 micro-milestones)

**M1 — Setup & Layout**
- `pnpm create next-app` (App Router, TS, Tailwind, ESLint), `pnpm dlx shadcn@latest init`, add primitives; `pnpm add zod openai`.
- Create `/types`, folder skeleton, `.env.example` (`LLM_BASE_URL`, `LLM_API_KEY`/`DEEPSEEK_API_KEY`, `LLM_MODEL`), root layout, landing page with static `PitchForm` shell and static `/simulate` layout (persona row, chat column, summary side panel; responsive: summary becomes a tab on mobile).
- ✔ Verify: `pnpm dev` renders both pages; `tsc --noEmit` and `lint` clean.

**M2 — Mock Simulation UI**
- **Test setup**: `pnpm add -D vitest`; add `"test": "vitest run"` to `package.json` scripts (replaces the old placeholder; `pnpm test` must exit 0).
- Implement `lib/sim/mock.ts`, `lib/sim/sse.ts` (SSE frame encoder + chunk-buffered stream decoder, per Transport in Section 3), `lib/sim/reducer.ts`, `SimulationProvider`, `useSimulation`, `ChatStream`, `PersonaCard` (active speaker highlight), `SummaryPanel`, form validation.
- Mock orchestrator emits `SimEvent`s with delays, encoded as SSE frames into an in-process `ReadableStream` and consumed by the same `sse.ts` decoder the real `fetch` path will use in M3; interjection works against scripted replies.
- **Unit tests (Vitest)**:
  - `lib/sim/reducer.ts`: state transitions per action/`SimEvent` (e.g. `turn_start` sets `activePersonaId` and adds a streaming message, `token` appends, `turn_end` completes it, `round_end` advances `round`, `done` sets `awaitingUser`, `USER_MESSAGE` appends a user message, `RESET`), plus the error path.
  - `lib/sim/sse.ts`: byte-slice chunk-boundary parsing. Encode a sequence of events (including multi-byte UTF-8 characters), split the bytes at every offset (and into 1-byte chunks), decode, and assert the same events in order with no dropped, duplicated or broken frames.
  - Mock event order (`mock.ts`): `turn_start` → `token`* → `turn_end` per turn, P1 → P2 → P3, `round_end` after P3, `done` last.
- ✔ Verify: full flow pitch → personas → 6 streamed messages → interject → mock report, no API key set; `pnpm test`, `pnpm lint` and `npx tsc --noEmit` all pass.

**M3 — Real LLM API & Streaming**
- `lib/llm.ts` (openai SDK, DeepSeek defaults), `lib/prompts.ts`, `/api/personas`, `/api/simulate` (SSE + `request.signal` forwarded to the SDK call), `/api/report`; swap client from the in-process stub to a `fetch` stream, reusing the M2 `sse.ts` decoder; key-detection fallback; zod parse + retry; rate/size limits.
- ✔ Verify: with key — personas are pitch-specific, turns stream in P1→P2→P3 order and reference earlier speakers; Stop and interject abort cleanly (no orphan upstream calls); without key — identical UX in mock mode. Orchestrator tested with a fake LLM client (turn order, abort propagation of `signal`, error recovery).

**M4 — Polish & Export**
- `lib/export.ts` & `ExportMenu.tsx`: Export report to formatted Markdown, JSON, and direct clipboard copy.
- Layout & Persistence: Fix responsive DOM layout in `/simulate` (remove double-rendered chat containers) and add `localStorage` snapshot persistence to recover state on page refresh.
- UI Polish & Visual Indicators: Add loading skeletons, error/retry states on chat bubbles, dark mode polish, empty states, and a prominent "Demo Data" badge when running without an API key.
- Accessibility & Docs: Add `aria-live` regions for streaming text, focus management, and a complete `README.md` with setup/env instructions.
- ✔ Verify: Manual browser smoke test for happy path and no-key path; verify exported Markdown matches on-screen report; confirm `pnpm tsc --noEmit`, `pnpm lint`, and `pnpm test` pass with zero errors.

## Open risks
- LLM JSON drift (mitigate: zod + retry + fallback). Cost runaway (mitigate: round/message/length caps). Persona homogeneity (mitigate: distinct speaking styles and explicit "disagree where your profile would" instruction).

