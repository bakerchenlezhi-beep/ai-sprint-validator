import { cn } from "@/lib/utils";

export function PersonaAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/8 text-[11px] font-medium text-foreground ring-1 ring-white/10",
        className,
      )}
    >
      {initials}
    </span>
  );
}
