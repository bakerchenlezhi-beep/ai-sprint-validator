"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";

export function InterjectionInput({
  disabled,
  maxLength,
  onSend,
}: {
  disabled: boolean;
  maxLength: number;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-xl bg-card p-1.5 ring-1 ring-white/8 transition-shadow duration-150 focus-within:shadow-[0_0_0_3px_oklch(1_0_0/10%)] focus-within:ring-ring"
    >
      <Input
        className="border-0 bg-transparent focus-visible:shadow-none! focus-visible:outline-none!"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Jump in with a question…"
        disabled={disabled}
        maxLength={maxLength}
        aria-label="Message to the personas"
      />
      <Button type="submit" disabled={disabled || !text.trim()}>
        Send
        <Kbd aria-hidden="true" className="border-white/20 bg-white/15 text-primary-foreground">
          ↵
        </Kbd>
      </Button>
    </form>
  );
}
