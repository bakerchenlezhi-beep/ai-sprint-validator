"use client";

import { useEffect, useRef } from "react";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import type { ChatMessage, Persona } from "@/types";

export function ChatStream({ messages, personas }: { messages: ChatMessage[]; personas: Persona[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div className="h-96 overflow-y-auto rounded-lg border p-4">
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">The conversation will appear here.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <ChatMessageBubble key={m.id} message={m} persona={personas.find((p) => p.id === m.personaId)} />
          ))}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
