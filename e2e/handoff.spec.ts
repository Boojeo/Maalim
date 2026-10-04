import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: baseURL! }]);
});

test("ask: in-scope question is answered with citations", async ({ page }) => {
  await page.goto("/ask");
  await page.getByLabel("Your question").fill("What are the steps of wudu?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByText("About: Wudu (ablution)")).toBeVisible();
  await expect(page.locator("details summary", { hasText: "[1]" }).first()).toBeVisible();
  await expect(page.getByText("We always answer with sources, never without.")).toBeVisible();
  await page.screenshot({ path: "design/screens/ask-answer.en.png", fullPage: true });
});

test("handoff: preview, identifier refusal, send, then the mentor sees it (anonymously)", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/ask");
  await page.getByLabel("Your question").fill("My wife and I are fighting, should we divorce?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByRole("heading", { name: "This needs a person" })).toBeVisible();
  await expect(page.getByText("We never give personal rulings or fatwas.")).toBeVisible();
  await page.getByRole("button", { name: "Talk to a person" }).click();

  // the learner sees exactly what will be sent, and nothing is stored before pressing Send
  const summary = page.getByLabel("Summary to share");
  await expect(summary).toHaveValue(/Question: My wife and I are fighting/);
  await expect(summary).toHaveValue(/Personal situation \(L4\)/);
  await page.screenshot({ path: "design/screens/handoff-preview.en.png", fullPage: true });
  const before = await (await request.get("/api/mentor", { headers: { "x-admin-token": "e2e-mentor-token" } })).json();
  expect(before.referrals).toHaveLength(0);

  // contact details are refused
  await summary.fill("Please call me on +966 50 123 4567 about my family");
  await page.getByRole("button", { name: "Send to a mentor" }).click();
  await expect(page.getByText("Please remove contact details")).toBeVisible();

  await summary.fill("Topic: not specified\nType: Personal situation (L4)\nQuestion: a family situation I need help with");
  await page.getByRole("button", { name: "Send to a mentor" }).click();
  await expect(page.getByText(/Your reference code is [A-F0-9]{8}/)).toBeVisible();

  // mentor dashboard: closed without a token, then shows the referral with no identifiers
  await page.goto("/mentor");
  await expect(page.getByText("Enter the access token to continue.")).toBeVisible();
  await page.getByLabel("Access token").fill("e2e-mentor-token");
  await page.getByRole("button", { name: "Open" }).click();
  const table = page.getByTestId("referral-table");
  await expect(table.getByText("a family situation I need help with")).toBeVisible();
  await expect(page.getByTestId("agg-level").locator("tr", { hasText: "L4" })).toContainText("<3"); // single referral: count hidden
  await table.getByRole("combobox").selectOption("seen");
  await expect(table.getByRole("combobox")).toHaveValue("seen");
  await page.screenshot({ path: "design/screens/mentor.en.png", fullPage: true });

  const after = await (await request.get("/api/mentor", { headers: { "x-admin-token": "e2e-mentor-token" } })).json();
  expect(Object.keys(after.referrals[0]).sort()).toEqual(["concept_id", "consented_summary", "created_at", "id", "level", "status"]);
  expect((await request.get("/api/mentor")).status()).toBe(401);
  expect(errors).toEqual([]);
});

test("crisis wording gets a supportive, urgent handoff", async ({ page }) => {
  await page.goto("/ask");
  await page.getByLabel("Your question").fill("I feel hopeless and don't want to continue");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You are not alone" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "real person" })).toBeVisible();
});

test("progress stays local; sharing counters is off by default and opt-in", async ({ page }) => {
  const events: string[] = [];
  await page.route("**/api/events", (route) => {
    events.push(route.request().postData() ?? "");
    return route.fulfill({ status: 204 });
  });

  // answer the unit check twice (wrong, then right) with sharing OFF: nothing is sent
  await page.goto("/learn/wudu");
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Part B").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByLabel("Part A").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  expect(events).toEqual([]);

  await page.goto("/me");
  await expect(page.getByText("Nothing is stored about you on our servers.")).toBeVisible();
  await expect(page.getByText("Practice: 50%")).toBeVisible(); // local mastery: 1 of 2 correct
  await page.getByLabel("Exploring").check();
  await expect(page.getByLabel("Exploring")).toBeChecked();
  const share = page.getByLabel("Share anonymous progress counts");
  await expect(share).not.toBeChecked();

  // opt in: only now is a counter sent, and it holds no identifier
  await share.check();
  await page.goto("/learn/wudu");
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Part A").check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect.poll(() => events.length).toBe(1);
  expect(JSON.parse(events[0])).toEqual({ conceptId: "wudu", kind: "check_correct" });
  await page.screenshot({ path: "design/screens/me.en.png", fullPage: true });
});
