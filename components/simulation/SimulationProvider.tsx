"use client";

import { createContext, useCallback, useEffect, useReducer, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { initialState, simReducer, type SimState } from "@/lib/sim/reducer";
import { readSseEvents } from "@/lib/sim/sse";
import type { ChatMessage, ProductPitch, SimulationReport } from "@/types";

export const PITCH_STORAGE_KEY = "sprint-validator:pitch";
const SNAPSHOT_STORAGE_KEY = "sprint-validator:snapshot";
const FALLBACK_MESSAGE = "Couldn't reach the AI model, so this is demo data.";
export const MAX_MESSAGES = 40;
export const MAX_INTERJECTION_LENGTH = 500;

function loadSnapshot(pitchId: string): SimState | null {
  try {
    const saved = JSON.parse(localStorage.getItem(SNAPSHOT_STORAGE_KEY) ?? "null") as SimState | null;
    return saved?.pitch?.id === pitchId && saved.personas?.length === 3 && Array.isArray(saved.messages) ? saved : null;
  } catch {
    return null;
  }
}

export interface SimulationApi {
  state: SimState;
  canInterject: boolean;
  canRetry: boolean;
  interject: (text: string) => void;
  stop: () => void;
  retry: () => void;
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

  // Snapshot between turns (not on every token) so a refresh can resume.
  useEffect(() => {
    if (!state.pitch || state.personas.length === 0 || state.activePersonaId) return;
    try {
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable or full: resume is best-effort.
    }
  }, [state]);

  /** Aborts whatever is in flight and returns a fresh signal for the next operation. */
  const nextSignal = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const runStream = useCallback(
    async (
      mode: "start" | "respond",
      pitch: ProductPitch,
      personas: SimState["personas"],
      messages: ChatMessage[],
      round: number,
      signal: AbortSignal,
      onlyPersonaId?: string,
    ) => {
      dispatch({ type: "SIM_STARTED" });
      try {
        const res = await postJson("/api/simulate", { pitch, personas, messages, mode, round, onlyPersonaId }, signal);
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

    const saved = loadSnapshot(pitch.id);
    if (saved) {
      dispatch({ type: "RESTORE", state: saved });
      return;
    }

    const signal = nextSignal();
    dispatch({ type: "PITCH_SUBMITTED", pitch });
    (async () => {
      try {
        const res = await postJson("/api/personas", { pitch }, signal);
        const { personas, fallback } = (await res.json()) as { personas: SimState["personas"]; fallback: boolean };
        if (signal.aborted) return;
        if (fallback) toast.warning(FALLBACK_MESSAGE);
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

  const retry = useCallback(() => {
    const { pitch, personas, messages } = stateRef.current;
    const failed = messages.at(-1);
    if (!pitch || failed?.status !== "error" || !failed.personaId) return;
    const signal = nextSignal();
    dispatch({ type: "RETRY_TURN" });
    void runStream("respond", pitch, personas, messages.slice(0, -1), failed.round, signal, failed.personaId);
  }, [nextSignal, runStream]);

  const generateReport = useCallback(() => {
    const signal = nextSignal();
    dispatch({ type: "REPORT_REQUESTED" });
    const { pitch, personas, messages } = stateRef.current;
    const settled = messages.map((m): ChatMessage => (m.status === "streaming" ? { ...m, status: "complete" } : m));
    postJson("/api/report", { pitch, personas, messages: settled }, signal)
      .then((res) => res.json() as Promise<{ report: SimulationReport; fallback: boolean }>)
      .then(({ report, fallback }) => {
        if (signal.aborted) return;
        if (fallback) toast.warning(FALLBACK_MESSAGE);
        dispatch({ type: "REPORT_READY", report });
      })
      .catch((err) => {
        if (!signal.aborted) dispatch({ type: "error", message: err instanceof Error ? err.message : "Report failed", recoverable: true });
      });
  }, [nextSignal]);

  const canRetry = state.status === "awaitingUser" && state.messages.at(-1)?.status === "error";
  const canInterject =
    (state.status === "running" || state.status === "awaitingUser") && state.messages.length < MAX_MESSAGES;

  return (
    <SimulationContext.Provider value={{ state, canInterject, canRetry, interject, stop, retry, generateReport }}>
      {children}
    </SimulationContext.Provider>
  );
}
