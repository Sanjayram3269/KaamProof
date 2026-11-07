"use client";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  ReceiptText,
  ArrowRight,
} from "lucide-react";
import { Link } from "./navigation";
import { date, locale, money } from "./i18n";
import type { Finance, Transaction } from "./dashboard-types";
import "./experience-i18n";

export function PeriodFilter({
  days,
  onChange,
}: {
  days: number;
  onChange: (days: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="period-filter" role="group" aria-label={t("xp.period")}>
      {[7, 30, 90, 365].map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={days === n}
          onClick={() => onChange(n)}
        >
          {t("xp." + (n === 365 ? "months12" : "days" + n))}
        </button>
      ))}
    </div>
  );
}
export function RevenueChart({ finance }: { finance: Finance }) {
  const { t } = useTranslation(),
    id = useId().replaceAll(":", ""),
    [active, setActive] = useState<number | null>(null);
  const values = finance.series.map((p) => Number(p.amount)); // Plot coordinates only; monetary sums are calculated by the API.
  const maximum = Math.max(...values, 1),
    width = 700,
    height = 175,
    pad = 12;
  const coords = values.map((value, index) => ({
    x: pad + (index / Math.max(1, values.length - 1)) * (width - 2 * pad),
    y: height - pad - (value / maximum) * (height - 2 * pad),
  }));
  const line = coords
    .map((p, i) => (i ? "L" : "M") + p.x + "," + p.y)
    .join(" ");
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale(), {
      month: "short",
      ...(finance.grain === "month"
        ? { year: "2-digit" as const }
        : { day: "numeric" as const }),
      timeZone: "UTC",
    }).format(new Date(value + "T12:00:00Z"));
  if (!finance.period_count)
    return (
      <div className="chart-empty">
        <span className="chart-empty-icon">
          <ChartNoAxesCombined size={32} />
        </span>
        <h3>{t("xp.noPayments")}</h3>
        <p>{t("xp.noPaymentsHint")}</p>
        <Link to="/app/jobs">
          {t("xp.seeJobs")}
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  return (
    <div className="revenue-plot">
      <div className="chart-scale">
        <span>{money(maximum, finance.currency)}</span>
        <span>{money(maximum / 2, finance.currency)}</span>
        <span>{money(0, finance.currency)}</span>
      </div>
      <div className="chart-canvas">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t("xp.collected")}
        >
          <defs>
            <linearGradient id={"area-" + id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#477BFF" stopOpacity=".24" />
              <stop offset="100%" stopColor="#477BFF" stopOpacity=".015" />
            </linearGradient>
          </defs>
          {[pad, height / 2, height - pad].map((y) => (
            <line
              key={y}
              x1="0"
              x2={width}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="4 5"
            />
          ))}
          <path
            d={
              line +
              ` L${coords.at(-1)!.x},${height - pad} L${pad},${height - pad} Z`
            }
            fill={`url(#area-${id})`}
          />
          <path
            d={line}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {coords.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={active === i ? 6 : 4}
              fill={active === i ? "var(--accent)" : "white"}
              stroke="var(--accent)"
              strokeWidth="2"
              tabIndex={0}
              role="graphics-symbol"
              aria-label={
                formatDate(finance.series[i].date) +
                ": " +
                money(finance.series[i].amount, finance.currency)
              }
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <title>
                {formatDate(finance.series[i].date)}:{" "}
                {money(finance.series[i].amount, finance.currency)}
              </title>
            </circle>
          ))}
        </svg>
        {active !== null && finance.series[active] && (
          <div className="chart-tooltip" role="status">
            {formatDate(finance.series[active].date)}
            <strong>
              {money(finance.series[active].amount, finance.currency)}
            </strong>
          </div>
        )}
        <div className="chart-dates">
          {finance.series
            .filter(
              (_, i) =>
                i === 0 ||
                i === finance.series.length - 1 ||
                i === Math.floor(finance.series.length / 2),
            )
            .map((p) => (
              <span key={p.date}>{formatDate(p.date)}</span>
            ))}
        </div>
      </div>
    </div>
  );
}
export function FinancialOverview({
  finance,
  days,
  onDays,
  onCurrency,
}: {
  finance: Finance;
  days: number;
  onDays: (n: number) => void;
  onCurrency: (c: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="panel finance-panel" aria-labelledby="financial-title">
      <div className="section-head">
        <div>
          <p className="section-kicker">{t("payments")}</p>
          <h2 id="financial-title">{t("xp.financial")}</h2>
        </div>
        <label className="currency-picker">
          <span className="sr-only">{t("currency")}</span>
          <select
            aria-label={t("currency")}
            value={finance.currency}
            onChange={(e) => onCurrency(e.target.value)}
          >
            {[...new Set([...finance.currencies, finance.currency])].map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="finance-summary">
        <div>
          <span className="subtle-label">{t("xp.thisPeriod")}</span>
          <strong className="finance-value" data-testid="period-revenue">
            {money(finance.period_collected, finance.currency)}
          </strong>
          <span className="finance-caption">
            <span className="legend-dot" />
            {t("xp.entries", { count: finance.period_count })}
          </span>
        </div>
        <PeriodFilter days={days} onChange={onDays} />
      </div>
      <RevenueChart finance={finance} />
      <div className="finance-foot">
        <span>
          <span className="legend-dot" />
          {t("xp.selfReported")}
        </span>
        <Link
          to={
            "/app/payments?" +
            new URLSearchParams({
              currency: finance.currency,
              days: String(days),
            })
          }
        >
          {t("xp.recentTransactions")}
          <ArrowUpRight size={14} />
        </Link>
      </div>
    </section>
  );
}
export function Transactions({ items }: { items: Transaction[] }) {
  const { t } = useTranslation();
  return items.length ? (
    <div className="transaction-list">
      {items.map((p) => (
        <Link
          className="transaction-row"
          to={"/app/jobs/" + p.job_id + "?tab=payments"}
          key={p.id}
        >
          <span className="transaction-icon">
            <ReceiptText size={18} />
          </span>
          <span className="transaction-info">
            <strong>{p.job_title}</strong>
            <small>
              {p.customer_name} · {t(p.method)}
            </small>
          </span>
          <span className="transaction-amount">
            <strong>+{money(p.amount, p.currency)}</strong>
            <small>{date(p.paid_at)}</small>
          </span>
          <ArrowUpRight size={15} />
        </Link>
      ))}
    </div>
  ) : (
    <div className="compact-empty">
      <ReceiptText size={23} />
      <p>{t("xp.noTransactions")}</p>
    </div>
  );
}
