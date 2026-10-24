import { expect, test, type Page } from "@playwright/test";
import { encodeEvent } from "../lib/sim/sse";
import { generateReport, runToAwaitingUser, submitPitch } from "./helpers";

const shot = (page: Page, name: string) => expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });

test("landing", async ({ page }) => {
  await page.goto("/");
  await shot(page, "landing");
});

test("landing with validation errors", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start simulation" }).click();
  await expect(page.locator("p.text-destructive").first()).toBeVisible();
  await shot(page, "landing-errors");
});

test("simulate without a pitch", async ({ page }) => {
  await page.goto("/simulate");
  await expect(page.getByText("No pitch yet.")).toBeVisible();
  await shot(page, "simulate-empty");
});

test("awaiting user", async ({ page }) => {
  await runToAwaitingUser(page);
  await shot(page, "awaiting-user");
});

test("report ready", async ({ page }) => {
  await runToAwaitingUser(page);
  await generateReport(page);
  await shot(page, "report");
});

test("failed bubble", async ({ page }) => {
  await page.route("**/api/simulate", (route) => {
    const body = [
      { type: "turn_start", personaId: "p1", round: 0, messageId: "m-0-0" },
      { type: "token", messageId: "m-0-0", delta: "Half a sent" },
      { type: "error", message: "upstream hiccup", recoverable: true },
    ] as const;
    return route.fulfill({ status: 200, contentType: "text/event-stream", body: body.map(encodeEvent).join("") });
  });
  await submitPitch(page);
  await expect(page.getByText("This reply failed.")).toBeVisible({ timeout: 15_000 });
  await shot(page, "failed-bubble");
});
