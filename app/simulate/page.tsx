"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ChatStream } from "@/components/chat/ChatStream";
import { InterjectionInput } from "@/components/chat/InterjectionInput";
import { PersonaPanel } from "@/components/personas/PersonaPanel";
import { MAX_INTERJECTION_LENGTH, SimulationProvider } from "@/components/simulation/SimulationProvider";
import { useSimulation } from "@/components/simulation/useSimulation";
import { SummaryPanel } from "@/components/summary/SummaryPanel";
import { Button, buttonVariants } from "@/components/ui/button";
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
    <div className="flex flex-col gap-3">
      <ChatStream messages={state.messages} personas={state.personas} onRetry={canRetry ? retry : undefined} />
      <InterjectionInput disabled={!canInterject} maxLength={MAX_INTERJECTION_LENGTH} onSend={interject} />
    </div>
  );
  const summary = (
    <SummaryPanel report={state.report} status={state.status} personas={state.personas} title={state.pitch.title} onGenerate={generateReport} />
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{state.pitch.title}</h1>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {STATUS_LABEL[state.status]}
          </p>
        </div>
        <div className="flex gap-2">
          {state.status === "running" && (
            <Button variant="outline" onClick={stop}>
              Stop
            </Button>
          )}
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            New pitch
          </Link>
        </div>
      </header>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <PersonaPanel personas={state.personas} activePersonaId={state.activePersonaId} />

      {isDesktop ? (
        // Desktop: chat + summary side by side
        <div className="grid grid-cols-[1fr_20rem] gap-4">
          {chat}
          {summary}
        </div>
      ) : (
        // Mobile: summary becomes a tab
        <Tabs defaultValue="chat">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
          <TabsContent value="chat">{chat}</TabsContent>
          <TabsContent value="summary">{summary}</TabsContent>
        </Tabs>
      )}
    </main>
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
