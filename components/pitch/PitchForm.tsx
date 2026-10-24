"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PITCH_STORAGE_KEY } from "@/components/simulation/SimulationProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { pitchInputSchema } from "@/lib/validation";
import type { ProductPitch } from "@/types";

type FieldErrors = Partial<Record<"title" | "description" | "targetAudience" | "stage", string>>;

export function PitchForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});

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
    <form onSubmit={onSubmit} noValidate className="flex w-full max-w-xl flex-col gap-4">
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
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="targetAudience">Target audience (optional)</Label>
        <Input id="targetAudience" name="targetAudience" placeholder="e.g. freelance designers" aria-invalid={!!errors.targetAudience} />
        {errors.targetAudience && <p className="text-sm text-destructive">{errors.targetAudience}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="stage">Stage (optional)</Label>
        <select
          id="stage"
          name="stage"
          defaultValue=""
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
        >
          <option value="">Not sure</option>
          <option value="idea">Idea</option>
          <option value="prototype">Prototype</option>
          <option value="launched">Launched</option>
        </select>
      </div>
      <Button type="submit" className="self-start">
        Start simulation
      </Button>
    </form>
  );
}
