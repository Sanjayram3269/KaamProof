import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Check, X } from "lucide-react";
import { api } from "./api";
import i18n from "./i18n";
import "./events";
import "./styles.css";
import { Auth, Toast } from "./state";
import { Loading, ErrorBoundary } from "./ui";
import { Landing, AuthPage, Portal, NotFound, Help } from "./public-pages";
import {
  Shell,
  Dashboard,
  Jobs,
  Customers,
  NewJob,
  JobDetail,
  Notifications,
  Settings,
} from "./worker-pages";

function App() {
  const [user, setUser] = useState<any>(null),
    [ready, setReady] = useState(false),
    [toast, setToast] = useState("");
  useEffect(() => {
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
        <BrowserRouter>
          <a href="#main-content" className="skip-link">
            {i18n.t("dashboard")}
          </a>
          <div id="main-content">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              <Route
                path="/forgot-password"
                element={<AuthPage mode="forgot" />}
              />
              <Route
                path="/reset-password"
                element={<AuthPage mode="reset" />}
              />
              <Route
                path="/verify-email"
                element={<AuthPage mode="verify" />}
              />
              <Route path="/portal" element={<Portal />} />
              <Route path="/app" element={<Shell />}>
                <Route index element={<Dashboard />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="jobs/new" element={<NewJob />} />
                <Route path="jobs/:id" element={<JobDetail />} />
                <Route path="customers" element={<Customers />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="profile" element={<Settings />} />
                <Route path="settings" element={<Settings />} />
                <Route path="help" element={<Help />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
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
        </BrowserRouter>
      </Toast.Provider>
    </Auth.Provider>
  );
}

const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
export { Badge, Empty, Field, Form, LoadError, Timeline } from "./ui";
export { Landing, NotFound } from "./public-pages";
