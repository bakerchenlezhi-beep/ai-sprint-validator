// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExportMenu } from "@/components/summary/ExportMenu";
import { reportToJson, reportToMarkdown } from "@/lib/export";
import { MOCK_PERSONAS, mockReport } from "@/lib/sim/mock";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

beforeEach(() => {
  vi.clearAllMocks();
});

async function setup() {
  const report = await mockReport(MOCK_PERSONAS);
  const user = userEvent.setup(); // installs a clipboard stub on navigator
  render(<ExportMenu report={report} personas={MOCK_PERSONAS} title="TaskPilot" />);
  return { report, user };
}

describe("ExportMenu", () => {
  it("copies the same markdown the export produces", async () => {
    const { report, user } = await setup();
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(await navigator.clipboard.readText()).toBe(reportToMarkdown(report, MOCK_PERSONAS, "TaskPilot"));
    expect(toast.success).toHaveBeenCalledWith("Report copied");
  });

  it("reports a clipboard failure", async () => {
    const { user } = await setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(toast.error).toHaveBeenCalledWith("Could not copy to the clipboard");
  });

  it.each([
    ["Markdown", "report.md", "text/markdown"],
    ["JSON", "report.json", "application/json"],
  ])("downloads %s as %s", async (label, filename, type) => {
    const { report, user } = await setup();
    const createObjectURL = vi.fn(() => "blob:test");
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe(filename);
    });

    await user.click(screen.getByRole("button", { name: label }));

    expect(click).toHaveBeenCalledOnce();
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toBe(type);
    expect(await blob.text()).toBe(label === "JSON" ? reportToJson(report) : reportToMarkdown(report, MOCK_PERSONAS, "TaskPilot"));
  });
});
