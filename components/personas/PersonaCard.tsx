import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Persona } from "@/types";

export function PersonaCard({ persona, active }: { persona: Persona; active: boolean }) {
  return (
    <Card className={cn("transition-shadow", active && "ring-2 ring-primary")}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className={cn("size-8 shrink-0 rounded-full", persona.avatarColor)} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{persona.name}</p>
            <p className="truncate text-xs text-muted-foreground">{persona.archetype}</p>
          </div>
          {active && <Badge className="ml-auto">Speaking</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Goals:</span> {persona.goals.join("; ")}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Frustrations:</span> {persona.frustrations.join("; ")}
        </p>
      </CardContent>
    </Card>
  );
}
