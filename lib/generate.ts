import type { z } from "zod";
import { hasApiKey } from "@/lib/env";
import { LLMError, runLLMCompletion, type LLMRequest } from "@/lib/llm";
import { buildPersonasPrompt, buildReportPrompt } from "@/lib/prompts";
import { mockPersonas, mockReport } from "@/lib/sim/mock";
import { llmPersonasSchema, llmReportSchema } from "@/lib/validation";
import type { ChatMessage, Persona, ProductPitch, SimulationReport } from "@/types";

const AVATAR_COLORS = ["bg-sky-500", "bg-amber-500", "bg-emerald-500"];

/** Runs a JSON-mode completion and validates it; one retry on bad JSON or schema drift. */
async function completeJson<T>(req: LLMRequest, schema: z.ZodType<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await runLLMCompletion({ ...req, json: true });
    try {
      return schema.parse(JSON.parse(text));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/** Any failure other than the caller aborting falls back to mock data. */
async function withMockFallback<T>(real: () => Promise<T>, mock: () => Promise<T>, signal: AbortSignal): Promise<T> {
  if (!hasApiKey()) return mock();
  try {
    return await real();
  } catch (err) {
    if (signal.aborted || (err instanceof LLMError && err.kind === "aborted")) throw err;
    return mock();
  }
}

export function generatePersonas(pitch: ProductPitch, signal: AbortSignal): Promise<Persona[]> {
  return withMockFallback(
    async () => {
      const { personas } = await completeJson({ ...buildPersonasPrompt(pitch), signal }, llmPersonasSchema);
      return personas.map((p, i) => ({ ...p, id: `p${i + 1}`, avatarColor: AVATAR_COLORS[i] }));
    },
    () => mockPersonas(signal),
    signal,
  );
}

export function generateReport(
  pitch: ProductPitch,
  personas: Persona[],
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<SimulationReport> {
  return withMockFallback(
    async () => {
      const report = await completeJson({ ...buildReportPrompt(pitch, personas, messages), signal }, llmReportSchema);
      return { ...report, generatedAt: Date.now(), source: "llm" as const };
    },
    () => mockReport(personas, signal),
    signal,
  );
}
