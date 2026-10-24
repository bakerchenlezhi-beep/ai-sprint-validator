import type { Persona, SimulationReport } from "@/types";

const SENTIMENT = { "-1": "Negative", "0": "Mixed", "1": "Positive" } as const;

function list(title: string, items: string[]): string[] {
  return [`### ${title}`, "", ...items.map((i) => `- ${i}`), ""];
}

/** Mirrors the on-screen SummaryPanel, section for section. */
export function reportToMarkdown(report: SimulationReport, personas: Persona[], title: string): string {
  const name = (id: string) => personas.find((p) => p.id === id)?.name ?? id;
  return [
    `# ${title}`,
    "",
    ...(report.source === "mock" ? ["_Demo data_", ""] : []),
    `**Verdict:** ${report.verdict} · **Score:** ${report.overallScore}/100`,
    "",
    "### Personas",
    "",
    ...report.perPersona.map(
      (r) => `- **${name(r.personaId)}** · ${SENTIMENT[String(r.sentiment) as keyof typeof SENTIMENT]} · ${r.wouldPay ? "would pay" : "wouldn't pay"}: “${r.keyQuote}”`,
    ),
    "",
    "### Themes",
    "",
    ...report.themes.map((t) => `- ${t.label} ×${t.mentions} (${t.type})`),
    "",
    ...list("Risks", report.risks),
    ...list("Suggested experiments", report.suggestedExperiments),
    ...list("Open questions", report.openQuestions),
  ].join("\n");
}

export function reportToJson(report: SimulationReport): string {
  return JSON.stringify(report, null, 2);
}
