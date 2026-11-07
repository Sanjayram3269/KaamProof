"use client";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  BriefcaseBusiness,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  Link,
  NavLink,
  Navigate,
  useLocation,
  useNavigate,
} from "./navigation";
import { Auth } from "./state";
import { api, post } from "./api";
import { Action, Brand, Language, Loading } from "./ui";
import "./experience-i18n";

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, setUser, ready } = useContext(Auth),
    { t } = useTranslation(),
    navigate = useNavigate(),
    { pathname } = useLocation();
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [q, setQ] = useState(""),
    [unread, setUnread] = useState<number | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 800px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (searchOpen)
      (
        document.querySelector(".global-search input") as HTMLInputElement
      )?.focus();
  }, [searchOpen]);
  useEffect(() => {
    if (!open || !mobile) return;
    const drawer = document.querySelector(".sidebar")!;
    const links = () =>
      Array.from(drawer.querySelectorAll<HTMLElement>("a,button")).filter(
        (el) => el.getClientRects().length > 0,
      );
    links()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = links(),
        first = list[0],
        last = list.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = overflow;
      (document.querySelector(".mobile-menu") as HTMLButtonElement)?.focus();
    };
  }, [open, mobile]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const refresh = () => {
      void api("/notifications/summary")
        .then((d) => {
          if (active) setUnread(d.unread);
        })
        .catch(() => {
          if (active) setUnread(null);
        });
    };
    refresh();
    window.addEventListener("kaamproof:change", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("kaamproof:change", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [user?.id, pathname]);
  if (!ready)
    return (
      <main className="session-loading" id="main-content" tabIndex={-1}>
        <Loading />
      </main>
    );
  if (!user) return <Navigate to="/login" replace />;
  const work = [
    ["", "dashboard", LayoutDashboard],
    ["/jobs", "jobs", BriefcaseBusiness],
    ["/customers", "customers", Users],
    ["/payments", "payments", Wallet],
  ] as const;
  const manage = [
    ["/notifications", "notifications", Bell],
    ["/settings", "settings", Settings],
    ["/help", "help", CircleHelp],
  ] as const;
  const current =
    [...work, ...manage].find(
      ([path]) => path && pathname.startsWith("/app" + path),
    )?.[1] || "dashboard";
  return (
    <div className="app-shell">
      {open && (
        <button
          className="nav-backdrop"
          aria-label={t("cancel")}
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        inert={mobile && !open}
        aria-hidden={mobile && !open ? true : undefined}
        className={"sidebar" + (open ? " open" : "")}
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="sidebar-close icon-button"
            aria-label={t("cancel")}
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-switch">
          <span className="workspace-avatar">{user.name[0].toUpperCase()}</span>
          <span>
            <strong>{t("xp.workspace")}</strong>
            <small>{t("tagline")}</small>
          </span>
        </div>
        <p className="nav-group-label">{t("xp.workspace")}</p>
        <nav aria-label={t("xp.workspace")}>
          {work.map(([path, key, Icon]) => (
            <NavLink
              end={!path}
              key={key}
              aria-label={t(key)}
              to={"/app" + path}
            >
              <Icon size={18} />
              <span>{t(key)}</span>
              {!path && <span className="nav-active-dot" />}
            </NavLink>
          ))}
        </nav>
        <p className="nav-group-label">{t("xp.manage")}</p>
        <nav aria-label={t("xp.manage")}>
          {manage.map(([path, key, Icon]) => (
            <NavLink key={key} aria-label={t(key)} to={"/app" + path}>
              <Icon size={18} />
              <span>{t(key)}</span>
              {key === "notifications" && unread !== null && unread > 0 && (
                <span className="nav-count">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-proof">
            <span>
              <ShieldCheck size={20} />
            </span>
            <strong>{t("xp.private")}</strong>
            <p>{t("xp.privateHint")}</p>
            <Link to="/app/help">
              {t("help")}
              <ChevronRight size={13} />
            </Link>
          </div>
          <Link
            className="user-chip"
            to="/app/profile"
            aria-label={t("profile")}
          >
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>{t("profile")}</small>
            </span>
            <ChevronRight size={15} />
          </Link>
          <Action
            label="logout"
            secondary
            action={async () => {
              await post("/auth/logout");
              setUser(null);
              navigate("/login");
            }}
          />
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-leading">
            <button
              className="icon-button mobile-menu"
              aria-label={t("xp.menu")}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              <span className="breadcrumb-mark">
                <LayoutDashboard size={15} />
              </span>
              <span>{t("xp.workspace")}</span>
              <ChevronRight size={12} />
              <strong>
                {current === "dashboard" ? t("xp.overview") : t(current)}
              </strong>
            </div>
          </div>
          <form
            className={"global-search" + (searchOpen ? " search-open" : "")}
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(
                "/app/jobs?" +
                  new URLSearchParams(q.trim() ? { q: q.trim() } : {}),
              );
              setSearchOpen(false);
            }}
          >
            <Search size={17} />
            <input
              aria-label={t("xp.globalSearch")}
              placeholder={t("xp.globalSearch")}
              value={q}
              maxLength={180}
              onChange={(e) => setQ(e.target.value)}
            />
            <button
              type="submit"
              className="search-submit"
              aria-label={t("search")}
            >
              <ChevronRight size={15} />
            </button>
          </form>
          <div className="topbar-tools">
            <button
              className="icon-button mobile-search"
              aria-label={t("xp.openSearch")}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search size={19} />
            </button>
            <Language />
            <span className="topbar-divider" />
            <Link
              className="notification-button icon-button"
              to="/app/notifications"
              aria-label={t("notifications")}
            >
              <Bell size={19} />
              {unread !== null && unread > 0 && (
                <span>{unread > 99 ? "99+" : unread}</span>
              )}
            </Link>
            <Link
              className="avatar topbar-avatar"
              to="/app/profile"
              aria-label={t("profile")}
            >
              {user.name[0].toUpperCase()}
            </Link>
          </div>
        </header>
        <main className="content" id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer>{t("disclaimer")}</footer>
      </div>
    </div>
  );
}
