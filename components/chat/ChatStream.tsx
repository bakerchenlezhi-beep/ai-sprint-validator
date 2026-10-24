"use client";

import { useEffect, useRef } from "react";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import type { ChatMessage, Persona } from "@/types";

export function ChatStream({ messages, personas, onRetry }: { messages: ChatMessage[]; personas: Persona[]; onRetry?: () => void }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div role="log" aria-label="Discussion" aria-live="polite" className="h-96 overflow-y-auto rounded-lg border p-4">
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">The conversation will appear here.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <ChatMessageBubble
              key={m.id}
              message={m}
              persona={personas.find((p) => p.id === m.personaId)}
              onRetry={m === messages.at(-1) ? onRetry : undefined}
            />
          ))}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
