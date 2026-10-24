import { parseBody } from "@/lib/api";
import { hasApiKey } from "@/lib/env";
import { streamPersonaResponse } from "@/lib/llm";
import { mockSimEvents } from "@/lib/sim/mock";
import { runSimulation } from "@/lib/sim/orchestrator";
import { encodeEvent } from "@/lib/sim/sse";
import { simulateRequestSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await parseBody(req, simulateRequestSchema);
  if ("error" in body) return body.error;

  // Aborts on client disconnect (req.signal) or when the response stream is cancelled.
  const cancelled = new AbortController();
  const signal = AbortSignal.any([req.signal, cancelled.signal]);
  const events = hasApiKey()
    ? runSimulation({ ...body.data, signal, streamTurn: streamPersonaResponse })
    : mockSimEvents({ ...body.data, signal });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) controller.enqueue(encoder.encode(encodeEvent(event)));
      } catch (err) {
        if (signal.aborted) return;
        const message = err instanceof Error ? err.message : "Stream failed";
        controller.enqueue(encoder.encode(encodeEvent({ type: "error", message, recoverable: false })));
      }
      if (!signal.aborted) controller.close();
    },
    cancel() {
      cancelled.abort();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
