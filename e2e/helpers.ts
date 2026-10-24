import { expect, type Page } from "@playwright/test";
import { MOCK_PERSONAS } from "../lib/sim/mock";

export const PITCH = {
  title: "TaskPilot",
  description: "An AI planner that turns messy to-do lists into a realistic daily schedule for busy freelancers.",
};

export const status = (page: Page) => page.getByText(/^(Creating personas…|Discussion in progress…|Waiting for you|Writing report…|Report ready|Something went wrong)$/);
export const log = (page: Page) => page.getByRole("log", { name: "Discussion" });

export async function submitPitch(page: Page) {
  await page.goto("/");
  await page.getByLabel("Product name").fill(PITCH.title);
  await page.getByLabel("Pitch").fill(PITCH.description);
  await page.getByRole("button", { name: "Start simulation" }).click();
  await expect(page).toHaveURL(/\/simulate$/);
}

/** Pitch -> mock discussion finished (6 messages, waiting for the user). */
export async function runToAwaitingUser(page: Page) {
  await submitPitch(page);
  await expect(status(page)).toHaveText("Waiting for you", { timeout: 45_000 });
}

export async function generateReport(page: Page) {
  // On narrow screens the summary lives in its own tab.
  const summaryTab = page.getByRole("tab", { name: "Summary" });
  if (await summaryTab.isVisible()) await summaryTab.click();
  await page.getByRole("button", { name: "Generate report" }).click();
  await expect(status(page)).toHaveText("Report ready", { timeout: 15_000 });
}

export const personaNames = MOCK_PERSONAS.map((p) => p.name);
