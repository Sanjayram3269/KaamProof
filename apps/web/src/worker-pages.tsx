"use client";
import { useContext, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useNavigate, useParams } from "./navigation";
import { useTranslation } from "react-i18next";
import { ArrowDownToLine, Bell, FileText, Plus } from "lucide-react";
import { api, post } from "./api";
import i18n, { date, money } from "./i18n";
import { Auth, statuses, useLoad, text, object } from "./state";
import {
  Badge,
  Loading,
  Empty,
  LoadError,
  Form,
  Field,
  Select,
  Action,
  Heading,
  JobCards,
  Timeline,
  EvidenceImage,
} from "./ui";

export { Shell } from "./shell";
export { Dashboard } from "./dashboard";

export function Jobs() {
  const params = useSearchParams();
  const { t } = useTranslation(),
    [q, setQ] = useState(params.get("q") || ""),
    [status, setStatus] = useState(params.get("status") || ""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("newest"),
    [archived, setArchived] = useState(false),
    [page, setPage] = useState(1);
  const queryString = params.toString();
  useEffect(() => {
    const next = new URLSearchParams(queryString);
    setQ(next.get("q") || "");
    setStatus(next.get("status") || "");
    setPage(1);
  }, [queryString]);
  const { data, error, reload } = useLoad(
    "/jobs?" +
      new URLSearchParams({
        q,
        status,
        category,
        sort,
        archived: String(archived),
        page: String(page),
        focus:
          params.get("intent") === "agreement"
            ? "agreement"
            : params.get("focus") || "",
        customer_id: params.get("customer_id") || "",
        currency: params.get("currency") || "",
      }),
  );
  return (
    <>
      <Heading title="jobs" subtitle="subtitle">
        <Link className="button" to="/app/jobs/new">
          <Plus size={18} />
          {t("newJob")}
        </Link>
      </Heading>
      {params.get("intent") === "agreement" && (
        <div className="notice">{t("xp.chooseJob")}</div>
      )}
      {(params.get("focus") || params.get("customer_id")) && (
        <div className="filter-context">
          <span>
            {t(
              params.get("focus") === "outstanding"
                ? "xp.includesArchived"
                : "xp.filtered",
            )}
          </span>
          <Link to="/app/jobs">{t("xp.clearFilters")}</Link>
        </div>
      )}
      <section className="panel">
        <div className="filters">
          <input
            aria-label={t("search")}
            placeholder={t("search")}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label={t("allStatuses")}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t("allStatuses")}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
          <input
            aria-label={t("category")}
            placeholder={t("category")}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label={t("date")}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">{t("newest")}</option>
            <option value="oldest">{t("oldest")}</option>
          </select>
          {params.get("focus") !== "outstanding" && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => {
                  setArchived(e.target.checked);
                  setPage(1);
                }}
              />
              {t("archived")}
            </label>
          )}
        </div>
        {error ? (
          <LoadError error={error} retry={reload} />
        ) : !data ? (
          <Loading />
        ) : (
          <>
            <JobCards
              jobs={data.items}
              agreementMode={params.get("intent") === "agreement"}
            />
            <div className="pagination">
              <button
                className="secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                {t("previous")}
              </button>
              <span>
                {page} / {Math.max(1, Math.ceil(data.total / data.size))}
              </span>
              <button
                className="secondary"
                disabled={page * data.size >= data.total}
                onClick={() => setPage(page + 1)}
              >
                {t("next")}
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

export function CustomerForm({ done }: { done: () => void }) {
  return (
    <Form
      label="addCustomer"
      action={(d) => post("/customers", object(d))}
      onDone={done}
    >
      <div className="form-grid">
        <Field name="name" maxLength={120} />
        <Field name="phone" type="tel" maxLength={30} required={false} />
        <Field name="email" type="email" maxLength={254} required={false} />
      </div>
    </Form>
  );
}

export function Customers() {
  const { t } = useTranslation(),
    { data, error, reload } = useLoad("/customers");
  return (
    <>
      <Heading title="customers" />
      <section className="panel padded" id="new-customer">
        <h2>{t("addCustomer")}</h2>
        <CustomerForm done={reload} />
      </section>
      <section className="panel">
        {error ? (
          <LoadError error={error} retry={reload} />
        ) : !data ? (
          <Loading />
        ) : !data.length ? (
          <Empty />
        ) : (
          data.map((c: any) => (
            <div className="customer-mini" key={c.id}>
              <span className="avatar">{c.name[0]}</span>
              <div>
                <strong>{c.name}</strong>
                <small>
                  {c.phone} {c.email}
                </small>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}

export function JobFields({ job }: { job?: any }) {
  return (
    <>
      <Field name="title" value={job?.title} maxLength={180} />
      <Field
        name="description"
        type="textarea"
        value={job?.description}
        required={false}
      />
      <div className="form-grid">
        <Field
          name="category"
          value={job?.category || "General"}
          maxLength={60}
        />
        <Field
          name="location"
          value={job?.location}
          required={false}
          maxLength={250}
        />
      </div>
    </>
  );
}

export function NewJob() {
  const { t } = useTranslation(),
    navigate = useNavigate(),
    { data, error, reload } = useLoad("/customers");
  return (
    <>
      <Heading title="newJob" />
      <div className="two-columns">
        <section className="panel padded">
          {error ? (
            <LoadError error={error} retry={reload} />
          ) : !data ? (
            <Loading />
          ) : data.length ? (
            <Form
              label="createJob"
              action={(d) => post("/jobs", object(d))}
              onDone={(j) => navigate("/app/jobs/" + j.id)}
            >
              <JobFields />
              <Select name="customer_id" label="customer">
                {data.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Form>
          ) : (
            <Empty />
          )}
        </section>
        <section className="panel padded">
          <h2>{t("addCustomer")}</h2>
          <CustomerForm done={reload} />
        </section>
      </div>
    </>
  );
}

export function AgreementView({ agreement: a }: { agreement: any }) {
  const { t } = useTranslation();
  return (
    <article className="agreement">
      <div className="section-head">
        <h3>
          {t("agreement")} · v{a.version}
        </h3>
        <Badge status={a.decision} />
      </div>
      <p className="prewrap">{a.scope}</p>
      {a.exclusions && (
        <p>
          <strong>{t("exclusions")}: </strong>
          {a.exclusions}
        </p>
      )}
      <dl className="pricing">
        {["labour", "materials", "other", "tax", "total"].map((k) => (
          <div key={k}>
            <dt>{t(k === "total" ? "agreed" : k)}</dt>
            <dd>{money(a[k], a.currency)}</dd>
          </div>
        ))}
      </dl>
      <p className="prewrap">{a.terms}</p>
      <small>
        {t("validUntil")}:{" "}
        {a.valid_until ? date(a.valid_until) : t("legacyValidity")}
      </small>
      {a.decision_notes && (
        <p>
          {t("customerActor")}: {a.decision_notes}
        </p>
      )}
    </article>
  );
}

export function AgreementForm({ job, done }: { job: any; done: () => void }) {
  const { t } = useTranslation(),
    a = job.agreement;
  return (
    <Form
      label="newAgreement"
      action={(d) =>
        post("/jobs/" + job.id + "/agreements", {
          ...object(d),
          valid_until: Math.floor(
            new Date(text(d, "valid_until") + "T23:59:59").getTime() / 1000,
          ),
        })
      }
      onDone={done}
    >
      <Field name="scope" type="textarea" value={a?.scope || job.description} />
      <Field
        name="exclusions"
        type="textarea"
        value={a?.exclusions}
        required={false}
      />
      <div className="form-grid">
        {["labour", "materials", "other", "tax"].map((k) => (
          <Field
            key={k}
            name={k}
            type="number"
            min="0"
            max="999999999"
            step="0.01"
            value={a?.[k] || "0.00"}
          />
        ))}
        <Select name="currency" value={a?.currency || "INR"}>
          {["INR", "USD", "EUR", "GBP"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Field
          name="valid_until"
          type="date"
          label="validUntil"
          min={new Date().toISOString().slice(0, 10)}
          value={new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)}
        />
      </div>
      <Field name="terms" type="textarea" value={a?.terms} required={false} />
      <p className="muted">{t("disclaimer")}</p>
    </Form>
  );
}

export function JobDetail() {
  const { id } = useParams(),
    { t } = useTranslation(),
    { data: job, error, reload } = useLoad("/jobs/" + id);
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const validTab =
    requestedTab &&
    [
      "activity",
      "agreement",
      "evidence",
      "completion",
      "payments",
      "documents",
      "settings",
    ].includes(requestedTab)
      ? requestedTab
      : "activity";
  const [tab, setTab] = useState(validTab),
    [link, setLink] = useState(""),
    [paymentKey, setPaymentKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    setTab(validTab);
    setLink("");
  }, [validTab, id]);
  if (error) return <LoadError error={error} retry={reload} />;
  if (!job) return <Loading />;
  const base = "/jobs/" + id;
  return (
    <>
      <div className="heading">
        <div>
          <Link to="/app/jobs" className="eyebrow">
            ← {t("jobs")}
          </Link>
          <h1>{job.title}</h1>
          <p>
            {job.customer_name} · {job.location || job.category}
          </p>
        </div>
        <Badge status={job.status} />
      </div>
      <div className="job-toolbar">
        <Action
          label="share"
          secondary
          action={async () => {
            const result = await post(base + "/links", { days: 7 });
            setLink(location.origin + "/portal#" + result.token);
            reload();
          }}
        />
        {["approved", "disputed"].includes(job.status) && (
          <Action
            label="start"
            action={async () => {
              await post(base + "/start");
              reload();
            }}
          />
        )}
        <Action
          label="archive"
          secondary
          confirm
          action={async () => {
            await post(base + "/archive");
            reload();
          }}
        />
      </div>
      {link && (
        <div className="notice">
          <p>{t("linkHint")}</p>
          <input aria-label={t("share")} readOnly value={link} />
          <div className="inline">
            <Action
              label="copy"
              action={() => navigator.clipboard.writeText(link)}
              secondary
            />
            <a
              className="button secondary"
              href={link}
              target="_blank"
              rel="noreferrer"
            >
              {t("portal")}
            </a>
          </div>
        </div>
      )}
      <div className="tabs" role="tablist">
        {[
          "activity",
          "agreement",
          "evidence",
          "completion",
          "payments",
          "documents",
          "settings",
        ].map((key) => (
          <button
            role="tab"
            id={"tab-" + key}
            aria-controls="job-tabpanel"
            tabIndex={tab === key ? 0 : -1}
            aria-selected={tab === key}
            key={key}
            onClick={() => setTab(key)}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                return;
              e.preventDefault();
              const buttons = Array.from(
                e.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                  "[role=tab]",
                ),
              );
              const index = buttons.indexOf(e.currentTarget);
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? buttons.length - 1
                    : (index +
                        (e.key === "ArrowRight" ? 1 : -1) +
                        buttons.length) %
                      buttons.length;
              buttons[next].click();
              buttons[next].focus();
            }}
          >
            {t(key)}
          </button>
        ))}
      </div>
      <section
        className="panel padded"
        id="job-tabpanel"
        role="tabpanel"
        aria-labelledby={"tab-" + tab}
      >
        {tab === "activity" && (
          <>
            <h2>{t("activity")}</h2>
            <p className="prewrap">{job.description}</p>
            <Form
              label="update"
              action={(d) => post(base + "/updates", object(d))}
              onDone={reload}
            >
              <Field name="notes" type="textarea" />
            </Form>
            <Timeline items={job.timeline} />
          </>
        )}
        {tab === "agreement" && (
          <>
            <h2>{t("agreements")}</h2>
            {job.agreements.map((a: any) => (
              <AgreementView key={a.id} agreement={a} />
            ))}
            {["draft", "awaiting_approval", "approved"].includes(
              job.status,
            ) && (
              <details open={!job.agreement}>
                <summary>{t("newAgreement")}</summary>
                <AgreementForm job={job} done={reload} />
              </details>
            )}
          </>
        )}
        {tab === "evidence" && (
          <>
            <h2>{t("evidence")}</h2>
            <Form
              label="upload"
              action={(d) =>
                api(base + "/evidence", { method: "POST", body: d })
              }
              onDone={reload}
            >
              <Field
                name="file"
                label="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
              <Field name="caption" required={false} maxLength={500} />
            </Form>
            <div className="evidence-grid">
              {job.evidence.map((e: any) => (
                <div key={e.id}>
                  <EvidenceImage item={e} jobId={id} />
                  {job.status === "draft" && (
                    <Action
                      label="removeEvidence"
                      secondary
                      confirm
                      action={async () => {
                        await api(base + "/evidence/" + e.id, {
                          method: "DELETE",
                        });
                        reload();
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            {!job.evidence.length && <Empty />}
          </>
        )}
        {tab === "completion" && (
          <>
            <h2>{t("completion")}</h2>
            <Badge status={job.status} />
            <p>{job.completion_notes}</p>
            {job.completion_at && <small>{date(job.completion_at)}</small>}
            {job.status === "in_progress" && (
              <Form
                label="submitCompletion"
                action={(d) => post(base + "/completion", object(d))}
                onDone={reload}
              >
                <Field name="notes" type="textarea" />
              </Form>
            )}
            <p className="muted">{t("disclaimer")}</p>
          </>
        )}
        {tab === "payments" && (
          <>
            <h2>{t("payments")}</h2>
            <p className="notice">{t("selfReported")}</p>
            <div className="financials">
              {["agreed", "recorded", "outstanding"].map((k) => (
                <div key={k}>
                  <small>{t(k === "recorded" ? "paymentSummary" : k)}</small>
                  <strong>
                    {money(job.payments[k], job.payments.currency)}
                  </strong>
                </div>
              ))}
            </div>
            {job.agreement?.decision === "approved" && (
              <Form
                label="recordPayment"
                action={(d) =>
                  post(base + "/payments", {
                    ...object(d),
                    idempotency_key: paymentKey,
                    paid_at: Math.floor(
                      Math.min(
                        Date.now(),
                        new Date(text(d, "paid_at") + "T12:00:00").getTime(),
                      ) / 1000,
                    ),
                  })
                }
                onDone={() => {
                  setPaymentKey(crypto.randomUUID());
                  reload();
                }}
              >
                <div className="form-grid">
                  <Field name="amount" type="number" min="0.01" step="0.01" />
                  <Select name="method">
                    {["cash", "bank", "upi", "card", "other"].map((m) => (
                      <option key={m} value={m}>
                        {t(m)}
                      </option>
                    ))}
                  </Select>
                  <Field name="reference" required={false} maxLength={120} />
                  <Field
                    name="paid_at"
                    label="date"
                    type="date"
                    value={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </Form>
            )}
            {job.payments.entries.map((p: any) => (
              <div className="record-row" key={p.id}>
                <strong>{money(p.amount, p.currency)}</strong>
                <span>
                  {t(p.method)} · {p.reference}
                </span>
                <small>{date(p.paid_at)}</small>
              </div>
            ))}
          </>
        )}
        {tab === "documents" && (
          <>
            <h2>{t("documents")}</h2>
            <p>{t("disclaimer")}</p>
            <div className="document-grid">
              {[
                "record",
                "agreement",
                "work-summary",
                "evidence-index",
                "completion",
                "payments",
              ].map((kind) => (
                <a
                  className="document-card"
                  key={kind}
                  href={"/api/v1" + base + "/documents/" + kind}
                >
                  <FileText size={25} />
                  <strong>{t(kind)}</strong>
                  <ArrowDownToLine size={18} />
                </a>
              ))}
            </div>
          </>
        )}
        {tab === "settings" && (
          <>
            <h2>{t("settings")}</h2>
            {job.status === "draft" && (
              <Form
                label="edit"
                action={(d) =>
                  api(base, { method: "PUT", body: JSON.stringify(object(d)) })
                }
                onDone={reload}
              >
                <JobFields job={job} />
              </Form>
            )}
            <h3>{t("share")}</h3>
            <p>{t("linkHint")}</p>
            {job.links.map((l: any) => (
              <div className="record-row" key={l.id}>
                <small>{date(l.expires_at)}</small>
                {l.revoked ? (
                  <span>{t("rejected")}</span>
                ) : (
                  <Action
                    label="revoke"
                    secondary
                    confirm
                    action={async () => {
                      await api(base + "/links/" + l.id, { method: "DELETE" });
                      reload();
                    }}
                  />
                )}
              </div>
            ))}
          </>
        )}
      </section>
    </>
  );
}

export function Notifications() {
  const { t } = useTranslation();
  const { data, error, reload } = useLoad("/notifications");
  return (
    <>
      <Heading title="notifications" />
      <section className="panel padded">
        {error ? (
          <LoadError error={error} retry={reload} />
        ) : !data ? (
          <Loading />
        ) : !data.length ? (
          <Empty />
        ) : (
          data.map((n: any) => (
            <div
              className={"notification " + (n.read ? "read" : "")}
              key={n.id}
            >
              <Bell size={20} />
              <div>
                <Link to={"/app/jobs/" + n.job_id}>
                  {t(
                    n.message.split(": ")[0].toLowerCase().replaceAll(" ", "_"),
                  )}
                  : {n.message.split(": ").slice(1).join(": ")}
                </Link>
                <small>{date(n.created_at)}</small>
              </div>
              {!n.read && (
                <Action
                  label="markRead"
                  secondary
                  action={async () => {
                    await post("/notifications/" + n.id + "/read");
                    reload();
                  }}
                />
              )}
            </div>
          ))
        )}
      </section>
    </>
  );
}

export function Settings() {
  const { t } = useTranslation(),
    { user, setUser } = useContext(Auth),
    navigate = useNavigate(),
    { data: sessions, error, reload } = useLoad("/auth/sessions");
  return (
    <>
      <Heading title="settings" />
      <div className="two-columns">
        <section className="panel padded">
          <h2>{t("profile")}</h2>
          <Form
            action={(d) =>
              api("/auth/profile", {
                method: "PUT",
                body: JSON.stringify({
                  ...object(d),
                  email_notifications: d.has("email_notifications"),
                }),
              })
            }
            onDone={(u) => {
              setUser(u);
              void i18n.changeLanguage(u.language);
            }}
          >
            <Field name="name" value={user.name} maxLength={120} />
            <Field
              name="phone"
              type="tel"
              value={user.phone}
              required={false}
              maxLength={30}
            />
            <Select name="language" value={i18n.language}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="ta">தமிழ்</option>
              <option value="kn">ಕನ್ನಡ</option>
            </Select>
            <label className="checkbox">
              <input
                name="email_notifications"
                type="checkbox"
                defaultChecked={user.email_notifications}
              />
              {t("emailPreferences")}
            </label>
          </Form>
          <p>{user.email}</p>
          {user.verified ? (
            <Badge status="verified" />
          ) : (
            <Action
              label="verify"
              secondary
              action={() => post("/auth/request-verification")}
            />
          )}
        </section>
        <div>
          <section className="panel padded">
            <h2>{t("sessions")}</h2>
            {error && <LoadError error={error} retry={reload} />}
            {!sessions ? (
              <Loading />
            ) : (
              sessions.map((s: any) => (
                <div className="session" key={s.id}>
                  <p>
                    {s.agent || "Browser"}
                    <small>{date(s.created_at)}</small>
                  </p>
                  <Action
                    label="revoke"
                    secondary
                    confirm
                    action={async () => {
                      await api("/auth/sessions/" + s.id, { method: "DELETE" });
                      if (s.current) {
                        setUser(null);
                        navigate("/login");
                      } else reload();
                    }}
                  />
                </div>
              ))
            )}
          </section>
          <section className="panel padded danger">
            <h2>{t("deleteAccount")}</h2>
            <Form
              label="deleteAccount"
              action={(d) => {
                if (!window.confirm(t("confirm")))
                  return Promise.reject(new Error(t("cancel")));
                return api("/auth/account", {
                  method: "DELETE",
                  body: JSON.stringify(object(d)),
                });
              }}
              onDone={() => {
                setUser(null);
                navigate("/");
              }}
            >
              <Field
                name="password"
                type="password"
                autoComplete="current-password"
              />
            </Form>
          </section>
        </div>
      </div>
    </>
  );
}
