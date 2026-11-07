"use client";
import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "./navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { post } from "./api";
import i18n from "./i18n";
import { Auth, useLoad, text, object } from "./state";
import {
  Language,
  Brand,
  Badge,
  Loading,
  Empty,
  LoadError,
  Form,
  Field,
  Select,
  Heading,
  Timeline,
  EvidenceImage,
} from "./ui";
import { AgreementView } from "./worker-pages";

export { Landing } from "./landing";

export function AuthPage({
  mode,
}: {
  mode: "login" | "register" | "forgot" | "reset" | "verify";
}) {
  const { t } = useTranslation(),
    { setUser, ready } = useContext(Auth),
    navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [token] = useState(() =>
    typeof window === "undefined" ? "" : location.hash.slice(1),
  );
  useEffect(() => {
    if (token) history.replaceState(null, "", location.pathname);
  }, [token]);
  // Keep account actions behind the initial session check; public storytelling is independent.
  if (!ready)
    return (
      <main className="session-loading" id="main-content" tabIndex={-1}>
        <Loading />
      </main>
    );
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Brand />
        <div>
          <p className="eyebrow">{t("tagline")}</p>
          <h2>{t("hero")}</h2>
          <p>{t("heroText")}</p>
        </div>
        <small>{t("disclaimer")}</small>
      </aside>
      <main className="auth-main" id="main-content" tabIndex={-1}>
        <div className="auth-language">
          <Language />
        </div>
        <div className="auth-box">
          <Link className="auth-home" to="/">
            <ArrowLeft size={16} />
            {t("pub.backHome")}
          </Link>
          <h1>
            {t(
              {
                login: "login",
                register: "register",
                forgot: "reset",
                reset: "reset",
                verify: "verify",
              }[mode],
            )}
          </h1>
          <p>{t("tagline")}</p>
          {message ? (
            <div role="status" className="notice">
              {message}
              <Link to="/login">{t("login")}</Link>
            </div>
          ) : (
            <Form
              label={
                mode === "forgot"
                  ? "sendReset"
                  : mode === "reset"
                    ? "reset"
                    : mode === "verify"
                      ? "verify"
                      : mode
              }
              action={async (data) => {
                if (mode === "forgot")
                  return post("/auth/forgot-password", object(data));
                if (mode === "reset")
                  return post("/auth/reset-password", {
                    token,
                    password: text(data, "password"),
                  });
                if (mode === "verify")
                  return post("/auth/verify-email", { token });
                return post("/auth/" + mode, {
                  ...object(data),
                  ...(mode === "register" ? { language: i18n.language } : {}),
                });
              }}
              onDone={(result) => {
                if (mode === "login" || mode === "register") {
                  setUser(result);
                  void i18n.changeLanguage(result.language);
                  navigate("/app");
                } else
                  setMessage(
                    i18n.language === "en" ? result.message : t("saved"),
                  );
              }}
            >
              {mode === "register" && (
                <Field name="name" maxLength={120} autoComplete="name" />
              )}
              {["login", "register", "forgot"].includes(mode) && (
                <Field
                  name="email"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                />
              )}
              {["login", "register", "reset"].includes(mode) && (
                <Field
                  name="password"
                  type="password"
                  minLength={10}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
              )}
            </Form>
          )}
          {mode === "login" && <Link to="/forgot-password">{t("forgot")}</Link>}
          <div className="auth-bottom">
            <Link to={mode === "register" ? "/login" : "/register"}>
              {t(mode === "register" ? "login" : "register")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export function Portal() {
  const { t } = useTranslation(),
    [token, setToken] = useState(() =>
      typeof window === "undefined" ? "" : location.hash.slice(1),
    ),
    { data, error, reload } = useLoad("/portal", token);
  useEffect(() => {
    const refresh = () => {
      const next = location.hash.slice(1);
      if (next) setToken(next);
      history.replaceState(null, "", "/portal");
      reload();
    };
    history.replaceState(null, "", "/portal");
    window.addEventListener("hashchange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("hashchange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return (
    <div className="portal">
      <header>
        <Brand />
        <Language />
      </header>
      <main id="main-content" tabIndex={-1}>
        <Heading title="portal" />
        {error ? (
          <LoadError error={error} retry={reload} />
        ) : !data ? (
          <Loading />
        ) : (
          <>
            <div className="panel padded">
              <div className="section-head">
                <h1>{data.title}</h1>
                <Badge status={data.status} />
              </div>
              <p>{data.description}</p>
              <p>{data.location}</p>
              <div className="notice">{t("disclaimer")}</div>
              {!data.is_current && <p className="error">{t("stale")}</p>}
              <AgreementView agreement={data.agreement} />
              {data.is_current &&
                data.agreement.decision === "pending" &&
                data.status === "awaiting_approval" && (
                  <Form
                    label="save"
                    action={(d) =>
                      post(
                        "/portal/decision",
                        {
                          agreement_id: data.agreement.id,
                          decision: text(d, "decision"),
                          notes: text(d, "notes"),
                        },
                        token,
                      )
                    }
                    onDone={reload}
                  >
                    <Field name="notes" type="textarea" required={false} />
                    <Select name="decision">
                      <option value="approved">{t("approve")}</option>
                      <option value="rejected">{t("reject")}</option>
                    </Select>
                  </Form>
                )}
            </div>
            <section className="panel padded">
              <h2>{t("evidence")}</h2>
              <div className="evidence-grid">
                {data.evidence.map((e: any) => (
                  <EvidenceImage item={e} token={token} key={e.id} />
                ))}
              </div>
              {!data.evidence.length && <Empty />}
            </section>
            {data.completion_number > 0 && (
              <section className="panel padded">
                <h2>{t("completion")}</h2>
                <p>{data.completion_notes}</p>
                {data.status === "completion_pending" && data.is_current && (
                  <Form
                    label="save"
                    action={(d) =>
                      post(
                        "/portal/completion",
                        {
                          completion_number: data.completion_number,
                          decision: text(d, "decision"),
                          notes: text(d, "notes"),
                        },
                        token,
                      )
                    }
                    onDone={reload}
                  >
                    <Select name="decision">
                      <option value="acknowledged">{t("acknowledge")}</option>
                      <option value="disputed">{t("dispute")}</option>
                    </Select>
                    <Field name="notes" type="textarea" required={false} />
                  </Form>
                )}
              </section>
            )}
            <section className="panel padded">
              <h2>{t("activity")}</h2>
              <Timeline items={data.timeline} />
              <Form
                label="comment"
                action={(d) => post("/portal/comments", object(d), token)}
                onDone={reload}
              >
                <Field name="notes" type="textarea" />
              </Form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="empty" id="main-content" tabIndex={-1}>
      <h1>404</h1>
      <h2>{t("notFound")}</h2>
      <Link to="/app">{t("goHome")}</Link>
    </main>
  );
}

export function Help() {
  const { t } = useTranslation();
  return (
    <>
      <Heading title="help" />
      <article className="panel padded help">
        <ShieldCheck size={36} />
        <h2>{t("tagline")}</h2>
        <p>{t("helpText")}</p>
        <p className="notice">{t("disclaimer")}</p>
        <Link to="/app/jobs/new" className="button">
          {t("newJob")}
        </Link>
      </article>
    </>
  );
}
