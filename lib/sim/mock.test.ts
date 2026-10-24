import { describe, expect, it } from "vitest";
import type { ChatMessage, ProductPitch } from "@/types";
import type { SimEvent } from "@/types/events";
import { MOCK_PERSONAS, mockSimEvents, mockSimStream } from "./mock";
import { readSseEvents } from "./sse";

const pitch: ProductPitch = { id: "x", title: "TaskPilot", description: "A planner for freelancers." };
const base = { pitch, personas: MOCK_PERSONAS, messages: [] as ChatMessage[], round: 0, tokenDelayMs: [0, 0] as [number, number] };

async function collect(gen: AsyncIterable<SimEvent>): Promise<SimEvent[]> {
  const out: SimEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

describe("mockSimEvents", () => {
  it("emits 2 rounds in p1 -> p2 -> p3 order with well-formed turns", async () => {
    const events = await collect(mockSimEvents({ ...base, mode: "start" }));
    const starts = events.filter((e) => e.type === "turn_start");
    expect(starts.map((e) => e.personaId)).toEqual(["p1", "p2", "p3", "p1", "p2", "p3"]);
    expect(starts.map((e) => e.round)).toEqual([0, 0, 0, 1, 1, 1]);
    expect(events.filter((e) => e.type === "round_end").map((e) => e.round)).toEqual([0, 1]);
    expect(events.at(-1)).toEqual({ type: "done" });

    // Each turn is turn_start, token+, turn_end for the same messageId, and round_end follows every 3rd turn.
    const shape = events.map((e) => e.type).join(",").replace(/token(,token)*/g, "token");
    expect(shape).toBe(
      "turn_start,token,turn_end,turn_start,token,turn_end,turn_start,token,turn_end,round_end,".repeat(2) + "done",
    );
  });

  it("respond mode runs one round starting after the last speaker and quotes the user", async () => {
    const messages: ChatMessage[] = [
      { id: "a", role: "persona", personaId: "p1", content: "hi", round: 0, status: "complete", createdAt: 0 },
      { id: "b", role: "user", content: "What about price?", round: 0, status: "complete", createdAt: 0 },
    ];
    const events = await collect(mockSimEvents({ ...base, messages, mode: "respond" }));
    expect(events.filter((e) => e.type === "turn_start").map((e) => e.personaId)).toEqual(["p2", "p3", "p1"]);
    const text = events.filter((e) => e.type === "token").map((e) => e.delta).join("");
    expect(text).toContain("What about price?");
  });

  it("stops emitting once aborted", async () => {
    const controller = new AbortController();
    const out: SimEvent[] = [];
    for await (const e of mockSimEvents({ ...base, mode: "start", signal: controller.signal })) {
      out.push(e);
      if (e.type === "turn_start") controller.abort();
    }
    expect(out.some((e) => e.type === "done")).toBe(false);
  });

  it("round-trips through the SSE stream", async () => {
    const direct = await collect(mockSimEvents({ ...base, mode: "start" }));
    const viaStream = await collect(readSseEvents(mockSimStream({ ...base, mode: "start" })));
    expect(viaStream.map((e) => e.type)).toEqual(direct.map((e) => e.type));
  });
});
