"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Static shell for M1: validation and submit wiring land in M2.
export function PitchForm() {
  return (
    <form className="flex w-full max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Product name</Label>
        <Input id="title" name="title" placeholder="e.g. TaskPilot" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Pitch</Label>
        <Textarea
          id="description"
          name="description"
          rows={6}
          placeholder="What does it do, and why would someone care? (20–2000 characters)"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="targetAudience">Target audience (optional)</Label>
        <Input id="targetAudience" name="targetAudience" placeholder="e.g. freelance designers" />
      </div>
      <Button type="submit" className="self-start">
        Start simulation
      </Button>
    </form>
  );
}
