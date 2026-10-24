# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project

Next.js (App Router, TypeScript, Tailwind v4, shadcn/ui) app, "AI Sprint Validator". `PLAN.md` is the source of truth for architecture and milestones (M1 setup, M2 mock simulation and M3 real LLM API & streaming are 100% complete, with all 26 unit tests passing; M4, polish & export, is the active next phase). Implement only the milestone the user has approved.

- Package manager: **pnpm** (via corepack). Commands: `pnpm dev`, `pnpm build`, `pnpm lint`, `npx tsc --noEmit`, `pnpm test` (Vitest; single file: `pnpm vitest run lib/sim/sse.test.ts`).
- This Next.js version has breaking changes: per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code.
- LLM access goes only through `lib/llm.ts` (`openai` SDK, DeepSeek defaults, config in `lib/env.ts`, vars in `.env.example`). No key means mock mode.
- shadcn style is `base-nova` (Base UI, not Radix); check component APIs in `components/ui/` before use.
- Simulation flow: `PitchForm` stores the pitch in `sessionStorage` and routes to `/simulate`, where `SimulationProvider` generates personas and streams events. Everything goes through `SimEvent`s -> SSE bytes (`lib/sim/sse.ts`) -> `lib/sim/reducer.ts`; `runStream` in `SimulationProvider.tsx` fetches `/api/simulate` (SSE from `lib/sim/orchestrator.ts` with a key, `lib/sim/mock.ts` without), and `/api/personas` and `/api/report` fall back to mock data on failure.
