import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function loadedImages(page: import("@playwright/test").Page) {
  const images = page.locator("main img");
  for (let i = 0; i < (await images.count()); i++) {
    const image = images.nth(i);
    if (!(await image.isVisible())) continue;
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
}
test("public website tells the product story without authentication or JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  const page = await context.newPage();
  await page.route("**/api/**", (route) => route.abort());
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", {
      name: "Your work deserves more than a handshake.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Email address" }),
  ).toHaveCount(0);
  await expect(page.locator("#features")).toBeAttached();
  await expect(page.locator("#how-it-works")).toBeAttached();
  await expect(page.locator("#for-workers")).toBeAttached();
  await expect(page.locator("#for-customers")).toBeAttached();
  await expect(page.locator("#why-kaamproof")).toBeAttached();
  await expect(page.locator("#faq details")).toHaveCount(8);
  const summary = page.locator("#faq summary").first();
  await summary.click();
  await expect(page.locator("#faq details").first()).toHaveAttribute(
    "open",
    "",
  );
  await expect(page).toHaveTitle(/Clear work agreements/);
  expect(
    await page.locator('meta[property="og:image"]').getAttribute("content"),
  ).toContain("/share-image");
  const card = await page.request.get("/share-image");
  expect(card.status()).toBe(200);
  expect(card.headers()["content-type"]).toContain("image/png");
  const robots = await page.request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toMatch(/Disallow: \/(?:app|$)/m);
  await context.close();
});
test("public navigation, photography, previews, FAQ and responsive layouts work", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Your work deserves more than a handshake.",
    }),
  ).toBeVisible();
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await loadedImages(page);
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      window.scrollTo(0, 0);
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: "test-results/public-home-" + width + ".png",
      fullPage: true,
    });
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: "test-results/public-hero-" + width + ".png",
      });
  }
  await page.locator(".public-header").getByRole("button").click();
  await expect(page.locator(".public-menu-toggle")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".public-menu-toggle")).toBeFocused();
  await expect(page.locator(".public-menu-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.locator(".public-header").getByRole("button").click();
  await page
    .locator(".public-mobile-nav")
    .getByRole("link", { name: "How it works", exact: true })
    .click();
  await expect(page).toHaveURL(/#how-it-works/);
  await expect(page.locator(".public-menu-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  for (const name of [
    "Work agreement",
    "Evidence timeline",
    "Customer approval",
    "Payment records",
    "Job details",
    "Business overview",
  ]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByRole("tabpanel")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const faq = page.locator("#faq summary").first();
  await faq.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#faq details").first()).toHaveAttribute(
    "open",
    "",
  );
  await page.keyboard.press("Space");
  await expect(page.locator("#faq details").first()).not.toHaveAttribute(
    "open",
    "",
  );
  const ctas = page.locator('main a[href="/register"]');
  expect(await ctas.count()).toBeGreaterThanOrEqual(2);
  await ctas.first().click();
  await expect(page.getByLabel("Full name")).toBeVisible();
  await page.getByRole("link", { name: "Back to KaamProof" }).click();
  await page
    .locator(".public-header")
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await page.goto("/photo-credits");
  await expect(page.locator(".credits-page li")).toHaveCount(7);
  await loadedImages(page);
  await expect(
    page.getByRole("link", { name: "Pexels license", exact: true }),
  ).toHaveAttribute("href", "https://www.pexels.com/license/");
  const creditsA11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(creditsA11y.violations.map((v) => v.id)).toEqual([]);
  expect(errors).toEqual([]);
});
test("public copy and navigation remain usable in Hindi, Tamil and Kannada", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  for (const language of ["hi", "ta", "kn"]) {
    await page.locator(".public-header").getByRole("button").click();
    await page.getByRole("combobox").selectOption(language);
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await page.locator(".public-header").getByRole("button").click();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
      "Your work deserves more than a handshake.",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "kn");
});

test("sign-in and registration controls remain readable at every target width", async ({
  page,
}) => {
  test.setTimeout(90000);
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["login", "register"]) {
      await page.goto("/" + route);
      await expect(page.getByLabel("Email address")).toBeVisible();
      expect(
        await page
          .getByLabel("Email address")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(16);
      expect(
        await page
          .locator(".field>span")
          .first()
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(15);
      expect(
        await page
          .locator(".auth-box>h1")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(32);
      expect(
        await page
          .locator(".form-actions button")
          .evaluate((el) => el.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/,
      );
      await page.screenshot({
        path: "test-results/readable-" + route + "-" + width + ".png",
        fullPage: true,
      });
    }
  }
});
