import { LLMError, type LLMRequest } from "@/lib/llm";
import { buildTurnPrompt } from "@/lib/prompts";
import type { ChatMessage, Persona, ProductPitch } from "@/types";
import type { SimEvent } from "@/types/events";

/** The one LLM capability the orchestrator needs; tests pass a fake. */
export type StreamTurn = (req: LLMRequest & { maxTokens?: number }) => AsyncIterable<string>;

export interface OrchestratorInput {
  pitch: ProductPitch;
  personas: Persona[];
  messages: ChatMessage[];
  mode: "start" | "respond";
  round: number;
  rounds?: number; // for mode 'start'
  onlyPersonaId?: string; // retry: regenerate just this persona's turn
  signal: AbortSignal;
  streamTurn: StreamTurn;
}

const TURN_MAX_TOKENS = 220;

/** Turn order: 'start' runs `rounds` rounds p1 -> p3; 'respond' runs one round starting after the last speaker; a retry is a single turn. */
function planTurns(input: OrchestratorInput): { persona: Persona; round: number }[] {
  const { personas, messages, mode, round } = input;
  if (input.onlyPersonaId) return personas.filter((p) => p.id === input.onlyPersonaId).map((persona) => ({ persona, round }));
  if (mode === "start") {
    return Array.from({ length: input.rounds ?? 2 }, (_, r) => personas.map((persona) => ({ persona, round: round + r }))).flat();
  }
  const last = [...messages].reverse().find((m) => m.role === "persona");
  const lastIdx = personas.findIndex((p) => p.id === last?.personaId);
  return personas.map((_, k) => ({ persona: personas[(lastIdx + 1 + k) % personas.length], round }));
}

export async function* runSimulation(input: OrchestratorInput): AsyncGenerator<SimEvent> {
  const { pitch, personas, signal } = input;
  const transcript = [...input.messages];
  const respondingToUser = input.mode === "respond" && transcript.at(-1)?.role === "user";

  for (const [n, { persona, round }] of planTurns(input).entries()) {
    if (signal.aborted) return;
    const messageId = `m-${input.messages.length}-${n}`;
    yield { type: "turn_start", personaId: persona.id, round, messageId };

    let text = "";
    try {
      const prompt = buildTurnPrompt({ pitch, persona, personas, transcript, respondingToUser });
      for await (const delta of input.streamTurn({ ...prompt, signal, maxTokens: TURN_MAX_TOKENS })) {
        if (signal.aborted) return;
        text += delta;
        yield { type: "token", messageId, delta };
      }
    } catch (err) {
      if (signal.aborted) return;
      const error = err instanceof LLMError ? err : new LLMError("unknown", err instanceof Error ? err.message : "Turn failed");
      yield { type: "error", message: error.message, recoverable: error.kind !== "auth" };
      return;
    }

    yield { type: "turn_end", messageId };
    transcript.push({ id: messageId, role: "persona", personaId: persona.id, content: text, round, status: "complete", createdAt: Date.now() });
    // A retried turn closes its round only if it was the round's last speaker.
    const roundDone = input.onlyPersonaId ? persona === personas.at(-1) : (n + 1) % personas.length === 0;
    if (roundDone) yield { type: "round_end", round };
  }
  yield { type: "done" };
}
