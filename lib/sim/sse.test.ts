import { describe, expect, it } from "vitest";
import type { SimEvent } from "@/types/events";
import { encodeEvent, readSseEvents, SseParser } from "./sse";

const events: SimEvent[] = [
  { type: "turn_start", personaId: "p1", round: 0, messageId: "m1" },
  { type: "token", messageId: "m1", delta: "héllo 世界 🚀 " },
  { type: "token", messageId: "m1", delta: "line\nbreak" },
  { type: "turn_end", messageId: "m1" },
  { type: "done" },
];
const bytes = new TextEncoder().encode(events.map(encodeEvent).join(""));

function decode(chunks: Uint8Array[]): SimEvent[] {
  const parser = new SseParser();
  return chunks.flatMap((c) => parser.push(c));
}

describe("SseParser", () => {
  it("decodes a single chunk", () => {
    expect(decode([bytes])).toEqual(events);
  });

  it("decodes when the bytes are split at every offset", () => {
    for (let i = 0; i <= bytes.length; i++) {
      expect(decode([bytes.slice(0, i), bytes.slice(i)]), `split at ${i}`).toEqual(events);
    }
  });

  it("decodes 1-byte chunks (splits inside multi-byte characters and the \\n\\n delimiter)", () => {
    const chunks = Array.from(bytes, (b) => Uint8Array.of(b));
    expect(decode(chunks)).toEqual(events);
  });

  it("holds back an unterminated trailing frame", () => {
    const partial = bytes.slice(0, bytes.length - 2);
    expect(decode([partial])).toEqual(events.slice(0, -1));
  });
});

describe("readSseEvents", () => {
  it("yields events from a stream whose chunks split frames", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
        controller.close();
      },
    });
    const out: SimEvent[] = [];
    for await (const e of readSseEvents(stream)) out.push(e);
    expect(out).toEqual(events);
  });
});
