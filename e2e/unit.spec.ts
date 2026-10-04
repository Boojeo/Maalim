import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: baseURL! }]);
});

test("unit flow: hook -> video with captions -> explanation with chips -> check -> wrap-up", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/learn/wudu");
  await expect(page.getByText("SYNTHETIC hook")).toBeVisible();
  await expect(page.getByText("Step 1 of 5")).toBeVisible();

  await page.getByRole("button", { name: "Next", exact: true }).click();
  const video = page.locator("video");
  await expect(video).toBeVisible();
  expect(await video.locator("track").count()).toBe(2);
  expect(await video.locator("track[default]").getAttribute("srclang")).toBe("en");
  await expect(page.getByText("Clip 1 of 2")).toBeVisible();
  await expect(page.getByText("Video by Synthetic Creator")).toBeVisible();
  await page.screenshot({ path: "design/screens/unit-video.en.png", fullPage: true });
  await page.getByRole("button", { name: "Next clip" }).click();
  await expect(page.getByText("Clip 2 of 2")).toBeVisible();

  await page.getByRole("button", { name: "Next", exact: true }).click();
  // verified passages only: 3 chips, the unverified passage is never shown
  await expect(page.locator("span", { hasText: "The sample procedure has three parts" }).first()).toBeVisible();
  await expect(page.getByText("Every sentence comes from a verified source")).toBeVisible();
  await expect(page.getByText("SYNTHETIC UNVERIFIED")).toHaveCount(0);
  await expect(page.locator("details summary", { hasText: "[1]" }).first()).toBeVisible();
  await page.locator("details summary", { hasText: "[1]" }).first().click();
  await expect(page.getByText("Verbatim source text").first()).toBeVisible();
  await page.screenshot({ path: "design/screens/unit-explanation.en.png", fullPage: true });

  await page.getByRole("button", { name: "Next", exact: true }).click();
  // check: wrong then right
  await page.getByLabel("Part B").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("Not quite")).toBeVisible();
  await expect(page.getByText("part A comes first")).toBeVisible();
  await page.screenshot({ path: "design/screens/unit-check-wrong.en.png", fullPage: true });
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByLabel("Part A").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("That's right.")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("SYNTHETIC misconception and its fix.")).toBeVisible();
  await page.getByRole("button", { name: "Finish unit" }).click();
  await expect(page.getByRole("link", { name: /Next landmark/ })).toBeVisible();

  // progress persisted locally, and the map reflects it
  await page.goto("/");
  await expect(page.locator('a[data-status="done"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("map: prerequisites lock landmarks until done", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[data-status="available"]')).toHaveCount(1);
  await expect(page.locator('a[data-status="locked"]')).toHaveCount(5);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("a locked landmark still opens with a calm 'builds on' note", async ({ page }) => {
  await page.goto("/learn/salah");
  await expect(page.getByText(/This landmark builds on/)).toBeVisible();
});

test("without fixtures' reviewed units, content shows the pending state, never placeholders", async ({ page }) => {
  await page.goto("/learn/shahada");
  await expect(page.getByText("Waiting for review")).toBeVisible();
  await expect(page.getByText("[CONTENT NEEDED")).toHaveCount(0);
});
