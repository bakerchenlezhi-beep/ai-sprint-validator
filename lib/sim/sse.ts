import type { SimEvent } from "@/types/events";

export function encodeEvent(event: SimEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Incremental SSE decoder. Network chunks can split a frame (or a multi-byte
 * UTF-8 character) anywhere, so bytes are decoded in streaming mode and only
 * complete frames (terminated by a blank line) are emitted; the trailing
 * partial frame stays buffered for the next push.
 */
export class SseParser {
  private decoder = new TextDecoder();
  private buffer = "";

  push(chunk: Uint8Array): SimEvent[] {
    this.buffer += this.decoder.decode(chunk, { stream: true });
    const frames = this.buffer.split("\n\n");
    this.buffer = frames.pop() ?? "";
    return frames.flatMap(parseFrame);
  }
}

function parseFrame(frame: string): SimEvent[] {
  const data = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");
  return data ? [JSON.parse(data) as SimEvent] : [];
}

export async function* readSseEvents(stream: ReadableStream<Uint8Array>): AsyncGenerator<SimEvent> {
  const reader = stream.getReader();
  const parser = new SseParser();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      yield* parser.push(value);
    }
  } finally {
    // Stops the source if the consumer bails out early (e.g. Stop/interject).
    reader.cancel().catch(() => {});
  }
}
