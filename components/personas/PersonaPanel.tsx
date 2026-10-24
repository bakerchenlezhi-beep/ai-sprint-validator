import { PersonaCard } from "@/components/personas/PersonaCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Persona } from "@/types";

export function PersonaPanel({ personas, activePersonaId }: { personas: Persona[]; activePersonaId: string | null }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {personas.length === 0
        ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        : personas.map((p) => <PersonaCard key={p.id} persona={p} active={p.id === activePersonaId} />)}
    </div>
  );
}
