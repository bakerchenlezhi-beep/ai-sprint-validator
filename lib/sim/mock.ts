import type { ChatMessage, Persona, ProductPitch, SimulationReport } from "@/types";
import type { SimEvent } from "@/types/events";
import { encodeEvent } from "./sse";

export const MOCK_PERSONAS: Persona[] = [
  {
    id: "p1",
    name: "Dana Whitfield",
    archetype: "Skeptical enterprise buyer",
    age: 47,
    occupation: "Head of IT procurement",
    goals: ["Pass security review", "Prove ROI to the CFO"],
    frustrations: ["Vendor lock-in", "Vague pricing"],
    budgetSensitivity: "medium",
    techSavviness: "medium",
    speakingStyle: "Measured, asks pointed questions about risk and cost.",
    avatarColor: "bg-sky-500",
  },
  {
    id: "p2",
    name: "Marcus Lee",
    archetype: "Impatient power user",
    age: 31,
    occupation: "Senior software engineer",
    goals: ["Move faster", "Integrate with existing tools"],
    frustrations: ["Slow onboarding", "Missing keyboard shortcuts"],
    budgetSensitivity: "low",
    techSavviness: "high",
    speakingStyle: "Blunt and fast, talks in specifics and shortcuts.",
    avatarColor: "bg-amber-500",
  },
  {
    id: "p3",
    name: "Priya Nair",
    archetype: "Budget-conscious student",
    age: 21,
    occupation: "Graduate student",
    goals: ["Get real value for free", "Learn quickly"],
    frustrations: ["Paywalls", "Features hidden behind upgrades"],
    budgetSensitivity: "high",
    techSavviness: "medium",
    speakingStyle: "Friendly and curious, always weighing what it costs.",
    avatarColor: "bg-emerald-500",
  },
];

// Scripted lines per round, in persona order (p1, p2, p3).
const SCRIPT: ((title: string) => string)[][] = [
  [
    (t) => `${t} sounds interesting, but before I take it to my team I need to know how it handles security and what the real total cost looks like.`,
    (t) => `Agree on cost, Dana, but my first question is speed. If ${t} saves me clicks and plugs into my current tools, I'm in. If not, I'm gone.`,
    (t) => `I'd try ${t} if there's a genuinely useful free tier. I can't justify a subscription yet, so what do I get without paying?`,
  ],
  [
    () => `Priya's free tier question matters to me too, since it shapes the pilot. I'd want a clear, published pricing page and a data policy before any rollout.`,
    () => `A free tier is fine, but don't cripple it. Give me an API and shortcuts early, and I'll tell my whole team.`,
    () => `If the free version covers the basics and the paid one clearly adds more, I'd happily recommend it to my classmates.`,
  ],
];

const REPLIES: ((title: string, text: string) => string)[] = [
  (t, x) => `On "${x}": that's a fair point, and for ${t} I'd still want it backed by something concrete, like a written policy or a pilot.`,
  (t, x) => `Re "${x}": okay, but does ${t} actually make that quicker? Show me a real workflow, not a promise.`,
  (t, x) => `About "${x}": I like that, as long as ${t} stays affordable for someone like me.`,
];

export interface MockRequest {
  pitch: ProductPitch;
  personas: Persona[];
  messages: ChatMessage[];
  mode: "start" | "respond";
  round: number;
  rounds?: number; // for mode 'start'
  tokenDelayMs?: [number, number];
  signal?: AbortSignal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0 || signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

function tokenize(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

function lastUserText(messages: ChatMessage[]): string {
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}

/** Same event sequence the real orchestrator will emit (PLAN.md section 3). */
export async function* mockSimEvents(req: MockRequest): AsyncGenerator<SimEvent> {
  const { pitch, personas, messages, mode, signal } = req;
  const [minD, maxD] = req.tokenDelayMs ?? [20, 40];
  const title = pitch.title;
  const base = messages.length;

  let turns: { personaIndex: number; round: number; text: string }[];
  if (mode === "start") {
    const rounds = req.rounds ?? 2;
    turns = Array.from({ length: rounds }, (_, r) =>
      personas.map((_p, i) => ({ personaIndex: i, round: req.round + r, text: SCRIPT[Math.min(r, SCRIPT.length - 1)][i](title) })),
    ).flat();
  } else {
    // Round-robin, starting after whoever spoke last.
    const lastPersona = [...messages].reverse().find((m) => m.role === "persona");
    const lastIdx = personas.findIndex((p) => p.id === lastPersona?.personaId);
    const text = lastUserText(messages);
    turns = personas.map((_p, k) => {
      const i = (lastIdx + 1 + k) % personas.length;
      return { personaIndex: i, round: req.round, text: REPLIES[i](title, text) };
    });
  }

  for (const [n, turn] of turns.entries()) {
    if (signal?.aborted) return;
    const messageId = `m-${base}-${n}`;
    yield { type: "turn_start", personaId: personas[turn.personaIndex].id, round: turn.round, messageId };
    for (const delta of tokenize(turn.text)) {
      if (signal?.aborted) return;
      await sleep(minD + Math.random() * (maxD - minD), signal);
      yield { type: "token", messageId, delta };
    }
    yield { type: "turn_end", messageId };
    if ((n + 1) % personas.length === 0) yield { type: "round_end", round: turn.round };
  }
  yield { type: "done" };
}

/** In-process stand-in for the `/api/simulate` response body (SSE bytes). */
export function mockSimStream(req: MockRequest): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const event of mockSimEvents(req)) {
        controller.enqueue(encoder.encode(encodeEvent(event)));
      }
      controller.close();
    },
  });
}

export async function mockPersonas(signal?: AbortSignal): Promise<Persona[]> {
  await sleep(700, signal);
  return MOCK_PERSONAS;
}

export async function mockReport(personas: Persona[], signal?: AbortSignal): Promise<SimulationReport> {
  await sleep(900, signal);
  return {
    verdict: "promising",
    overallScore: 68,
    perPersona: personas.map((p, i) => ({
      personaId: p.id,
      sentiment: ([0, 1, 1] as const)[i % 3],
      wouldPay: i !== 2,
      keyQuote: ["I need security and pricing clarity first.", "Show me a faster workflow.", "A solid free tier wins me over."][i % 3],
    })),
    themes: [
      { label: "Clear pricing and a real free tier", type: "concern", mentions: 3 },
      { label: "Fits existing workflows", type: "strength", mentions: 2 },
      { label: "Security and data policy", type: "concern", mentions: 1 },
    ],
    risks: ["Free tier too limited to convince budget-conscious users", "Enterprise buyers need security answers before a pilot"],
    suggestedExperiments: [
      "Publish a pricing page and measure click-through",
      "Interview 5 power users about their current workflow",
      "Draft a one-page security overview and test it with 2 buyers",
    ],
    openQuestions: ["What is included in the free tier?", "Which integrations matter most?"],
    generatedAt: Date.now(),
    source: "mock",
  };
}
