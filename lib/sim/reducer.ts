import type { ChatMessage, Persona, ProductPitch, SimStatus, SimulationReport } from "@/types";
import type { SimEvent } from "@/types/events";

export interface SimState {
  pitch: ProductPitch | null;
  personas: Persona[];
  messages: ChatMessage[];
  status: SimStatus;
  activePersonaId: string | null;
  round: number;
  report: SimulationReport | null;
  error: string | null;
}

export type SimAction =
  | SimEvent
  | { type: "PITCH_SUBMITTED"; pitch: ProductPitch }
  | { type: "PERSONAS_READY"; personas: Persona[] }
  | { type: "SIM_STARTED" }
  | { type: "USER_MESSAGE"; message: ChatMessage }
  | { type: "STOP" }
  | { type: "RETRY_TURN" }
  | { type: "RESTORE"; state: SimState }
  | { type: "REPORT_REQUESTED" }
  | { type: "REPORT_READY"; report: SimulationReport }
  | { type: "RESET" };

export const initialState: SimState = {
  pitch: null,
  personas: [],
  messages: [],
  status: "idle",
  activePersonaId: null,
  round: 0,
  report: null,
  error: null,
};

/** Streaming messages that get cut off are kept as-is and marked complete (or error). */
function settle(messages: ChatMessage[], status: "complete" | "error"): ChatMessage[] {
  return messages.map((m) => (m.status === "streaming" ? { ...m, status } : m));
}

export function simReducer(state: SimState, action: SimAction): SimState {
  switch (action.type) {
    case "PITCH_SUBMITTED":
      return { ...initialState, pitch: action.pitch, status: "generatingPersonas" };
    case "PERSONAS_READY":
      return { ...state, personas: action.personas };
    case "SIM_STARTED":
      return { ...state, status: "running", error: null };
    case "turn_start":
      return {
        ...state,
        activePersonaId: action.personaId,
        round: action.round,
        messages: [
          ...state.messages,
          {
            id: action.messageId,
            role: "persona",
            personaId: action.personaId,
            content: "",
            round: action.round,
            status: "streaming",
            createdAt: Date.now(),
          },
        ],
      };
    case "token":
      return {
        ...state,
        messages: state.messages.map((m) => (m.id === action.messageId ? { ...m, content: m.content + action.delta } : m)),
      };
    case "turn_end":
      return {
        ...state,
        activePersonaId: null,
        messages: state.messages.map((m) => (m.id === action.messageId ? { ...m, status: "complete" } : m)),
      };
    case "round_end":
      return { ...state, round: action.round + 1 };
    case "done":
      return { ...state, status: "awaitingUser", activePersonaId: null };
    case "error":
      return {
        ...state,
        activePersonaId: null,
        error: action.message,
        messages: settle(state.messages, "error"),
        status: action.recoverable ? "awaitingUser" : "error",
      };
    case "USER_MESSAGE":
      return { ...state, activePersonaId: null, messages: [...settle(state.messages, "complete"), action.message] };
    case "STOP":
      return {
        ...state,
        activePersonaId: null,
        messages: settle(state.messages, "complete"),
        status: state.status === "running" ? "awaitingUser" : state.status,
      };
    case "RETRY_TURN":
      return {
        ...state,
        status: "running",
        error: null,
        messages: state.messages.at(-1)?.status === "error" ? state.messages.slice(0, -1) : state.messages,
      };
    case "RESTORE":
      return restoreState(action.state);
    case "REPORT_REQUESTED":
      return { ...state, status: "reporting" };
    case "REPORT_READY":
      return { ...state, status: "done", report: action.report };
    case "RESET":
      return initialState;
  }
}

/** A saved snapshot can't resume a live stream or request, so it comes back idle and waiting for the user. */
export function restoreState(saved: SimState): SimState {
  const inFlight = saved.status === "running" || saved.status === "reporting" || saved.status === "error";
  return {
    ...saved,
    messages: settle(saved.messages, "complete"),
    activePersonaId: null,
    error: null,
    status: inFlight || (saved.status === "done" && !saved.report) ? "awaitingUser" : saved.status,
  };
}
