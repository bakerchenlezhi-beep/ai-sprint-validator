import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatStream() {
  return (
    <ScrollArea className="h-96 rounded-lg border">
      <p className="p-4 text-sm text-muted-foreground">
        The conversation will appear here.
      </p>
    </ScrollArea>
  );
}
