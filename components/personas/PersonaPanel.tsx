import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Static placeholders for M1; real personas come from /api/personas or mock data in M2/M3.
const PLACEHOLDERS = ["Persona 1", "Persona 2", "Persona 3"];

export function PersonaPanel() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {PLACEHOLDERS.map((label) => (
        <Card key={label}>
          <CardContent className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{label}</span>
            <Badge variant="outline">Waiting</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
