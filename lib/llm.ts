import OpenAI from "openai";
import { LLM_API_KEY, LLM_BASE_URL, LLM_MODEL } from "./env";

export type LLMErrorKind = "auth" | "rate_limit" | "timeout" | "aborted" | "unknown";

export class LLMError extends Error {
  constructor(
    public kind: LLMErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export interface LLMChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  system: string;
  messages: LLMChatMessage[];
  signal?: AbortSignal;
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
  client ??= new OpenAI({ baseURL: LLM_BASE_URL, apiKey: LLM_API_KEY, timeout: 60_000, maxRetries: 1 });
  return client;
}

function normalizeError(err: unknown, signal?: AbortSignal): LLMError {
  if (err instanceof LLMError) return err;
  if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) return new LLMError("aborted", "Request aborted");
  if (err instanceof OpenAI.APIConnectionTimeoutError) return new LLMError("timeout", "The model took too long to respond");
  if (err instanceof OpenAI.APIError) {
    if (err.status === 401 || err.status === 403) return new LLMError("auth", "The LLM API key was rejected");
    if (err.status === 429) return new LLMError("rate_limit", "The LLM provider is rate limiting requests");
  }
  return new LLMError("unknown", err instanceof Error ? err.message : "LLM request failed");
}

function toParams(req: LLMRequest) {
  return { model: LLM_MODEL, messages: [{ role: "system" as const, content: req.system }, ...req.messages] };
}

/** Non-streaming completion. `json: true` asks the provider for a JSON object. */
export async function runLLMCompletion(req: LLMRequest & { json?: boolean }): Promise<string> {
  try {
    const res = await getClient().chat.completions.create(
      { ...toParams(req), ...(req.json && { response_format: { type: "json_object" as const } }) },
      { signal: req.signal },
    );
    return res.choices[0]?.message?.content ?? "";
  } catch (err) {
    throw normalizeError(err, req.signal);
  }
}

/** Streams token deltas. The signal is handed to the SDK so aborting cancels the upstream call. */
export async function* streamPersonaResponse(req: LLMRequest & { maxTokens?: number }): AsyncGenerator<string> {
  try {
    const stream = await getClient().chat.completions.create(
      { ...toParams(req), stream: true, max_tokens: req.maxTokens },
      { signal: req.signal },
    );
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  } catch (err) {
    throw normalizeError(err, req.signal);
  }
}
