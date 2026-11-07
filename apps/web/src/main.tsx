"use client";
import React, { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { api } from "./api";
import i18n from "./i18n";
import "./events";
import { Auth, Toast } from "./state";
import { Loading, ErrorBoundary } from "./ui";
function App({ children }: { children: React.ReactNode }) {
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
  if (!ready) return <Loading />;
  return (
    <Auth.Provider value={{ user, setUser }}>
      <Toast.Provider value={setToast}>
        <>
          <a href="#main-content" className="skip-link">
            {i18n.t("dashboard")}
          </a>
          <div id="main-content">{children}</div>
          {toast && (
            <div className="toast" role="status">
              <Check size={18} />
              {toast}
              <button
                aria-label={i18n.t("cancel")}
                onClick={() => setToast("")}
              >
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
