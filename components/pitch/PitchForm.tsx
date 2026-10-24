"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { PITCH_STORAGE_KEY } from "@/components/simulation/SimulationProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModEnterKbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { pitchInputSchema } from "@/lib/validation";
import type { ProductPitch } from "@/types";

const STAGES = [
  { value: "", label: "Not sure" },
  { value: "idea", label: "Idea" },
  { value: "prototype", label: "Prototype" },
  { value: "launched", label: "Launched" },
] as const;

const MAX_DESCRIPTION = 2000;

type FieldErrors = Partial<Record<"title" | "description" | "targetAudience" | "stage", string>>;

export function PitchForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [stage, setStage] = useState("");
  const [length, setLength] = useState(0);

  const formRef = useRef<HTMLFormElement>(null);

  // Window-level so Cmd/Ctrl+Enter submits wherever focus is on the page.
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onStageKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = STAGES[(index + step + STAGES.length) % STAGES.length];
    setStage(next.value);
    (e.currentTarget.parentElement?.children[STAGES.indexOf(next)] as HTMLElement | undefined)?.focus();
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const parsed = pitchInputSchema.safeParse({
      title: data.get("title"),
      description: data.get("description"),
      targetAudience: data.get("targetAudience") || undefined,
      stage: data.get("stage") || undefined,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    const pitch: ProductPitch = { id: crypto.randomUUID(), ...parsed.data };
    sessionStorage.setItem(PITCH_STORAGE_KEY, JSON.stringify(pitch));
    router.push("/simulate");
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Product name</Label>
        <Input id="title" name="title" placeholder="e.g. TaskPilot" aria-invalid={!!errors.title} />
        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Pitch</Label>
        <Textarea
          id="description"
          name="description"
          rows={6}
          placeholder="What does it do, and why would someone care? (20–2000 characters)"
          aria-invalid={!!errors.description}
          onChange={(e) => setLength(e.target.value.length)}
        />
        <div className="flex items-start justify-between gap-4">
          {errors.description ? <p className="text-sm text-destructive">{errors.description}</p> : <span />}
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {length}/{MAX_DESCRIPTION}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="targetAudience">Target audience (optional)</Label>
        <Input id="targetAudience" name="targetAudience" placeholder="e.g. freelance designers" aria-invalid={!!errors.targetAudience} />
        {errors.targetAudience && <p className="text-sm text-destructive">{errors.targetAudience}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label id="stage-label">Stage (optional)</Label>
        <input type="hidden" name="stage" value={stage} />
        <div role="radiogroup" aria-labelledby="stage-label" className="grid grid-cols-2 gap-1 rounded-lg bg-background p-1 ring-1 ring-white/8 sm:grid-cols-4">
          {STAGES.map((s, i) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={stage === s.value}
              tabIndex={stage === s.value ? 0 : -1}
              onClick={() => setStage(s.value)}
              onKeyDown={(e) => onStageKeyDown(e, i)}
              className="focus-ring h-7 rounded-md text-sm font-medium text-muted-foreground transition-all duration-150 hover:text-foreground active:scale-[0.98] aria-checked:bg-primary aria-checked:text-primary-foreground"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full justify-between sm:w-auto sm:self-end">
        Start simulation
        <ModEnterKbd className="border-white/20 bg-white/15 text-primary-foreground" />
      </Button>
    </form>
  );
}
