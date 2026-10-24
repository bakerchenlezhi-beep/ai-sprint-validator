import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InterjectionInput() {
  return (
    <form className="flex gap-2">
      <Input placeholder="Jump in with a question…" disabled maxLength={500} />
      <Button type="submit" disabled>
        Send
      </Button>
    </form>
  );
}
