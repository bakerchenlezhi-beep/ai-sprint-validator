import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage, Persona } from "@/types";

export function ChatMessageBubble({ message, persona, onRetry }: { message: ChatMessage; persona?: Persona; onRetry?: () => void }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      {!isUser && <span aria-hidden className={cn("mt-1 size-6 shrink-0 rounded-full", persona?.avatarColor ?? "bg-muted")} />}
      <div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-sm", isUser ? "bg-primary text-primary-foreground" : "bg-muted")}>
        <p className="mb-0.5 text-xs font-medium opacity-70">{isUser ? "You" : (persona?.name ?? "System")}</p>
        <p className="whitespace-pre-wrap">
          {message.content}
          {message.status === "streaming" && <span className="ml-0.5 inline-block animate-pulse">▍</span>}
        </p>
        {message.status === "error" && (
          <p className="mt-1 flex items-center gap-2 text-xs text-destructive">
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
