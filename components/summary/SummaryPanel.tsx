"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/summary/ExportMenu";
import { Skeleton } from "@/components/ui/skeleton";
import type { Persona, SimStatus, SimulationReport } from "@/types";

const SENTIMENT = { "-1": "Negative", "0": "Mixed", "1": "Positive" } as const;

function ScoreRing({ score }: { score: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div aria-hidden className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="stroke-white/8" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, Math.max(0, score)) / 100)}
          className="stroke-primary"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-medium tabular-nums">{score}</span>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="rounded-lg bg-background px-3 py-2 text-sm ring-1 ring-white/6">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SummaryPanel({
  report,
  status,
  personas,
  title,
  onGenerate,
}: {
  report: SimulationReport | null;
  status: SimStatus;
  personas: Persona[];
  title: string;
  onGenerate: () => void;
}) {
  const headingRef = useRef<HTMLParagraphElement>(null);
  const prevStatus = useRef(status);
  // Move focus to the verdict when a report has just been generated (not when one is restored).
  useEffect(() => {
    if (status === "done" && prevStatus.current === "reporting") headingRef.current?.focus();
    prevStatus.current = status;
  }, [status]);

  return (
    <section className="flex flex-col gap-6 p-5">
      <h2 className="flex items-center justify-between gap-2 text-sm font-medium">
        Summary
        {report?.source === "mock" && <Badge variant="secondary">Demo data</Badge>}
      </h2>
      <div className="flex flex-col gap-6">
        {report ? (
          <>
            <div className="flex items-center gap-4">
              <ScoreRing score={report.overallScore} />
              <div>
                <p ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight capitalize outline-none">
                  {report.verdict}
                </p>
                <p className="text-sm text-muted-foreground tabular-nums">Score {report.overallScore}/100</p>
              </div>
            </div>
            <ul className="flex flex-col gap-2">
              {report.perPersona.map((r) => (
                <li key={r.personaId} className="rounded-lg bg-background px-3 py-2.5 text-sm ring-1 ring-white/6">
                  <p className="font-medium">
                    {personas.find((p) => p.id === r.personaId)?.name ?? r.personaId}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {SENTIMENT[String(r.sentiment) as keyof typeof SENTIMENT]} · {r.wouldPay ? "would pay" : "wouldn't pay"}
                    </span>
                  </p>
                  <p className="mt-1 text-muted-foreground italic">“{r.keyQuote}”</p>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1.5">
              {report.themes.map((t) => (
                <Badge key={t.label} variant="outline" className="h-6 gap-1.5 px-2.5">
                  <span aria-hidden className={t.type === "concern" ? "size-1.5 rounded-full bg-destructive" : "size-1.5 rounded-full bg-primary"} />
                  {t.label} ×{t.mentions}
                </Badge>
              ))}
            </div>
            <ExportMenu report={report} personas={personas} title={title} />
            <List title="Risks" items={report.risks} />
            <List title="Suggested experiments" items={report.suggestedExperiments} />
            <List title="Open questions" items={report.openQuestions} />
          </>
        ) : status === "reporting" ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {status === "awaitingUser"
                ? "Happy with the discussion? Generate the report."
                : "The report is available once the discussion finishes."}
            </p>
            <Button onClick={onGenerate} disabled={status !== "awaitingUser"}>
              Generate report
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
