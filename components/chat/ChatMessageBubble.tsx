import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage, Persona } from "@/types";

export function ChatMessageBubble({ message, persona, onRetry }: { message: ChatMessage; persona?: Persona; onRetry?: () => void }) {
  const isUser = message.role === "user";
  const name = isUser ? "You" : (persona?.name ?? "System");
  return (
    <div className={cn("animate-fade-in-up flex gap-3", isUser && "flex-row-reverse")}>
      {!isUser && <PersonaAvatar name={name} className="mt-0.5" />}
      <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-1", isUser && "items-end")}>
        <div className={cn("flex items-baseline gap-2", isUser && "flex-row-reverse")}>
          <p className="text-xs font-medium text-foreground">{name}</p>
          {!isUser && (
            <span className="font-mono text-[11px] text-muted-foreground">{message.round === 0 ? "Opening" : `Round ${message.round}`}</span>
          )}
        </div>
        <div className={cn("text-sm leading-relaxed", isUser && "rounded-xl bg-primary px-3.5 py-2 text-primary-foreground")}>
          <p className="whitespace-pre-wrap">
            {message.content}
            {message.status === "streaming" && <span className="ml-0.5 inline-block animate-pulse">▍</span>}
          </p>
        </div>
        {message.status === "error" && (
          <p className="flex items-center gap-2 text-xs text-destructive">
            This reply failed.
            {onRetry && (
              <Button variant="outline" size="xs" onClick={onRetry}>
                Retry
              </Button>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
