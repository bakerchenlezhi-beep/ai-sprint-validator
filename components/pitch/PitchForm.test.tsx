// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PitchForm } from "@/components/pitch/PitchForm";
import { PITCH_STORAGE_KEY } from "@/components/simulation/SimulationProvider";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockClear();
  sessionStorage.clear();
});

describe("PitchForm", () => {
  it("shows field errors and does not navigate on an empty submit", async () => {
    render(<PitchForm />);
    await userEvent.click(screen.getByRole("button", { name: "Start simulation" }));
    expect(screen.getAllByText(/./, { selector: "p.text-destructive" }).length).toBeGreaterThan(0);
    expect(push).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(PITCH_STORAGE_KEY)).toBeNull();
  });

  it("rejects a too-short description", async () => {
    render(<PitchForm />);
    await userEvent.type(screen.getByLabelText("Product name"), "TaskPilot");
    await userEvent.type(screen.getByLabelText("Pitch"), "too short");
    await userEvent.click(screen.getByRole("button", { name: "Start simulation" }));
    expect(screen.getByLabelText("Pitch")).toHaveAttribute("aria-invalid", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("stores the pitch and routes to /simulate when valid", async () => {
    render(<PitchForm />);
    await userEvent.type(screen.getByLabelText("Product name"), "TaskPilot");
    await userEvent.type(screen.getByLabelText("Pitch"), "An AI planner that turns messy to-do lists into a daily schedule.");
    await userEvent.selectOptions(screen.getByLabelText("Stage (optional)"), "prototype");
    await userEvent.click(screen.getByRole("button", { name: "Start simulation" }));

    expect(push).toHaveBeenCalledWith("/simulate");
    const stored = JSON.parse(sessionStorage.getItem(PITCH_STORAGE_KEY) ?? "null");
    expect(stored).toMatchObject({ title: "TaskPilot", stage: "prototype" });
    expect(stored.id).toEqual(expect.any(String));
  });
});
