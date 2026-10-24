import { expect, test } from "@playwright/test";
import { encodeEvent } from "../lib/sim/sse";
import { generateReport, log, PITCH, personaNames, runToAwaitingUser, status, submitPitch } from "./helpers";

test("happy path runs in mock mode: 6 messages, then a Demo data report", async ({ page }) => {
  await runToAwaitingUser(page);
  for (const name of personaNames) await expect(log(page).getByText(name, { exact: true })).toHaveCount(2);
  await generateReport(page);
  // Also proves the empty LLM_API_KEY override beat .env.local: no key means mock mode.
  await expect(page.getByText("Demo data")).toBeVisible();
});

test("interjection gets a reply from all three personas", async ({ page }) => {
  await runToAwaitingUser(page);
  await page.getByLabel("Message to the personas").fill("What would you pay?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(log(page).getByText("What would you pay?")).toBeVisible();
  await expect(status(page)).toHaveText("Waiting for you", { timeout: 30_000 });
  for (const name of personaNames) await expect(log(page).getByText(name, { exact: true })).toHaveCount(3);
});

test("Stop ends a running discussion", async ({ page }) => {
  await submitPitch(page);
  await expect(status(page)).toHaveText("Discussion in progress…", { timeout: 15_000 });
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeHidden();
  await expect(status(page)).not.toHaveText("Discussion in progress…");
});

test("invalid pitch shows errors and stays on the landing page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start simulation" }).click();
  await expect(page.locator("p.text-destructive").first()).toBeVisible();
  await page.getByLabel("Product name").fill("X");
  await page.getByLabel("Pitch").fill("too short");
  await page.getByRole("button", { name: "Start simulation" }).click();
  await expect(page.getByLabel("Pitch")).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/$/);
});

test("direct visit without a pitch shows the empty state", async ({ page }) => {
  await page.goto("/simulate");
  await expect(page.getByText("No pitch yet.")).toBeVisible();
  await page.getByRole("link", { name: "Start with a pitch" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("reload restores the finished discussion from the snapshot", async ({ page }) => {
  await runToAwaitingUser(page);
  await page.reload();
  await expect(status(page)).toHaveText("Waiting for you");
  await expect(log(page).getByText(personaNames[0], { exact: true })).toHaveCount(2);
});

test("export: clipboard and downloads match the on-screen report", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await runToAwaitingUser(page);
  await generateReport(page);
  const verdict = (await page.locator("p.text-2xl").innerText()).trim();

  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.getByText("Report copied")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(`# ${PITCH.title}`);
  expect(copied).toContain(`**Verdict:** ${verdict.toLowerCase()}`);

  const [md] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Markdown" }).click()]);
  expect(md.suggestedFilename()).toBe("report.md");
  const [json] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "JSON" }).click()]);
  expect(json.suggestedFilename()).toBe("report.json");
});

test("mobile: one input in the DOM, Chat/Summary tabs switch", async ({ page }, info) => {
  await runToAwaitingUser(page);
  await expect(page.getByLabel("Message to the personas")).toHaveCount(1);
  if (info.project.name !== "mobile") {
    await expect(page.getByRole("tab")).toHaveCount(0);
    return;
  }
  await page.getByRole("tab", { name: "Summary" }).click();
  await expect(page.getByRole("button", { name: "Generate report" })).toBeVisible();
  await page.getByRole("tab", { name: "Chat" }).click();
  await expect(page.getByLabel("Message to the personas")).toBeVisible();
});

test("a failed stream request surfaces an error", async ({ page }) => {
  await page.route("**/api/simulate", (route) => route.fulfill({ status: 500, json: { error: "boom" } }));
  await submitPitch(page);
  await expect(page.getByText("boom")).toBeVisible();
  await expect(status(page)).toHaveText("Something went wrong");
});

test("a mid-turn error leaves a failed bubble that can be retried", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/simulate", (route) => {
    calls++;
    if (calls > 1) return route.fallback();
    const body = [
      { type: "turn_start", personaId: "p1", round: 0, messageId: "m-0-0" },
      { type: "token", messageId: "m-0-0", delta: "Half a sent" },
      { type: "error", message: "upstream hiccup", recoverable: true },
    ] as const;
    return route.fulfill({ status: 200, contentType: "text/event-stream", body: body.map(encodeEvent).join("") });
  });
  await submitPitch(page);
  await expect(page.getByText("This reply failed.")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("This reply failed.")).toBeHidden({ timeout: 15_000 });
});
