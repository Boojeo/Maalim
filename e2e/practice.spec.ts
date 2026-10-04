import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: baseURL! }]);
});

test("review queue gates approval; approved items (and only those) appear in practice", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  // 1. practice shows only the approved + verified fixture items (2); draft and unverified-source are hidden
  await page.goto("/practise");
  await expect(page.getByText("Item 1 of 2")).toBeVisible();
  await expect(page.getByText("SYNTHETIC draft")).toHaveCount(0);
  await expect(page.getByText("must never be shown")).toHaveCount(0);

  // 2. the review queue: an item failing the auto-check cannot be approved (UI disabled and API 422)
  await page.goto("/admin/review");
  await expect(page.getByText("Enter the access token to continue.")).toBeVisible(); // closed without a token
  await page.getByLabel("Access token").fill("wrong-token");
  await page.getByRole("button", { name: "Open" }).click();
  await expect(page.getByText("Enter the access token to continue.")).toBeVisible();
  await page.getByLabel("Access token").fill("e2e-admin-token");
  await page.getByRole("button", { name: "Open" }).click();
  const rows = page.getByTestId("review-row");
  await expect(rows).toHaveCount(2);
  const bad = rows.filter({ hasText: "SYNTHETIC draft item that must not be shown" });
  await expect(bad.getByText("Cannot be approved yet")).toBeVisible();
  await expect(bad.getByRole("button", { name: "Approve" })).toBeDisabled();
  const forced = await request.post("/api/admin/review", { headers: { "x-admin-token": "e2e-admin-token" }, data: { id: "item-syn-draft", decision: "approved", reviewer: "Tester" } });
  expect(forced.status()).toBe(422);

  // 3. a valid draft needs a reviewer name, then approval makes it appear in practice
  const good = rows.filter({ hasText: "which part comes second" });
  await expect(good.getByText("All checks passed")).toBeVisible();
  await good.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Enter your name before deciding.")).toBeVisible();
  await page.getByLabel("Reviewer name").fill("Test Reviewer");
  await good.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
  await expect(page.getByTestId("review-row")).toHaveCount(1);
  await page.screenshot({ path: "design/screens/admin-review.en.png", fullPage: true });

  await page.goto("/practise");
  await expect(page.getByText("Item 1 of 3")).toBeVisible();

  expect(errors).toEqual([]);
});

test("practice: wrong answer shows the source span; ordering item; completion screen", async ({ page }) => {
  await page.goto("/practise");
  // item 1: mcq
  await page.getByLabel("Part B").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("Not quite")).toBeVisible();
  await expect(page.getByText("part A comes first").first()).toBeVisible();
  await page.screenshot({ path: "design/screens/practice-wrong.en.png", fullPage: true });
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByLabel("Part A").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("That's right.")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // item 2: ordering via move buttons
  const target = ["Part A", "Part B", "Part C"];
  for (let i = 0; i < target.length; i++) {
    for (let guard = 0; guard < 5; guard++) {
      const texts = await page.locator("ol li span.flex-1").allTextContents();
      const idx = texts.indexOf(target[i]);
      if (idx <= i) break;
      await page.getByRole("button", { name: "Move up" }).nth(idx).click();
    }
  }
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("That's right.")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // item 3 (approved in the previous test) then completion
  await page.getByLabel("Part B").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Practice complete")).toBeVisible();
});

test("admin and practice APIs", async ({ request }) => {
  expect((await request.get("/api/admin/review")).status()).toBe(401);
  const practice = await (await request.get("/api/practice?conceptId=wudu&lang=en")).json();
  expect(practice.items.every((i: { status: string }) => i.status === "approved")).toBe(true);
  expect((await request.get("/api/practice?lang=fr")).status()).toBe(400);
});
