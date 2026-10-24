// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SummaryPanel } from "@/components/summary/SummaryPanel";
import { MOCK_PERSONAS, mockReport } from "@/lib/sim/mock";
import type { SimStatus, SimulationReport } from "@/types";

const renderPanel = (report: SimulationReport | null, status: SimStatus, onGenerate = vi.fn()) =>
  render(<SummaryPanel report={report} status={status} personas={MOCK_PERSONAS} title="TaskPilot" onGenerate={onGenerate} />);

describe("SummaryPanel", () => {
  it("disables Generate until the discussion is done", () => {
    renderPanel(null, "running");
    expect(screen.getByRole("button", { name: "Generate report" })).toBeDisabled();
  });

  it("calls onGenerate when awaiting the user", async () => {
    const onGenerate = vi.fn();
    renderPanel(null, "awaitingUser", onGenerate);
    await userEvent.click(screen.getByRole("button", { name: "Generate report" }));
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it("shows a skeleton while reporting", () => {
    const { container } = renderPanel(null, "reporting");
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Generate report" })).not.toBeInTheDocument();
  });

  it("renders the mock report with a Demo data badge and every section", async () => {
    const report = await mockReport(MOCK_PERSONAS);
    renderPanel(report, "done");
    expect(screen.getByText("Demo data")).toBeInTheDocument();
    expect(screen.getByText(report.verdict)).toBeInTheDocument();
    expect(screen.getByText(`Score ${report.overallScore}/100`)).toBeInTheDocument();
    for (const p of MOCK_PERSONAS) expect(screen.getByText(p.name)).toBeInTheDocument();
    for (const item of [...report.risks, ...report.suggestedExperiments, ...report.openQuestions]) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(screen.getByRole("group", { name: "Export report" })).toBeInTheDocument();
  });

  it("hides the Demo data badge for LLM reports", async () => {
    const report = { ...(await mockReport(MOCK_PERSONAS)), source: "llm" as const };
    renderPanel(report, "done");
    expect(screen.queryByText("Demo data")).not.toBeInTheDocument();
  });
});
