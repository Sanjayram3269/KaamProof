export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function csrfToken() {
  return (
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("kp_csrf="))
      ?.split("=")[1] || ""
  );
}
let refreshFlight: Promise<any> | null = null;
export async function api(
  path: string,
  options: RequestInit = {},
  token?: string,
  retry = true,
): Promise<any> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && options.body)
    headers.set("Content-Type", "application/json");
  if (token) headers.set("X-Customer-Token", token);
  else headers.set("X-CSRF-Token", csrfToken());
  const response = await fetch("/api/v1" + path, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (
    response.status === 401 &&
    !token &&
    retry &&
    Boolean(csrfToken()) &&
    (!path.startsWith("/auth/") || path === "/auth/me")
  ) {
    if (!refreshFlight)
      refreshFlight = api(
        "/auth/refresh",
        { method: "POST", body: "{}" },
        undefined,
        false,
      ).finally(() => {
        refreshFlight = null;
      });
    await refreshFlight;
    return api(path, options, token, false);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      data?.error?.message || "Unable to connect. Try again.",
    );
  }
  const data = await response.json();
  if (
    typeof window !== "undefined" &&
    options.method &&
    !["GET", "HEAD"].includes(options.method.toUpperCase()) &&
    !path.startsWith("/auth/")
  )
    window.dispatchEvent(new Event("kaamproof:change"));
  return data;
}
export const post = (path: string, body: unknown = {}, token?: string) =>
  api(path, { method: "POST", body: JSON.stringify(body) }, token);
export async function privateImage(path: string, token: string) {
  const response = await fetch("/api/v1" + path, {
    headers: { "X-Customer-Token": token },
  });
  if (!response.ok) throw new Error("Unable to load evidence");
  return URL.createObjectURL(await response.blob());
}
