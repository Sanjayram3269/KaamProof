import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FinancialOverview, RevenueChart } from "./finance";
import { RecentWork } from "./dashboard";
import type { Finance, WorkRecord } from "./dashboard-types";
import i18n from "./i18n";
const finance: Finance = {
  currency: "INR",
  currencies: ["INR", "USD"],
  self_reported: true,
  collected: "0.30",
  outstanding: "0.70",
  agreed: "1.00",
  completion_rate: "30",
  period_collected: "0.30",
  period_count: 2,
  days: 7,
  grain: "day",
  series: [
    { date: "2026-11-06", amount: "0.10" },
    { date: "2026-11-07", amount: "0.20" },
  ],
};
beforeEach(() => {
  void i18n.changeLanguage("en");
});
describe("business dashboard", () => {
  it("sends range and currency selections without recalculating monetary sums", () => {
    const onDays = vi.fn(),
      onCurrency = vi.fn();
    render(
      <FinancialOverview
        finance={finance}
        days={7}
        onDays={onDays}
        onCurrency={onCurrency}
      />,
    );
    expect(screen.getByTestId("period-revenue")).toHaveTextContent("₹0.30");
    expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "12 months" }));
    expect(onDays).toHaveBeenCalledWith(365);
    fireEvent.change(screen.getByLabelText("Currency"), {
      target: { value: "USD" },
    });
    expect(onCurrency).toHaveBeenCalledWith("USD");
    fireEvent.focus(screen.getAllByRole("graphics-symbol")[1]);
    expect(screen.getByRole("status")).toHaveTextContent("₹0.20");
  });
  it("replaces charts with a useful action when there are no recorded payments", () => {
    render(
      <RevenueChart
        finance={{ ...finance, period_count: 0, period_collected: "0" }}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Go to your jobs" }),
    ).toHaveAttribute("href", "/app/jobs");
  });
  it("filters recent work by customer and status and clears zero matches", () => {
    const jobs: WorkRecord[] = [
      {
        id: "one",
        title: "Kitchen cabinets",
        customer_name: "Priya",
        customer_id: "c",
        status: "in_progress",
        created_at: 100000,
        updated_at: 100001,
        evidence_count: 2,
        category: "Renovation",
        agreement: {
          total: "1000.50",
          currency: "INR",
          decision: "approved",
          version: 1,
        },
      },
      {
        id: "two",
        title: "Studio lights",
        customer_name: "Arjun",
        customer_id: "d",
        status: "completed",
        created_at: 100000,
        updated_at: 100002,
        evidence_count: 0,
        category: "Electrical",
        agreement: null,
      },
    ];
    render(<RecentWork jobs={jobs} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Priya" },
    });
    expect(
      screen.getByRole("link", { name: /Kitchen cabinets/ }),
    ).toBeVisible();
    expect(screen.queryByRole("link", { name: /Studio lights/ })).toBeNull();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "completed" },
    });
    expect(screen.getByText("No jobs match these filters")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("link", { name: /Studio lights/ })).toHaveAttribute(
      "href",
      "/app/jobs/two",
    );
  });
  it.each(["hi", "ta", "kn"])(
    "translates the new dashboard controls in %s",
    async (language) => {
      await i18n.changeLanguage(language);
      render(
        <FinancialOverview
          finance={finance}
          days={7}
          onDays={() => {}}
          onCurrency={() => {}}
        />,
      );
      expect(
        screen.queryByRole("heading", { name: "Money, made clear" }),
      ).toBeNull();
      expect(screen.getByRole("heading")).not.toHaveTextContent("xp.");
      expect(screen.getByRole("group")).toHaveAccessibleName();
    },
  );
});
