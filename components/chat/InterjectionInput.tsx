"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Jump in with a question…"
        disabled={disabled}
        maxLength={maxLength}
        aria-label="Message to the personas"
      />
      <Button type="submit" disabled={disabled || !text.trim()}>
        Send
      </Button>
    </form>
  );
}
