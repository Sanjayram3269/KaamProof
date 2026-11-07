import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing and authentication meet automated WCAG checks", async ({
  page,
}) => {
  for (const path of ["/", "/login", "/register", "/forgot-password"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).last()).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations,
      JSON.stringify(
        results.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
        null,
        2,
      ),
    ).toEqual([]);
  }
});
