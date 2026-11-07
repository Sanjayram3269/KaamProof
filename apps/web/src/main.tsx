"use client";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { api } from "./api";
import i18n from "./i18n";
import "./events";
import "./experience-i18n";
import "./marketing-i18n";
import { Auth, Toast } from "./state";
import { ErrorBoundary } from "./ui";
function App({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null),
    [ready, setReady] = useState(false),
    [toast, setToast] = useState("");
  useEffect(() => {
    localStorage.removeItem("kp_token");
    void i18n.changeLanguage(localStorage.getItem("kp_language") || "en");
    api("/auth/me")
      .then((u) => {
        setUser(u);
        void i18n.changeLanguage(u.language);
      })
      .catch(() => {
        /* Signed-out visitor; private routes redirect to sign-in. */
      })
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <Auth.Provider value={{ user, setUser, ready }}>
      <Toast.Provider value={setToast}>
        <>
          <a href="#main-content" className="skip-link">
            {t("pub.skip")}
          </a>
          <div className="page-root">{children}</div>
          {toast && (
            <div className="toast" role="status">
              <Check size={18} />
              {toast}
              <button aria-label={t("cancel")} onClick={() => setToast("")}>
                <X size={15} />
              </button>
            </div>
          )}
        </>
      </Toast.Provider>
    </Auth.Provider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <App>{children}</App>
    </ErrorBoundary>
  );
}
export { Badge, Empty, Field, Form, LoadError, Timeline } from "./ui";
export { Landing, NotFound } from "./public-pages";
