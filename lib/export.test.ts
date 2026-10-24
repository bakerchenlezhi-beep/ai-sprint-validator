import { describe, expect, it } from "vitest";
import { reportToJson, reportToMarkdown } from "./export";
import { MOCK_PERSONAS, mockReport } from "./sim/mock";

describe("export", () => {
  it("markdown contains every report field", async () => {
    const report = await mockReport(MOCK_PERSONAS);
    const md = reportToMarkdown(report, MOCK_PERSONAS, "TaskPilot");
    expect(md).toContain("# TaskPilot");
    expect(md).toContain(`${report.verdict}`);
    expect(md).toContain(`${report.overallScore}/100`);
    for (const r of report.perPersona) {
      expect(md).toContain(MOCK_PERSONAS.find((p) => p.id === r.personaId)!.name);
      expect(md).toContain(r.keyQuote);
    }
    for (const t of report.themes) expect(md).toContain(`${t.label} ×${t.mentions}`);
    for (const line of [...report.risks, ...report.suggestedExperiments, ...report.openQuestions]) expect(md).toContain(`- ${line}`);
  });

  it("marks mock reports as demo data and llm reports not", async () => {
    const report = await mockReport(MOCK_PERSONAS);
    expect(reportToMarkdown(report, MOCK_PERSONAS, "T")).toContain("_Demo data_");
    expect(reportToMarkdown({ ...report, source: "llm" }, MOCK_PERSONAS, "T")).not.toContain("Demo data");
  });

  it("json round-trips", async () => {
    const report = await mockReport(MOCK_PERSONAS);
    expect(JSON.parse(reportToJson(report))).toEqual(report);
  });
});
