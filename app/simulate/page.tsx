"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { Logo } from "@/components/brand/Logo";
import { ChatStream } from "@/components/chat/ChatStream";
import { InterjectionInput } from "@/components/chat/InterjectionInput";
import { PersonaPanel } from "@/components/personas/PersonaPanel";
import { MAX_INTERJECTION_LENGTH, SimulationProvider } from "@/components/simulation/SimulationProvider";
import { useSimulation } from "@/components/simulation/useSimulation";
import { SummaryPanel } from "@/components/summary/SummaryPanel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_LABEL = {
  idle: "Idle",
  generatingPersonas: "Creating personas…",
  running: "Discussion in progress…",
  awaitingUser: "Waiting for you",
  reporting: "Writing report…",
  done: "Report ready",
  error: "Something went wrong",
} as const;

const STATUS_DOT = {
  idle: "bg-muted-foreground",
  generatingPersonas: "bg-primary animate-pulse",
  running: "bg-primary animate-pulse",
  awaitingUser: "bg-foreground",
  reporting: "bg-primary animate-pulse",
  done: "bg-foreground",
  error: "bg-destructive",
} as const;

const DESKTOP_QUERY = "(min-width: 1024px)";

// Mount chat/summary once (not once per layout), so there is a single input and a single live region.
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
}

function Workspace() {
  const { state, canInterject, canRetry, interject, stop, retry, generateReport } = useSimulation();
  const isDesktop = useIsDesktop();

  const running = state.status === "running";
  useEffect(() => {
    if (!running) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && stop();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [running, stop]);

  if (!state.pitch) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 p-6">
        <p className="text-muted-foreground">No pitch yet.</p>
        <Link href="/" className={buttonVariants()}>
          Start with a pitch
        </Link>
      </main>
    );
  }

  const chat = (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatStream messages={state.messages} personas={state.personas} onRetry={canRetry ? retry : undefined} />
      <div className="border-t border-white/8 p-4">
        <InterjectionInput disabled={!canInterject} maxLength={MAX_INTERJECTION_LENGTH} onSend={interject} />
      </div>
    </div>
  );
  const summary = (
    <SummaryPanel report={state.report} status={state.status} personas={state.personas} title={state.pitch.title} onGenerate={generateReport} />
  );

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/8 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Critiq home" className="focus-ring rounded-md">
          <Logo className="w-14" />
        </Link>
        <span aria-hidden className="h-4 w-px bg-white/10" />
        <h1 className="min-w-0 truncate text-sm font-medium">{state.pitch.title}</h1>
        <p
          className="flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-white/8"
          aria-live="polite"
        >
          <span aria-hidden className={`size-1.5 rounded-full ${STATUS_DOT[state.status]}`} />
          {STATUS_LABEL[state.status]}
        </p>
        <div className="ml-auto flex gap-2">
          {running && (
            <Button variant="outline" size="sm" onClick={stop}>
              Stop
              <Kbd aria-hidden="true" className="h-4 min-w-4 text-[10px]">
                Esc
              </Kbd>
            </Button>
          )}
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            New pitch
          </Link>
        </div>
      </header>

      {state.error && <p className="px-6 pt-3 text-sm text-destructive">{state.error}</p>}

      {isDesktop ? (
        // Desktop: persona rail | chat | summary
        <div className="flex min-h-0 flex-1">
          <aside className="w-72 shrink-0 overflow-y-auto border-r border-white/8 p-5">
            <PersonaPanel personas={state.personas} activePersonaId={state.activePersonaId} />
          </aside>
          <main className="flex min-w-0 flex-1 flex-col">{chat}</main>
          <aside className="w-88 shrink-0 overflow-y-auto border-l border-white/8">{summary}</aside>
        </div>
      ) : (
        // Mobile: personas become a chip strip, summary becomes a tab
        <main className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <PersonaPanel personas={state.personas} activePersonaId={state.activePersonaId} />
          <Tabs defaultValue="chat" className="min-h-0 flex-1">
            <TabsList className="shrink-0">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex min-h-0 flex-col">
              {chat}
            </TabsContent>
            <TabsContent value="summary" className="min-h-0 overflow-y-auto">
              {summary}
            </TabsContent>
          </Tabs>
        </main>
      )}
    </div>
  );
}

// Client entry boundary: owns the simulation state for the whole workspace.
export default function SimulatePage() {
  return (
    <SimulationProvider>
      <Workspace />
    </SimulationProvider>
  );
}
