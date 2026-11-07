import React, { Component, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
import { api, privateImage } from "./api";
import i18n, { date, money } from "./i18n";
import { Auth, Toast, errorMessage } from "./state";

export function Language() {
  const { t, i18n } = useTranslation();
  const { user, setUser } = useContext(Auth),
    toast = useContext(Toast);
  return (
    <select
      className="language"
      aria-label={t("language")}
      value={i18n.language}
      onChange={async (e) => {
        const language = e.target.value;
        await i18n.changeLanguage(language);
        if (user) {
          try {
            setUser(
              await api("/auth/profile", {
                method: "PUT",
                body: JSON.stringify({
                  name: user.name,
                  phone: user.phone,
                  email_notifications: user.email_notifications,
                  language,
                }),
              }),
            );
          } catch (error) {
            toast(errorMessage(error));
          }
        }
      }}
    >
      <option value="en">English</option>
      <option value="hi">हिन्दी</option>
      <option value="ta">தமிழ்</option>
      <option value="kn">ಕನ್ನಡ</option>
    </select>
  );
}

export function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-icon">
        <ClipboardCheck size={23} />
      </span>
      kaam<span>proof</span>
      <span className="brand-dot">.</span>
    </Link>
  );
}

export function Badge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className={"badge " + status}>
      <span />
      {t(status)}
    </span>
  );
}

export function Loading() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t("loading")} className="skeletons">
      <div />
      <div />
      <div />
    </div>
  );
}

export function Empty() {
  const { t } = useTranslation();
  return (
    <div className="empty">
      <BriefcaseBusiness size={32} />
      <h3>{t("empty")}</h3>
      <p>{t("emptyHint")}</p>
    </div>
  );
}

export function LoadError({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="error" role="alert">
      <p>{error}</p>
      <button className="secondary" onClick={retry}>
        {t("retry")}
      </button>
      <Link to="/login">{t("login")}</Link>
    </div>
  );
}

export function Form({
  children,
  action,
  label = "save",
  onDone,
}: {
  children: React.ReactNode;
  action: (data: FormData) => Promise<any>;
  label?: string;
  onDone?: (data: any) => void;
}) {
  const { t } = useTranslation(),
    toast = useContext(Toast);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setBusy(true);
        setError("");
        try {
          const result = await action(data);
          toast(t("saved"));
          onDone?.(result);
        } catch (e) {
          setError(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        {children}
        <div className="form-actions">
          <button type="submit">
            {busy ? t("loading") : t(label)} {!busy && <ArrowRight size={16} />}
          </button>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}

export function Field({
  name,
  label,
  type = "text",
  value,
  required = true,
  ...rest
}: {
  name: string;
  label?: string;
  type?: string;
  value?: string | number;
  required?: boolean;
  [key: string]: any;
}) {
  const { t } = useTranslation();
  return (
    <label className="field">
      <span>{t(label || name)}</span>
      {type === "textarea" ? (
        <textarea
          name={name}
          defaultValue={value}
          required={required}
          maxLength={10000}
          {...rest}
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={value}
          required={required}
          onInvalid={(e) => e.currentTarget.setCustomValidity(t("required"))}
          onInput={(e) => e.currentTarget.setCustomValidity("")}
          {...rest}
        />
      )}
    </label>
  );
}

export function Select({
  name,
  children,
  value,
  label,
}: {
  name: string;
  children: React.ReactNode;
  value?: string;
  label?: string;
}) {
  const { t } = useTranslation();
  return (
    <label className="field">
      <span>{t(label || name)}</span>
      <select name={name} defaultValue={value} required>
        {children}
      </select>
    </label>
  );
}

export function Action({
  label,
  action,
  confirm = false,
  secondary = false,
}: {
  label: string;
  action: () => Promise<any>;
  confirm?: boolean;
  secondary?: boolean;
}) {
  const { t } = useTranslation(),
    toast = useContext(Toast);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button
        disabled={busy}
        className={secondary ? "secondary" : ""}
        onClick={async () => {
          if (confirm && !window.confirm(t("confirm"))) return;
          setBusy(true);
          setError("");
          try {
            await action();
            toast(t("saved"));
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {t(label)}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export function Heading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="heading">
      <div>
        <p className="eyebrow">KAAMPROOF / {t("jobs")}</p>
        <h1>{t(title)}</h1>
        {subtitle && <p>{t(subtitle)}</p>}
      </div>
      {children}
    </div>
  );
}

export function JobCards({ jobs }: { jobs: any[] }) {
  const { t } = useTranslation();
  return jobs.length ? (
    <div className="job-list">
      {jobs.map((j) => (
        <Link to={"/app/jobs/" + j.id} className="job-row" key={j.id}>
          <span className="job-icon">
            <BriefcaseBusiness size={22} />
          </span>
          <div className="job-primary">
            <strong>{j.title}</strong>
            <small>
              {j.customer_name} · {j.category}
            </small>
          </div>
          <Badge status={j.status} />
          <div className="job-amount">
            {j.agreement ? money(j.agreement.total, j.agreement.currency) : "—"}
            <small>{date(j.created_at)}</small>
          </div>
          <ChevronRight size={18} aria-label={t("next")} />
        </Link>
      ))}
    </div>
  ) : (
    <Empty />
  );
}

export function Timeline({ items }: { items: any[] }) {
  const { t } = useTranslation();
  return items.length ? (
    <ol className="timeline">
      {items.map((item) => (
        <li key={item.id}>
          <span className="timeline-dot">
            <Check size={12} />
          </span>
          <div>
            <strong>{t(item.kind)}</strong>
            <small>
              {t(item.actor === "customer" ? "customerActor" : item.actor)} ·{" "}
              {date(item.created_at)}
            </small>
            {item.notes && <p className="prewrap">{item.notes}</p>}
          </div>
        </li>
      ))}
    </ol>
  ) : (
    <Empty />
  );
}

export function EvidenceImage({
  item,
  jobId,
  token,
}: {
  item: any;
  jobId?: string;
  token?: string;
}) {
  const [source, setSource] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!token) {
      setSource(`/api/v1/jobs/${jobId}/evidence/${item.id}`);
      return;
    }
    let active = true,
      url = "";
    privateImage("/portal/evidence/" + item.id, token)
      .then((value) => {
        url = value;
        if (active) setSource(value);
        else URL.revokeObjectURL(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [item.id, jobId, token]);
  return (
    <figure>
      {source ? (
        <a href={source} target="_blank" rel="noreferrer">
          <img
            src={source}
            alt={item.caption || i18n.t("evidence")}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        </a>
      ) : (
        <Loading />
      )}
      {failed && <p role="alert">{i18n.t("networkError")}</p>}
      <figcaption>
        {item.caption}
        <small>{date(item.created_at)}</small>
      </figcaption>
    </figure>
  );
}

export class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div role="alert" className="empty">
        <h1>{i18n.t("genericError")}</h1>
        <button onClick={() => location.reload()}>{i18n.t("retry")}</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
