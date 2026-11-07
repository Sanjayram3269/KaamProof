import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("business dashboard uses real records, filters, drilldowns and responsive navigation", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Sanjay Ram");
  await page
    .getByLabel("Email address")
    .fill("dashboard-" + Date.now() + "@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Dashboard-password-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your business, in focus." }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("kpi-total")).toHaveText("0");
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: "test-results/dashboard-empty-" + width + ".png",
      fullPage: true,
    });
  }
  const origin = new URL(page.url()).origin;
  const csrf = (await context.cookies()).find(
    (c) => c.name === "kp_csrf",
  )!.value;
  const post = async (
    path: string,
    data: Record<string, unknown> = {},
    token?: string,
  ) => {
    const response = await page.request.post("/api/v1" + path, {
      data,
      headers: {
        Origin: origin,
        "X-CSRF-Token": csrf,
        ...(token ? { "X-Customer-Token": token } : {}),
      },
    });
    expect(response.ok(), path + ": " + (await response.text())).toBe(true);
    return response.json();
  };
  const customers = [];
  for (const name of [
    "Priya Sharma",
    "Arjun Mehta",
    "Nisha Rao",
    "Aditi Desai",
  ])
    customers.push(await post("/customers", { name, phone: "+919888888888" }));
  const now = Math.floor(Date.now() / 1000);
  const fixtures: [string, string, string, string, number][] = [
    ["Kitchen cabinet restoration", "in_progress", "32500", "12500", 1],
    ["Studio electrical upgrades", "completed", "18750", "18750", 8],
    ["Bathroom plumbing", "awaiting_approval", "9800", "0", 0],
    ["Living room repaint", "draft", "0", "0", 0],
    ["Balcony waterproofing", "completion_pending", "26000", "10000", 15],
    ["Storefront signage", "approved", "15400", "0", 0],
    ["Utility room tiling", "disputed", "14200", "5000", 35],
    ["Home office renovation", "completed", "42000", "24000", 65],
    ["Remote design consultation", "in_progress", "200", "50", 2],
  ];
  for (const [
    index,
    [title, state, amount, payment, ago],
  ] of fixtures.entries()) {
    const job = await post("/jobs", {
      title,
      customer_id: customers[index % 4].id,
      description: "Scope, decisions and progress recorded together.",
      category: index % 2 ? "Renovation" : "Maintenance",
      location: "Bengaluru",
    });
    if (state === "draft") continue;
    const agreement = await post("/jobs/" + job.id + "/agreements", {
      scope:
        "Complete the documented scope and review the work with the customer.",
      labour: amount,
      materials: "0",
      other: "0",
      tax: "0",
      currency: index === 8 ? "USD" : "INR",
      valid_until: now + 10 * 86400,
    });
    if (state === "awaiting_approval") continue;
    const link = await post("/jobs/" + job.id + "/links", { days: 7 });
    await post(
      "/portal/decision",
      { agreement_id: agreement.id, decision: "approved" },
      link.token,
    );
    if (state === "approved") continue;
    await post("/jobs/" + job.id + "/start");
    if (payment !== "0")
      await post("/jobs/" + job.id + "/payments", {
        amount: payment,
        method: "upi",
        paid_at: now - ago * 86400,
        idempotency_key: "dashboard-payment-" + job.id,
      });
    if (["completion_pending", "completed", "disputed"].includes(state)) {
      await post("/jobs/" + job.id + "/completion", {
        notes: "Work completed and submitted for customer review.",
      });
      if (state !== "completion_pending")
        await post(
          "/portal/completion",
          {
            completion_number: 1,
            decision: state === "completed" ? "acknowledged" : "disputed",
            notes: state === "disputed" ? "Please review the finishing." : "",
          },
          link.token,
        );
    }
  }
  await page.goto("/app");
  await expect(page.getByTestId("kpi-total")).toHaveText("9");
  await expect(page.getByTestId("kpi-active")).toHaveText("5");
  await expect(page.getByTestId("kpi-completed")).toHaveText("2");
  await expect(page.getByTestId("kpi-approvals")).toHaveText("2");
  await expect(page.getByTestId("kpi-collected")).toHaveText("₹70,250.00");
  await expect(page.getByTestId("kpi-outstanding")).toHaveText("₹78,600.00");
  await expect(
    page.getByRole("heading", {
      name: "A little setup. A stronger way to work.",
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "7 days", exact: true }).click();
  await expect(page.getByTestId("period-revenue")).toHaveText("₹12,500.00");
  await page.getByRole("button", { name: "30 days", exact: true }).click();
  await expect(page.getByTestId("period-revenue")).toHaveText("₹41,250.00");
  await page.getByRole("button", { name: "12 months", exact: true }).click();
  await expect(page.getByTestId("period-revenue")).toHaveText("₹70,250.00");
  await page.getByLabel("Currency", { exact: true }).selectOption("USD");
  await expect(page.getByTestId("period-revenue")).toHaveText("$50.00");
  await expect(page.getByTestId("kpi-outstanding")).toHaveText("$150.00");
  await page.getByTestId("kpi-collected").click();
  await expect(page.getByLabel("Currency", { exact: true })).toHaveValue("USD");
  await expect(page.getByTestId("period-revenue")).toHaveText("$50.00");
  await page.getByTestId("outstanding-balance").click();
  await expect(page).toHaveURL(/currency=USD/);
  await expect(page.locator(".job-row")).toHaveCount(1);
  await page.goto("/app");
  await page.getByLabel("Currency", { exact: true }).selectOption("INR");
  await page.getByRole("button", { name: "90 days", exact: true }).click();
  await expect(page.getByTestId("period-revenue")).toHaveText("₹70,250.00");
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: "test-results/dashboard-populated-" + width + ".png",
      fullPage: true,
    });
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: "test-results/dashboard-preview-" + width + ".png",
      });
  }
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Open search", exact: true }).click();
  await page.getByRole("textbox", { name: "Search all jobs…" }).fill("Kitchen");
  await page.getByRole("textbox", { name: "Search all jobs…" }).press("Enter");
  await expect(page).toHaveURL(/q=Kitchen/);
  await expect(
    page.getByRole("link", { name: /Kitchen cabinet restoration/ }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("textbox", { name: "Search all jobs…" })
    .fill("Bathroom");
  await page.getByRole("textbox", { name: "Search all jobs…" }).press("Enter");
  await expect(
    page.getByRole("textbox", { name: "Search jobs", exact: true }),
  ).toHaveValue("Bathroom");
  await expect(
    page.getByRole("link", { name: /Bathroom plumbing/ }),
  ).toBeVisible();
  await page.goto("/app");
  await page.getByTestId("kpi-approvals").click();
  await expect(page).toHaveURL(/focus=approvals/);
  await expect(page.locator(".job-row")).toHaveCount(2);
  await page.goto("/app");
  await page
    .locator(".pipeline-stage")
    .filter({ hasText: "Completed" })
    .click();
  await expect(page).toHaveURL(/status=completed/);
  await expect(page.locator(".job-row")).toHaveCount(2);
  await page.goto("/app");
  await page
    .getByRole("link", { name: "Create agreement", exact: true })
    .click();
  await expect(page.locator(".job-row")).toHaveCount(3);
  await page.locator(".job-row").first().click();
  await expect(
    page.getByRole("tab", { name: "Agreement", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.goto("/app");
  await page.locator(".attention-item.urgent").first().click();
  await expect(
    page.getByRole("tab", { name: "Completion acknowledgement", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.goto("/app/payments");
  await expect(page.locator(".transaction-row")).toHaveCount(5);
  await page.locator(".transaction-row").first().click();
  await expect(
    page.getByRole("tab", { name: "Payments", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  for (const path of [
    "/app/customers",
    "/app/notifications",
    "/app/settings",
    "/app/profile",
    "/app/help",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  expect(errors).toEqual([]);
});
