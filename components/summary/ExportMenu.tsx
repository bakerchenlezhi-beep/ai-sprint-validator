"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reportToJson, reportToMarkdown } from "@/lib/export";
import type { Persona, SimulationReport } from "@/types";

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportMenu({ report, personas, title }: { report: SimulationReport; personas: Persona[]; title: string }) {
  const markdown = () => reportToMarkdown(report, personas, title);
  return (
    <div className="inline-flex w-fit gap-0.5 rounded-lg bg-background p-0.5 ring-1 ring-white/8" role="group" aria-label="Export report">
      <Button variant="ghost" size="sm" onClick={() => download("report.md", markdown(), "text/markdown")}>
        Markdown
      </Button>
      <Button variant="ghost" size="sm" onClick={() => download("report.json", reportToJson(report), "application/json")}>
        JSON
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          navigator.clipboard.writeText(markdown()).then(
            () => toast.success("Report copied"),
            () => toast.error("Could not copy to the clipboard"),
          )
        }
      >
        Copy
      </Button>
    </div>
  );
}
