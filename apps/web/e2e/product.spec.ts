import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("worker and customer complete a real documented job", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Sanjay Kumar");
  await page
    .getByLabel("Email address")
    .fill(`worker-${Date.now()}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Browser-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Your business, in focus." }),
  ).toBeVisible();
  const dashboardA11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    dashboardA11y.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole("link", { name: "New job", exact: true }).click();
  await page.getByLabel("Full name").fill("Priya Sharma");
  await page.getByLabel("Phone number").fill("+919888888888");
  await page.getByRole("button", { name: "Add customer", exact: true }).click();
  await page.getByLabel("Job title").fill("Kitchen cabinet restoration");
  await page
    .getByLabel("Description")
    .fill("Restore hinges and polish the kitchen cabinets.");
  await page.getByLabel("Location").fill("Bengaluru");
  await page.getByRole("button", { name: "Create job", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kitchen cabinet restoration" }),
  ).toBeVisible();
  const workerUrl = page.url();
  const jobA11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    jobA11y.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole("tab", { name: "Agreement", exact: true }).click();
  await page
    .getByLabel("Scope of work")
    .fill("Replace all hinges and polish cabinets");
  await page.getByLabel("Labour charges").fill("1500");
  await page.getByLabel("Material charges").fill("500");
  await page
    .getByRole("button", { name: "Issue new agreement version" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Agreement · v1" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create customer link", exact: true })
    .click();
  const customerUrl = await page
    .getByRole("textbox", { name: "Create customer link" })
    .inputValue();
  expect(customerUrl).toContain("/portal#");
  const customerContext = await browser.newContext();
  const customer = await customerContext.newPage();
  await customer.goto(customerUrl);
  await expect(
    customer.getByRole("heading", { name: "Kitchen cabinet restoration" }),
  ).toBeVisible();
  const portalA11y = await new AxeBuilder({ page: customer })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    portalA11y.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await customer.screenshot({
    path: "test-results/customer-portal-readable.png",
    fullPage: true,
  });
  await customer.getByRole("button", { name: "Save changes" }).click();
  await expect(
    customer.getByText("Approved", { exact: true }).first(),
  ).toBeVisible();
  expect(customer.url()).not.toContain("#");
  await page.reload();
  await page.getByRole("button", { name: "Start / resume work" }).click();
  await page.getByRole("tab", { name: "Work evidence" }).click();
  await page
    .getByLabel("Image (JPEG, PNG or WebP, up to 8 MB)")
    .setInputFiles("e2e/fixtures/proof.png");
  await page.getByLabel("Caption").fill("Hinges fitted and finish restored");
  await page.getByRole("button", { name: "Upload evidence" }).click();
  await expect(
    page.getByRole("img", { name: "Hinges fitted and finish restored" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Activity timeline" }).click();
  await page
    .getByLabel("Notes")
    .fill("Final inspection completed with customer");
  await page.getByRole("button", { name: "Record work update" }).click();
  await expect(
    page.getByText("Final inspection completed with customer", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Completion acknowledgement" }).click();
  await page.getByLabel("Notes").fill("All cabinets restored and site cleaned");
  await page.getByRole("button", { name: "Submit completion" }).click();
  await expect(
    page.getByText("Completion review", { exact: true }).first(),
  ).toBeVisible();
  await customer.goto(customerUrl);
  await customer.getByRole("button", { name: "Save changes" }).click();
  await expect(customer.getByText("Completed", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Payments", exact: true }).click();
  await page.getByLabel("Amount", { exact: true }).fill("2000");
  await page.getByLabel("Reference number").fill("BROWSER-PAYMENT-1");
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await expect(
    page.getByText("₹2,000.00", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Download documents" }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Full job record" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("kaamproof-record.pdf");
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/readable-job-" + width + ".png",
      fullPage: true,
    });
    await customer.setViewportSize({ width, height: 1000 });
    expect(
      await customer.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await customer.screenshot({
      path: "test-results/readable-customer-" + width + ".png",
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await other.goto("/register");
  await other.getByLabel("Full name").fill("Another Worker");
  await other
    .getByLabel("Email address")
    .fill(`other-${Date.now()}@example.com`);
  await other
    .getByLabel("Password", { exact: true })
    .fill("Other-password-123");
  await other.getByRole("button", { name: "Create account" }).click();
  await expect(
    other.getByRole("heading", { name: "Your business, in focus." }),
  ).toBeVisible();
  const response = await other.request.get(
    "/api/v1/jobs/" + workerUrl.split("/").pop(),
  );
  expect(response.status()).toBe(404);
  await page.goto("/app");
  await page.screenshot({
    path: "test-results/overview-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await customerContext.close();
  await otherContext.close();
});

test("mobile navigation, language, validation and missing routes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator(".public-header").getByRole("button").click();
  await page.getByRole("combobox", { name: "Language" }).selectOption("ta");
  await expect(page.locator("html")).toHaveAttribute("lang", "ta");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ta");
  await page.locator(".public-header").getByRole("button").click();
  await page.getByRole("combobox").selectOption("en");
  await page.goto("/register");
  await page.getByRole("button", { name: "Create account" }).click();
  expect(
    await page
      .getByLabel("Full name")
      .evaluate((el: HTMLInputElement) => el.validity.valueMissing),
  ).toBe(true);
  await page.getByLabel("Full name").fill("Mobile Worker");
  await page
    .getByLabel("Email address")
    .fill(`mobile-${Date.now()}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Mobile-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Your business, in focus." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/overview-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Help & support", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Help & support" }),
  ).toBeVisible();
  await page.goto("/unknown-page");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
});

test("invalid customer link and invalid login give visible errors", async ({
  page,
}) => {
  await page.goto("/portal#invalid-token");
  await expect(page.locator('.error[role="alert"]')).toContainText(
    "invalid, expired or revoked",
  );
  await page.goto("/login");
  await page.getByLabel("Email address").fill("not-registered@example.com");
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator('.error[role="alert"]')).toContainText(
    "Invalid email or password",
  );
});
