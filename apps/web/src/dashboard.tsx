"use client";
import { useContext, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRoundPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "./navigation";
import { Auth, useLoad } from "./state";
import { Badge, LoadError } from "./ui";
import { date, locale, money } from "./i18n";
import { FinancialOverview, Transactions } from "./finance";
import type {
  AttentionItem,
  DashboardData,
  Finance,
  WorkRecord,
} from "./dashboard-types";
import "./experience-i18n";

const pipeline = [
  "draft",
  "awaiting_approval",
  "approved",
  "in_progress",
  "completion_pending",
  "completed",
];
export function DashboardSkeleton() {
  const { t } = useTranslation();
  return (
    <div
      className="dashboard-skeleton"
      aria-busy="true"
      role="status"
      aria-label={t("loading")}
    >
      <div className="skeleton-head" />
      <div className="skeleton-kpis">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} />
        ))}
      </div>
      <div className="skeleton-pipeline" />
      <div className="skeleton-body">
        <div />
        <div />
      </div>
    </div>
  );
}

function Setup({ steps }: { steps: DashboardData["onboarding"] }) {
  const { t } = useTranslation();
  const all = [
    {
      key: "customer",
      icon: Users,
      title: "stepCustomer",
      hint: "stepCustomerHint",
      to: "/app/customers#new-customer",
    },
    {
      key: "job",
      icon: BriefcaseBusiness,
      title: "stepJob",
      hint: "stepJobHint",
      to: "/app/jobs/new",
    },
    {
      key: "agreement",
      icon: FileCheck2,
      title: "stepAgreement",
      hint: "stepAgreementHint",
      to: "/app/jobs?intent=agreement",
    },
  ] as const;
  const next = all.find((s) => !steps[s.key])?.key;
  return (
    <section className="setup-banner" aria-labelledby="setup-title">
      <div className="setup-intro">
        <p className="section-kicker">
          <Sparkles size={13} />
          {t("xp.setup")}
        </p>
        <h2 id="setup-title">{t("xp.setupTitle")}</h2>
        <p>{t("xp.setupHint")}</p>
        <div className="proof-motif" aria-hidden="true">
          <div className="motif-sheet">
            <ShieldCheck size={30} />
            <i />
            <i />
            <div>
              <Check size={13} />
              <span>KAAMPROOF</span>
            </div>
          </div>
          <span className="motif-stamp">
            <CheckCheck size={25} />
          </span>
        </div>
      </div>
      <div className="setup-steps">
        {all.map((s, index) => (
          <Link
            to={s.to}
            key={s.key}
            className={
              "setup-step " +
              (steps[s.key] ? "is-done" : next === s.key ? "is-next" : "")
            }
          >
            <span className="setup-step-icon">
              {steps[s.key] ? <Check size={18} /> : <s.icon size={18} />}
            </span>
            <span>
              <small>
                {steps[s.key]
                  ? t("xp.done")
                  : next === s.key
                    ? t("xp.nextStep")
                    : "0" + (index + 1)}
              </small>
              <strong>{t("xp." + s.title)}</strong>
              <em>{t("xp." + s.hint)}</em>
            </span>
            <ArrowUpRight size={17} />
          </Link>
        ))}
      </div>
    </section>
  );
}
function Pipeline({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const icons = [
    FileText,
    FileCheck2,
    CheckCheck,
    BriefcaseBusiness,
    Clock3,
    CheckCircle2,
  ];
  return (
    <section className="panel pipeline-panel" aria-labelledby="pipeline-title">
      <div className="section-head">
        <div>
          <h2 id="pipeline-title">{t("xp.pipeline")}</h2>
          <p>{t("xp.pipelineHint")}</p>
        </div>
        <span className="mini-label">{t("xp.lifetime")}</span>
      </div>
      <div className="work-pipeline">
        {pipeline.map((status, i) => {
          const Icon = icons[i];
          return (
            <Link
              key={status}
              to={"/app/jobs?status=" + status}
              className={"pipeline-stage stage-" + i}
            >
              <span className="pipeline-node">
                <Icon size={18} />
                <strong>{data.distribution[status] || 0}</strong>
              </span>
              <span>
                {t(
                  status === "awaiting_approval"
                    ? "xp.sent"
                    : status === "completion_pending"
                      ? "xp.review"
                      : status,
                )}
              </span>
              {i < 5 && <ChevronRight className="pipeline-chevron" size={15} />}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
function Attention({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const urgent = (item: AttentionItem) =>
    ["resolve_dispute", "expired_agreement", "revise_agreement"].includes(
      item.kind,
    );
  return (
    <section
      className="panel attention-panel"
      aria-labelledby="attention-title"
    >
      <div className="section-head">
        <h2 id="attention-title">
          {t("xp.attention")}
          <span className="count-chip">{data.attention_count}</span>
        </h2>
        <Link
          to="/app/jobs?focus=attention"
          aria-label={t("viewAll") + ": " + t("xp.attention")}
        >
          <ArrowUpRight size={17} />
        </Link>
      </div>
      {data.attention.length ? (
        <div className="attention-list">
          {data.attention.map((item) => (
            <Link
              className={"attention-item " + (urgent(item) ? "urgent" : "")}
              key={item.job_id}
              to={
                "/app/jobs/" +
                item.job_id +
                "?tab=" +
                (item.kind.includes("agreement") ||
                item.kind === "customer_approval"
                  ? "agreement"
                  : item.kind === "payment_follow_up"
                    ? "payments"
                    : item.kind === "completion_review" ||
                        item.kind === "resolve_dispute"
                      ? "completion"
                      : "activity")
              }
            >
              <span className="attention-icon">
                {urgent(item) ? (
                  <TriangleAlert size={17} />
                ) : item.kind === "payment_follow_up" ? (
                  <Wallet size={17} />
                ) : (
                  <Clock3 size={17} />
                )}
              </span>
              <span>
                <strong>{t("xp." + item.kind)}</strong>
                <small>
                  {item.title} · {item.customer_name}
                </small>
                {item.kind === "payment_follow_up" && (
                  <em>{money(item.amount, item.currency)}</em>
                )}
              </span>
              <ChevronRight size={16} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="attention-empty">
          <span>
            <CheckCheck size={25} />
          </span>
          <h3>{t("xp.allClear")}</h3>
          <p>{t("xp.allClearHint")}</p>
          <div className="empty-signal" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>
      )}
    </section>
  );
}
function Balance({ finance }: { finance: Finance }) {
  const { t } = useTranslation(),
    rate = Number(finance.completion_rate || 0);
  return (
    <section className="balance-card">
      <div>
        <span className="subtle-label">{t("xp.outstanding")}</span>
        <Link
          to={"/app/jobs?focus=outstanding&currency=" + finance.currency}
          className="balance-value"
          data-testid="outstanding-balance"
        >
          {money(finance.outstanding, finance.currency)}
          <ArrowUpRight size={20} />
        </Link>
        <small>{t("xp.outstandingHint")}</small>
      </div>
      <div className="completion-meter">
        <div
          className="completion-ring"
          style={{
            background: `conic-gradient(var(--amber) ${rate}%, var(--amber-wash) 0)`,
          }}
        >
          <span>
            {finance.completion_rate === null ? "—" : Math.round(rate) + "%"}
          </span>
        </div>
        <span>
          <strong>{t("xp.paymentCompletion")}</strong>
          <small>
            {finance.completion_rate === null
              ? t("xp.noContracts")
              : money(finance.agreed, finance.currency) +
                " · " +
                t("xp.approvedValue")}
          </small>
        </span>
      </div>
    </section>
  );
}
export function RecentWork({ jobs }: { jobs: WorkRecord[] }) {
  const { t } = useTranslation(),
    [q, setQ] = useState(""),
    [status, setStatus] = useState("");
  const filtered = jobs.filter(
    (j) =>
      (!status || j.status === status) &&
      (!q ||
        (j.title + " " + j.customer_name)
          .toLocaleLowerCase()
          .includes(q.toLocaleLowerCase())),
  );
  return (
    <section
      className="panel recent-work-panel"
      aria-labelledby="recent-work-title"
    >
      <div className="section-head">
        <div>
          <p className="section-kicker">{t("jobs")}</p>
          <h2 id="recent-work-title">{t("xp.recentWork")}</h2>
        </div>
        <Link to="/app/jobs" className="subtle-link">
          {t("xp.allWork")}
          <ArrowUpRight size={15} />
        </Link>
      </div>
      {jobs.length > 0 && (
        <div className="recent-work-filters">
          <label>
            <Search size={15} />
            <input
              aria-label={t("xp.recentWork") + ": " + t("search")}
              placeholder={t("search")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <select
            aria-label={t("xp.recentWork") + ": " + t("allStatuses")}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">{t("allStatuses")}</option>
            {[...pipeline, "disputed"].map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </div>
      )}
      {!jobs.length ? (
        <div className="work-empty">
          <span className="work-empty-icon">
            <FolderOpen size={28} />
            <i>
              <Plus size={13} />
            </i>
          </span>
          <div>
            <h3>{t("xp.noWork")}</h3>
            <p>{t("xp.noWorkHint")}</p>
          </div>
          <Link to="/app/jobs/new" className="button secondary">
            {t("createJob")}
            <ArrowRight size={15} />
          </Link>
        </div>
      ) : !filtered.length ? (
        <div className="compact-empty">
          <Search size={22} />
          <p>{t("xp.noMatches")}</p>
          <button
            className="text-button"
            onClick={() => {
              setQ("");
              setStatus("");
            }}
          >
            {t("xp.clearFilters")}
          </button>
        </div>
      ) : (
        <div className="recent-work-table">
          <div className="work-table-head">
            <span>{t("xp.job")}</span>
            <span>{t("xp.stage")}</span>
            <span>{t("xp.agreed")}</span>
            <span>{t("evidence")}</span>
            <span>{t("xp.updated")}</span>
            <span />
          </div>
          {filtered.map((j) => (
            <Link
              className="work-table-row"
              to={"/app/jobs/" + j.id}
              key={j.id}
            >
              <span className="work-table-job">
                <span className="job-monogram">
                  <BriefcaseBusiness size={19} />
                </span>
                <span>
                  <strong>{j.title}</strong>
                  <small>
                    {j.customer_name} · {j.category}
                  </small>
                </span>
              </span>
              <Badge status={j.status} />
              <span className="work-table-money">
                {j.agreement ? (
                  money(j.agreement.total, j.agreement.currency)
                ) : (
                  <small>{t("xp.noAgreement")}</small>
                )}
                {j.agreement && j.agreement.decision !== "approved" && (
                  <small>{t(j.agreement.decision)}</small>
                )}
              </span>
              <span className="work-table-evidence">
                <ImageIcon size={14} />
                {j.evidence_count}
              </span>
              <small className="work-table-date">{date(j.updated_at)}</small>
              <ArrowUpRight size={17} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
function ActivityFeed({ items }: { items: DashboardData["activities"] }) {
  const { t } = useTranslation();
  return (
    <section className="panel dashboard-activity">
      <div className="section-head">
        <div>
          <p className="section-kicker">{t("activity")}</p>
          <h2>{t("xp.activity")}</h2>
        </div>
        <span className="activity-symbol">
          <ReceiptText size={19} />
        </span>
      </div>
      {items.length ? (
        <ol className="business-timeline">
          {items.map((item) => (
            <li key={item.id}>
              <span
                className={
                  "event-icon " +
                  (item.kind === "payment_recorded"
                    ? "amber"
                    : item.actor === "customer"
                      ? "violet"
                      : "")
                }
              >
                {item.kind === "payment_recorded" ? (
                  <Wallet size={15} />
                ) : item.kind === "evidence_uploaded" ? (
                  <ImageIcon size={15} />
                ) : (
                  <Check size={15} />
                )}
              </span>
              <div>
                <strong>{t(item.kind)}</strong>
                <Link to={"/app/jobs/" + item.job_id}>
                  {item.job_title}
                  <ArrowUpRight size={11} />
                </Link>
                <small>
                  {t(item.actor === "customer" ? "customerActor" : item.actor)}{" "}
                  · {date(item.created_at)}
                </small>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="compact-empty activity-empty">
          <span className="empty-event-line" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <p>{t("xp.activityEmpty")}</p>
          <small>{t("xp.noWorkHint")}</small>
        </div>
      )}
    </section>
  );
}
function CustomerInsights({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  return (
    <section className="panel customer-insights">
      <div className="section-head">
        <div>
          <p className="section-kicker">{t("customers")}</p>
          <h2>{t("xp.customerInsights")}</h2>
        </div>
        <Link
          to="/app/customers"
          aria-label={t("viewAll") + ": " + t("customers")}
        >
          <ArrowUpRight size={17} />
        </Link>
      </div>
      <p className="customer-context">
        <Users size={15} />
        {t("xp.activeRelationships", { count: data.active_customers })}
      </p>
      {data.recent_customers.length ? (
        <div>
          {data.recent_customers.map((c, i) => (
            <Link
              to={"/app/jobs?customer_id=" + c.id}
              className="insight-customer"
              key={c.id}
            >
              <span className={"avatar avatar-" + i}>
                {c.name[0].toUpperCase()}
              </span>
              <span>
                <strong>{c.name}</strong>
                <small>
                  {t("xp.customerJobs", { count: c.jobs })}
                  {c.pending > 0
                    ? " · " + t("xp.customerPending", { count: c.pending })
                    : ""}
                </small>
              </span>
              <ChevronRight size={15} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="compact-empty">
          <Users size={25} />
          <p>{t("xp.noCustomers")}</p>
          <Link to="/app/customers#new-customer" className="subtle-link">
            {t("xp.addCustomer")}
            <Plus size={14} />
          </Link>
        </div>
      )}
    </section>
  );
}
export function Dashboard() {
  const { t } = useTranslation(),
    { user } = useContext(Auth),
    [days, setDays] = useState(90),
    [currency, setCurrency] = useState("");
  const {
    data: raw,
    error,
    reload,
    loading,
  } = useLoad(
    "/dashboard?" + new URLSearchParams({ days: String(days), currency }),
    undefined,
    true,
  );
  const data = raw as DashboardData | null;
  if (error) return <LoadError error={error} retry={reload} />;
  if (!data) return <DashboardSkeleton />;
  const current = new Date(),
    greeting =
      current.getHours() < 12
        ? "morning"
        : current.getHours() < 18
          ? "afternoon"
          : "evening";
  const kpis = [
    {
      key: "total",
      label: t("total"),
      value: String(data.total),
      hint: "totalHint",
      icon: BriefcaseBusiness,
      to: "/app/jobs",
      tone: "blue",
    },
    {
      key: "active",
      label: t("active"),
      value: String(data.active),
      hint: "activeHint",
      icon: Clock3,
      to: "/app/jobs?focus=active",
      tone: "violet",
    },
    {
      key: "completed",
      label: t("completed"),
      value: String(data.distribution.completed || 0),
      hint: "completedHint",
      icon: CheckCircle2,
      to: "/app/jobs?status=completed",
      tone: "mint",
    },
    {
      key: "approvals",
      label: t("xp.approvals"),
      value: String(data.pending_approvals),
      hint: "approvalsHint",
      icon: FileCheck2,
      to: "/app/jobs?focus=approvals",
      tone: "amber",
    },
    {
      key: "collected",
      label: t("xp.collected"),
      value: money(data.finance.collected, data.finance.currency),
      hint: "recordedHint",
      icon: Wallet,
      to: "/app/payments?currency=" + data.finance.currency,
      tone: "blue",
    },
    {
      key: "outstanding",
      label: t("xp.outstanding"),
      value: money(data.finance.outstanding, data.finance.currency),
      hint: "outstandingHint",
      icon: ReceiptText,
      to: "/app/jobs?focus=outstanding&currency=" + data.finance.currency,
      tone: "coral",
    },
  ];
  return (
    <div className="business-dashboard" aria-busy={loading}>
      <header className="command-header">
        <div>
          <p className="greeting">
            {t("xp." + greeting, { name: user?.name?.split(" ")[0] || "" })}
            <span className="greeting-mark" aria-hidden="true">
              ✦
            </span>
          </p>
          <h1>{t("xp.title")}</h1>
          <p>
            {data.total
              ? t("xp.summary", {
                  active: data.active,
                  attention: data.attention_count,
                })
              : t("xp.startSummary")}
          </p>
        </div>
        <div className="command-actions">
          <time dateTime={current.toISOString()}>
            {new Intl.DateTimeFormat(locale(), {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(current)}
          </time>
          <div>
            <Link className="button" to="/app/jobs/new">
              <Plus size={17} />
              {t("newJob")}
            </Link>
            <Link className="button secondary" to="/app/jobs?intent=agreement">
              <FileText size={16} />
              {t("xp.createAgreement")}
            </Link>
            <Link className="button quiet" to="/app/customers#new-customer">
              <UserRoundPlus size={16} />
              {t("xp.addCustomer")}
            </Link>
          </div>
        </div>
      </header>
      {!Object.values(data.onboarding).every(Boolean) && (
        <Setup steps={data.onboarding} />
      )}
      <div className="business-kpis">
        {kpis.map((k) => (
          <Link
            className={"kpi-card " + k.tone}
            to={k.to}
            key={k.key}
            aria-label={k.label + ": " + k.value}
          >
            <div>
              <span className="kpi-icon">
                <k.icon size={18} />
              </span>
              <ArrowUpRight size={15} className="kpi-arrow" />
            </div>
            <span className="kpi-label">{k.label}</span>
            <strong data-testid={"kpi-" + k.key} title={k.value}>
              {k.value}
            </strong>
            <small>{t("xp." + k.hint)}</small>
          </Link>
        ))}
      </div>
      <Pipeline data={data} />
      <div className="business-main-grid">
        <div className="finance-stack">
          <FinancialOverview
            finance={data.finance}
            days={days}
            onDays={setDays}
            onCurrency={setCurrency}
          />
          <section className="panel">
            <div className="section-head">
              <h2>{t("xp.recentTransactions")}</h2>
              <Link
                className="subtle-link"
                to={
                  "/app/payments?" +
                  new URLSearchParams({
                    currency: data.finance.currency,
                    days: String(days),
                  })
                }
              >
                {t("viewAll")}
                <ArrowUpRight size={15} />
              </Link>
            </div>
            <Transactions items={data.transactions.items.slice(0, 3)} />
          </section>
        </div>
        <div className="business-side-stack">
          <Attention data={data} />
          <Balance finance={data.finance} />
        </div>
      </div>
      <RecentWork jobs={data.recent_jobs} />
      <div className="business-main-grid">
        <ActivityFeed items={data.activities} />
        <CustomerInsights data={data} />
      </div>
    </div>
  );
}
export function PaymentsOverview() {
  const params = useSearchParams();
  const { t } = useTranslation(),
    [days, setDays] = useState(
      [7, 30, 90, 365].includes(Number(params.get("days")))
        ? Number(params.get("days"))
        : 90,
    ),
    [currency, setCurrency] = useState(
      /^[A-Z]{3}$/.test(params.get("currency") || "")
        ? params.get("currency")!
        : "",
    ),
    [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(
    "/dashboard?" + new URLSearchParams({ days: String(days), currency }),
  );
  const selected = data?.finance.currency || currency || "INR";
  const entries = useLoad(
    "/payments?" +
      new URLSearchParams({
        days: String(days),
        currency: selected,
        page: String(page),
      }),
  );
  if (error) return <LoadError error={error} retry={reload} />;
  if (!data) return <DashboardSkeleton />;
  return (
    <div className="payments-workspace">
      <div className="heading">
        <div>
          <p className="section-kicker">{t("xp.overview")}</p>
          <h1>{t("xp.financial")}</h1>
          <p>{t("xp.financialHint")}</p>
        </div>
        <Link className="button" to="/app/jobs">
          <Plus size={16} />
          {t("recordPayment")}
        </Link>
      </div>
      <div className="business-main-grid">
        <FinancialOverview
          finance={data.finance}
          days={days}
          onDays={(n) => {
            setDays(n);
            setPage(1);
          }}
          onCurrency={(c) => {
            setCurrency(c);
            setPage(1);
          }}
        />
        <Balance finance={data.finance} />
      </div>
      <section className="panel">
        <div className="section-head">
          <h2>{t("xp.recentTransactions")}</h2>
          <span className="mini-label">{t("xp.selfReported")}</span>
        </div>
        {entries.error ? (
          <LoadError error={entries.error} retry={entries.reload} />
        ) : !entries.data ? (
          <DashboardSkeleton />
        ) : (
          <>
            <Transactions items={entries.data.items} />
            {entries.data.total > entries.data.size && (
              <div className="pagination">
                <button
                  className="secondary"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  {t("previous")}
                </button>
                <span>
                  {page} / {Math.ceil(entries.data.total / entries.data.size)}
                </span>
                <button
                  className="secondary"
                  disabled={page * entries.data.size >= entries.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  {t("next")}
                </button>
              </div>
            )}
          </>
        )}
      </section>
      <p className="financial-disclaimer">
        <ShieldCheck size={16} />
        {t("selfReported")}
      </p>
    </div>
  );
}
