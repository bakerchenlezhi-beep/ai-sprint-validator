"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportMenu } from "@/components/summary/ExportMenu";
import { Skeleton } from "@/components/ui/skeleton";
import type { Persona, SimStatus, SimulationReport } from "@/types";

const SENTIMENT = { "-1": "Negative", "0": "Mixed", "1": "Positive" } as const;

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-medium uppercase text-muted-foreground">{title}</h3>
      <ul className="list-disc space-y-1 pl-4">
        {items.map((item) => (
          <li key={item}>{item}</li>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Summary
          {report?.source === "mock" && <Badge variant="secondary">Demo data</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {report ? (
          <>
            <div>
              <p ref={headingRef} tabIndex={-1} className="text-2xl font-semibold capitalize outline-none">
                {report.verdict}
              </p>
              <p className="text-sm text-muted-foreground">Score {report.overallScore}/100</p>
            </div>
            <ul className="space-y-2">
              {report.perPersona.map((r) => (
                <li key={r.personaId}>
                  <p className="font-medium">
                    {personas.find((p) => p.id === r.personaId)?.name ?? r.personaId}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {SENTIMENT[String(r.sentiment) as keyof typeof SENTIMENT]} · {r.wouldPay ? "would pay" : "wouldn't pay"}
                    </span>
                  </p>
                  <p className="italic text-muted-foreground">“{r.keyQuote}”</p>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1">
              {report.themes.map((t) => (
                <Badge key={t.label} variant={t.type === "concern" ? "destructive" : "secondary"}>
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
      </CardContent>
    </Card>
  );
}
