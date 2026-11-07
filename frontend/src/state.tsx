import { createContext, useEffect, useState } from "react";
import { api, ApiError } from "./api";
import i18n from "./i18n";

export const Auth = createContext<{ user: any; setUser: (u: any) => void }>({
  user: null,
  setUser: () => {},
});

export const Toast = createContext<(message: string) => void>(() => {});

export const statuses = [
  "draft",
  "awaiting_approval",
  "approved",
  "in_progress",
  "completion_pending",
  "completed",
  "disputed",
];

export function errorMessage(error: unknown) {
  if (i18n.language === "en" && error instanceof Error) return error.message;
  if (error instanceof ApiError && error.status === 401)
    return i18n.t("sessionError");
  return i18n.t(error instanceof TypeError ? "networkError" : "genericError");
}

export function useLoad(path: string, token?: string) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api(path, {}, token)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [path, token, version]);
  return { data, error, reload: () => setVersion((v) => v + 1) };
}

export const text = (data: FormData, key: string) =>
  String(data.get(key) || "");

export const object = (data: FormData) => Object.fromEntries(data.entries());
