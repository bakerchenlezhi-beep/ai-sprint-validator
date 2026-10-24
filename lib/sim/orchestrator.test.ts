import { describe, expect, it } from "vitest";
import { LLMError, type LLMRequest } from "@/lib/llm";
import type { ChatMessage, ProductPitch } from "@/types";
import type { SimEvent } from "@/types/events";
import { MOCK_PERSONAS } from "./mock";
import { runSimulation, type StreamTurn } from "./orchestrator";

const pitch: ProductPitch = { id: "x", title: "TaskPilot", description: "A planner for freelancers." };

async function collect(gen: AsyncIterable<SimEvent>): Promise<SimEvent[]> {
  const out: SimEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

function run(streamTurn: StreamTurn, over: Partial<Parameters<typeof runSimulation>[0]> = {}) {
  return runSimulation({
    pitch,
    personas: MOCK_PERSONAS,
    messages: [],
    mode: "start",
    round: 0,
    signal: new AbortController().signal,
    streamTurn,
    ...over,
  });
}

/** Fake LLM that answers "<n>:<word> <word>" and records each request. */
function fakeLLM() {
  const requests: LLMRequest[] = [];
  const streamTurn: StreamTurn = async function* (req) {
    requests.push(req);
    const n = requests.length;
    yield `reply${n} `;
    yield "done";
  };
  return { requests, streamTurn };
}

describe("runSimulation", () => {
  it("runs 2 rounds p1 -> p2 -> p3 and later personas see earlier replies", async () => {
    const { requests, streamTurn } = fakeLLM();
    const events = await collect(run(streamTurn));

    expect(events.filter((e) => e.type === "turn_start").map((e) => e.personaId)).toEqual(["p1", "p2", "p3", "p1", "p2", "p3"]);
    expect(events.filter((e) => e.type === "round_end").map((e) => e.round)).toEqual([0, 1]);
    expect(events.at(-1)).toEqual({ type: "done" });
    expect(requests).toHaveLength(6);

    expect(requests[0].messages[0].content).toContain("you speak first");
    expect(requests[1].messages[0].content).toContain("Dana Whitfield: reply1 done");
    expect(requests[2].messages[0].content).toContain("Marcus Lee: reply2 done");
    expect(requests[0].system).toContain("Dana Whitfield");
    expect(requests[1].system).toContain("Marcus Lee");
  });

  it("respond mode runs one round after the last speaker and tells the persona to answer the founder", async () => {
    const messages: ChatMessage[] = [
      { id: "a", role: "persona", personaId: "p1", content: "hi", round: 0, status: "complete", createdAt: 0 },
      { id: "b", role: "user", content: "What about price?", round: 0, status: "complete", createdAt: 0 },
    ];
    const { requests, streamTurn } = fakeLLM();
    const events = await collect(run(streamTurn, { mode: "respond", messages }));

    expect(events.filter((e) => e.type === "turn_start").map((e) => e.personaId)).toEqual(["p2", "p3", "p1"]);
    expect(requests[0].system).toContain("answer their latest message directly");
    expect(requests[0].messages[0].content).toContain("Founder: What about price?");
  });

  it("forwards the abort signal to the LLM call and stops without emitting more events", async () => {
    const controller = new AbortController();
    let seen: AbortSignal | undefined;
    const streamTurn: StreamTurn = async function* (req) {
      seen = req.signal;
      yield "first ";
      controller.abort();
      yield "second ";
    };
    const events = await collect(run(streamTurn, { signal: controller.signal }));

    expect(seen).toBe(controller.signal);
    expect(events.map((e) => e.type)).toEqual(["turn_start", "token"]);
  });

  it("does not start another turn once aborted between turns", async () => {
    const controller = new AbortController();
    let calls = 0;
    const streamTurn: StreamTurn = async function* () {
      calls++;
      controller.abort();
      yield "x";
    };
    await collect(run(streamTurn, { signal: controller.signal }));
    expect(calls).toBe(1);
  });

  it("emits a recoverable error and stops when a turn fails", async () => {
    let calls = 0;
    const streamTurn: StreamTurn = async function* () {
      calls++;
      if (calls === 2) throw new LLMError("rate_limit", "slow down");
      yield "ok";
    };
    const events = await collect(run(streamTurn));

    expect(events.at(-1)).toEqual({ type: "error", message: "slow down", recoverable: true });
    expect(events.some((e) => e.type === "done")).toBe(false);
    expect(calls).toBe(2);
  });

  it("marks auth failures as not recoverable", async () => {
    const streamTurn: StreamTurn = async function* () {
      throw new LLMError("auth", "bad key");
    };
    const events = await collect(run(streamTurn));
    expect(events.at(-1)).toEqual({ type: "error", message: "bad key", recoverable: false });
  });

  it("retry runs only the requested persona, without addressing a user message", async () => {
    const messages: ChatMessage[] = [
      { id: "a", role: "persona", personaId: "p1", content: "hi", round: 0, status: "complete", createdAt: 0 },
    ];
    const { requests, streamTurn } = fakeLLM();
    const events = await collect(run(streamTurn, { mode: "respond", messages, round: 0, onlyPersonaId: "p2" }));

    expect(events.map((e) => e.type)).toEqual(["turn_start", "token", "token", "turn_end", "done"]);
    expect(events[0]).toMatchObject({ personaId: "p2", round: 0 });
    expect(requests).toHaveLength(1);
    expect(requests[0].system).not.toContain("answer their latest message directly");
    expect(requests[0].messages[0].content).toContain("Dana Whitfield: hi");
  });

  it("a retried last speaker still closes its round", async () => {
    const { streamTurn } = fakeLLM();
    const events = await collect(run(streamTurn, { mode: "respond", round: 1, onlyPersonaId: "p3" }));
    expect(events.map((e) => e.type)).toEqual(["turn_start", "token", "token", "turn_end", "round_end", "done"]);
    expect(events.find((e) => e.type === "round_end")).toEqual({ type: "round_end", round: 1 });
  });
});
