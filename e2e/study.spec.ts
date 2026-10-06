import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: baseURL! }]);
});

// Answers every question of a quiz without showing feedback (the test must not teach).
async function runQuiz(page: Page) {
  for (let guard = 0; guard < 6; guard++) {
    if (!(await page.getByText(/^Question \d+ of \d+$/).isVisible().catch(() => false))) return;
    const radios = page.getByRole("radio");
    if ((await radios.count()) > 0) await radios.first().check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("That's right.")).toHaveCount(0); // quiet mode: no feedback, no source
    await expect(page.getByText("Not quite")).toHaveCount(0);
  }
}

test("study: pre-test, learn (A static / B unit), post-test, anonymous result reaches the mentor table", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/study");
  await expect(page.getByText("anonymous and optional")).toBeVisible();
  await page.getByLabel("Wudu (ablution)").check();
  await page.getByRole("button", { name: "Start" }).click();

  await expect(page.getByRole("heading", { name: "First, a few questions" })).toBeVisible();
  await runQuiz(page);

  await expect(page.getByRole("heading", { name: "Now learn the topic" })).toBeVisible();
  const group = (await page.getByRole("link", { name: "Open the unit" }).count()) > 0 ? "B" : "A";
  if (group === "A") await expect(page.getByText("SYNTHETIC TEST PASSAGE ONE")).toBeVisible();
  await page.screenshot({ path: "design/screens/study-learn.en.png", fullPage: true });
  await page.getByRole("button", { name: "I'm ready for the last questions" }).click();

  await expect(page.getByRole("heading", { name: "Last questions" })).toBeVisible();
  await runQuiz(page);
  await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();

  // exactly one anonymous row, no identifier; the mentor sees counts only (< 3 runs per group are hidden)
  await expect.poll(async () => (await (await request.get("/api/mentor", { headers: { "x-admin-token": "e2e-mentor-token" } })).json()).study.total).toBe(1);
  const mentor = await (await request.get("/api/mentor", { headers: { "x-admin-token": "e2e-mentor-token" } })).json();
  expect(mentor.study.groups.filter((g: { n: number | null }) => g.n === null)).toHaveLength(1); // the group with the single run is hidden, the empty one shows 0
  expect(mentor.study.groups.every((g: { gain: number | null }) => g.gain === null)).toBe(true);
  expect(mentor.study.difference).toBeNull();
  expect(errors).toEqual([]);
});

test("mentor dashboard shows the charts, tables and study limits", async ({ page }) => {
  await page.goto("/mentor");
  await page.getByLabel("Access token").fill("e2e-mentor-token");
  await page.getByRole("button", { name: "Open" }).click();
  await expect(page.getByTestId("charts")).toBeVisible();
  await expect(page.getByTestId("study-table")).toBeVisible();
  await expect(page.getByText("Small sample and self-selected volunteers")).toBeVisible();
  await page.screenshot({ path: "design/screens/mentor-charts.en.png", fullPage: true });
});
