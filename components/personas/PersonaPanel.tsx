import { PersonaCard } from "@/components/personas/PersonaCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Persona } from "@/types";

export function PersonaPanel({ personas, activePersonaId }: { personas: Persona[]; activePersonaId: string | null }) {
  return (
    <div className="flex shrink-0 gap-3 overflow-x-auto lg:flex-col lg:overflow-visible">
      {personas.length === 0
        ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-56 shrink-0 rounded-lg lg:h-24 lg:w-auto" />)
        : personas.map((p) => <PersonaCard key={p.id} persona={p} active={p.id === activePersonaId} />)}
    </div>
  );
}
