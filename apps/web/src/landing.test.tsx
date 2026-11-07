import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { Landing, ProductPreview } from "./landing";
import Providers from "./main";
import i18n from "./i18n";
import { Auth } from "./state";
import { AuthPage } from "./public-pages";
import { publicLanguages, publicEnglish } from "./marketing-i18n";
beforeEach(() => {
  void i18n.changeLanguage("en");
});
describe("public product website", () => {
  it("renders its complete product story during server rendering without a session", () => {
    const html = renderToString(
      <Providers>
        <Landing />
      </Providers>,
    );
    expect(html).toContain("Your work deserves");
    expect(html).toContain('id="features"');
    expect(html).toContain('id="faq"');
    expect(html).not.toContain('type="password"');
  });
  it("connects real registration, sign-in and product-section routes", () => {
    render(<Landing />);
    expect(
      screen.getByRole("link", { name: "Start building your work record" }),
    ).toHaveAttribute("href", "/register");
    expect(
      screen.getByRole("link", { name: "Create your free account" }),
    ).toHaveAttribute("href", "/register");
    expect(
      screen.getByRole("link", { name: "Already a member? Sign in" }),
    ).toHaveAttribute("href", "/login");
    expect(
      screen.getByRole("link", { name: "See how it works" }),
    ).toHaveAttribute("href", "#how-it-works");
    expect(document.querySelectorAll(".faq-list details")).toHaveLength(8);
  });
  it("lets visitors explore accurate labelled product views with keyboard tabs", () => {
    render(<Landing />);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[5]);
    expect(tabs[5]).toHaveAttribute("aria-selected", "true");
    expect(
      within(screen.getByRole("tabpanel")).getByText("₹1,500"),
    ).toBeVisible();
    fireEvent.keyDown(tabs[5], { key: "Home" });
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveFocus();
    fireEvent.keyDown(tabs[0], { key: "ArrowDown" });
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
  });
  it("labels illustrative approval and payment examples without certification claims", () => {
    render(<ProductPreview view={4} />);
    expect(screen.getAllByText("Illustrative product preview")).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "Customer decision recorded" }),
    ).toBeVisible();
    expect(
      screen.getByText("The customer approved agreement v1."),
    ).toBeVisible();
  });
  it.each(["hi", "ta", "kn"] as const)(
    "has complete public copy and working showcase labels in %s",
    async (language) => {
      expect(Object.keys(publicLanguages[language]).sort()).toEqual(
        Object.keys(publicEnglish).sort(),
      );
      expect(
        Object.values(publicLanguages[language]).every((v) => v.length > 0),
      ).toBe(true);
      await i18n.changeLanguage(language);
      render(<Landing />);
      expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent(
        "Your work deserves",
      );
      expect(
        screen.getByRole("tab", { name: publicLanguages[language].view2 }),
      ).toBeVisible();
    },
  );
  it("keeps account actions behind session readiness while the public page renders immediately", () => {
    const setUser = () => {};
    const { rerender } = render(
      <Auth.Provider value={{ user: null, ready: false, setUser }}>
        <AuthPage mode="login" />
      </Auth.Provider>,
    );
    expect(screen.queryByLabelText("Email address")).toBeNull();
    expect(screen.getByRole("status")).toHaveAccessibleName(
      "Loading your records…",
    );
    rerender(
      <Auth.Provider value={{ user: null, ready: true, setUser }}>
        <AuthPage mode="login" />
      </Auth.Provider>,
    );
    expect(screen.getByLabelText("Email address")).toBeVisible();
  });
});
