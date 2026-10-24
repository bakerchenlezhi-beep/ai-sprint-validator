"use client";

import { createContext, useCallback, useEffect, useReducer, useRef, type ReactNode } from "react";
import { initialState, simReducer, type SimState } from "@/lib/sim/reducer";
import { readSseEvents } from "@/lib/sim/sse";
import type { ChatMessage, ProductPitch, SimulationReport } from "@/types";

export const PITCH_STORAGE_KEY = "sprint-validator:pitch";
export const MAX_MESSAGES = 40;
export const MAX_INTERJECTION_LENGTH = 500;

export interface SimulationApi {
  state: SimState;
  canInterject: boolean;
  interject: (text: string) => void;
  stop: () => void;
  generateReport: () => void;
}

async function postJson(url: string, body: unknown, signal: AbortSignal): Promise<Response> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? `Request failed (${res.status})`);
  }
  return res;
}

export const SimulationContext = createContext<SimulationApi | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(simReducer, initialState);
  const stateRef = useRef(state);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    stateRef.current = state;
  });

  /** Aborts whatever is in flight and returns a fresh signal for the next operation. */
  const nextSignal = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const runStream = useCallback(
    async (mode: "start" | "respond", pitch: ProductPitch, personas: SimState["personas"], messages: ChatMessage[], round: number, signal: AbortSignal) => {
      dispatch({ type: "SIM_STARTED" });
      try {
        const res = await postJson("/api/simulate", { pitch, personas, messages, mode, round }, signal);
        for await (const event of readSseEvents(res.body!)) {
          if (signal.aborted) return;
          dispatch(event);
        }
      } catch (err) {
        if (!signal.aborted) dispatch({ type: "error", message: err instanceof Error ? err.message : "Stream failed", recoverable: false });
      }
    },
    [],
  );

  useEffect(() => {
    let pitch: ProductPitch | null = null;
    try {
      const raw = sessionStorage.getItem(PITCH_STORAGE_KEY);
      pitch = raw ? (JSON.parse(raw) as ProductPitch) : null;
    } catch {
      pitch = null;
    }
    if (!pitch) return;

    const signal = nextSignal();
    dispatch({ type: "PITCH_SUBMITTED", pitch });
    (async () => {
      try {
        const res = await postJson("/api/personas", { pitch }, signal);
        const { personas } = (await res.json()) as { personas: SimState["personas"] };
        if (signal.aborted) return;
        dispatch({ type: "PERSONAS_READY", personas });
        await runStream("start", pitch, personas, [], 0, signal);
      } catch (err) {
        if (!signal.aborted) dispatch({ type: "error", message: err instanceof Error ? err.message : "Could not generate personas", recoverable: false });
      }
    })();
    return () => abortRef.current?.abort();
  }, [nextSignal, runStream]);

  const interject = useCallback(
    (text: string) => {
      const { pitch, personas, messages, round } = stateRef.current;
      const content = text.trim().slice(0, MAX_INTERJECTION_LENGTH);
      if (!pitch || !content) return;
      const signal = nextSignal();
      const message: ChatMessage = { id: `u-${messages.length}`, role: "user", content, round, status: "complete", createdAt: Date.now() };
      dispatch({ type: "USER_MESSAGE", message });
      const settled = messages.map((m): ChatMessage => (m.status === "streaming" ? { ...m, status: "complete" } : m));
      void runStream("respond", pitch, personas, [...settled, message], round, signal);
    },
    [nextSignal, runStream],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "STOP" });
  }, []);

  const generateReport = useCallback(() => {
    const signal = nextSignal();
    dispatch({ type: "REPORT_REQUESTED" });
    const { pitch, personas, messages } = stateRef.current;
    const settled = messages.map((m): ChatMessage => (m.status === "streaming" ? { ...m, status: "complete" } : m));
    postJson("/api/report", { pitch, personas, messages: settled }, signal)
      .then((res) => res.json() as Promise<{ report: SimulationReport }>)
      .then(({ report }) => {
        if (!signal.aborted) dispatch({ type: "REPORT_READY", report });
      })
      .catch((err) => {
        if (!signal.aborted) dispatch({ type: "error", message: err instanceof Error ? err.message : "Report failed", recoverable: true });
      });
  }, [nextSignal]);

  const canInterject =
    (state.status === "running" || state.status === "awaitingUser") && state.messages.length < MAX_MESSAGES;

  return (
    <SimulationContext.Provider value={{ state, canInterject, interject, stop, generateReport }}>
      {children}
    </SimulationContext.Provider>
  );
}
