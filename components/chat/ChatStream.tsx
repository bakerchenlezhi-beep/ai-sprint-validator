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
    <div role="log" aria-label="Discussion" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
      {messages.length === 0 ? (
        <p className="mx-auto max-w-3xl text-sm text-muted-foreground">The conversation will appear here.</p>
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
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
