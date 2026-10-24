import { describe, expect, it } from "vitest";
import type { ChatMessage, ProductPitch, SimulationReport } from "@/types";
import { MOCK_PERSONAS } from "./mock";
import { initialState, simReducer, type SimAction, type SimState } from "./reducer";

const pitch: ProductPitch = { id: "x", title: "TaskPilot", description: "A planner for freelancers." };

function run(actions: SimAction[], from: SimState = initialState): SimState {
  return actions.reduce(simReducer, from);
}

const turn = (id: string, personaId: string, round: number, text: string): SimAction[] => [
  { type: "turn_start", personaId, round, messageId: id },
  ...text.split(" ").map((w): SimAction => ({ type: "token", messageId: id, delta: w + " " })),
  { type: "turn_end", messageId: id },
];

describe("simReducer", () => {
  it("PITCH_SUBMITTED resets state and starts persona generation", () => {
    const dirty = run([{ type: "PITCH_SUBMITTED", pitch }, { type: "PERSONAS_READY", personas: MOCK_PERSONAS }]);
    const s = run([{ type: "PITCH_SUBMITTED", pitch }], dirty);
    expect(s).toEqual({ ...initialState, pitch, status: "generatingPersonas" });
  });

  it("PERSONAS_READY stores personas, SIM_STARTED moves to running", () => {
    const s = run([{ type: "PITCH_SUBMITTED", pitch }, { type: "PERSONAS_READY", personas: MOCK_PERSONAS }, { type: "SIM_STARTED" }]);
    expect(s.personas).toHaveLength(3);
    expect(s.status).toBe("running");
  });

  it("turn_start adds a streaming message and sets the active persona", () => {
    const s = run([{ type: "turn_start", personaId: "p1", round: 0, messageId: "m1" }]);
    expect(s.activePersonaId).toBe("p1");
    expect(s.messages).toMatchObject([{ id: "m1", role: "persona", personaId: "p1", content: "", status: "streaming", round: 0 }]);
  });

  it("token appends only to its message; turn_end completes it and clears the active persona", () => {
    const s = run(turn("m1", "p1", 0, "hello there"));
    expect(s.messages[0]).toMatchObject({ content: "hello there ", status: "complete" });
    expect(s.activePersonaId).toBeNull();
  });

  it("round_end advances the round; done awaits the user", () => {
    const s = run([...turn("m1", "p1", 0, "a"), { type: "round_end", round: 0 }, { type: "SIM_STARTED" }, { type: "done" }]);
    expect(s.round).toBe(1);
    expect(s.status).toBe("awaitingUser");
  });

  it("USER_MESSAGE finalizes a cut-off stream (keeping partial text) and appends the message", () => {
    const user: ChatMessage = { id: "u1", role: "user", content: "wait", round: 0, status: "complete", createdAt: 1 };
    const s = run([
      { type: "turn_start", personaId: "p1", round: 0, messageId: "m1" },
      { type: "token", messageId: "m1", delta: "par" },
      { type: "USER_MESSAGE", message: user },
    ]);
    expect(s.messages.map((m) => [m.id, m.content, m.status])).toEqual([["m1", "par", "complete"], ["u1", "wait", "complete"]]);
    expect(s.activePersonaId).toBeNull();
  });

  it("STOP while running settles the stream and awaits the user", () => {
    const s = run([
      { type: "SIM_STARTED" },
      { type: "turn_start", personaId: "p2", round: 0, messageId: "m1" },
      { type: "token", messageId: "m1", delta: "hi" },
      { type: "STOP" },
    ]);
    expect(s.status).toBe("awaitingUser");
    expect(s.messages[0].status).toBe("complete");
  });

  it("recoverable error marks the stream errored and awaits the user; fatal error sets error status", () => {
    const streaming: SimAction[] = [{ type: "SIM_STARTED" }, { type: "turn_start", personaId: "p1", round: 0, messageId: "m1" }];
    const soft = run([...streaming, { type: "error", message: "boom", recoverable: true }]);
    expect(soft).toMatchObject({ status: "awaitingUser", error: "boom", activePersonaId: null });
    expect(soft.messages[0].status).toBe("error");
    expect(run([...streaming, { type: "error", message: "dead", recoverable: false }]).status).toBe("error");
  });

  it("SIM_STARTED clears a previous error", () => {
    const s = run([{ type: "error", message: "x", recoverable: true }, { type: "SIM_STARTED" }]);
    expect(s.error).toBeNull();
  });

  it("report flow: REPORT_REQUESTED -> reporting, REPORT_READY -> done with report", () => {
    const report = { verdict: "promising", source: "mock" } as SimulationReport;
    const s = run([{ type: "REPORT_REQUESTED" }, { type: "REPORT_READY", report }]);
    expect(s.status).toBe("done");
    expect(s.report).toBe(report);
  });

  it("RESET returns the initial state", () => {
    expect(run([{ type: "PITCH_SUBMITTED", pitch }, { type: "RESET" }])).toEqual(initialState);
  });
});
