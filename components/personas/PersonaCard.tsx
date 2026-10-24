import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { cn } from "@/lib/utils";
import type { Persona } from "@/types";

export function PersonaCard({ persona, active }: { persona: Persona; active: boolean }) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-lg px-3 py-2.5 ring-1 transition-all duration-150 lg:shrink",
        active ? "bg-primary/12 ring-primary/50" : "bg-card ring-white/8",
      )}
    >
      <div className="flex items-center gap-2.5">
        <PersonaAvatar name={persona.name} className={cn(active && "bg-primary text-primary-foreground ring-primary")} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{persona.name}</p>
          <p className="truncate text-xs text-muted-foreground">{persona.archetype}</p>
        </div>
        {active && (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-foreground">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-primary" />
            Speaking
          </span>
        )}
      </div>
      <div className="hidden flex-col gap-1.5 lg:flex">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Goals:</span> {persona.goals.join("; ")}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Frustrations:</span> {persona.frustrations.join("; ")}
        </p>
      </div>
    </div>
  );
}
