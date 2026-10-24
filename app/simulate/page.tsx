"use client";

import { ChatStream } from "@/components/chat/ChatStream";
import { InterjectionInput } from "@/components/chat/InterjectionInput";
import { PersonaPanel } from "@/components/personas/PersonaPanel";
import { SummaryPanel } from "@/components/summary/SummaryPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Client entry boundary. M2 wraps this tree in <SimulationProvider>.
export default function SimulatePage() {
  const chat = (
    <div className="flex flex-col gap-3">
      <ChatStream />
      <InterjectionInput />
    </div>
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <PersonaPanel />

      {/* Desktop: chat + summary side by side */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[1fr_20rem]">
        {chat}
        <SummaryPanel />
      </div>

      {/* Mobile: summary becomes a tab */}
      <Tabs defaultValue="chat" className="lg:hidden">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
        <TabsContent value="chat">{chat}</TabsContent>
        <TabsContent value="summary">
          <SummaryPanel />
        </TabsContent>
      </Tabs>
    </main>
  );
}
