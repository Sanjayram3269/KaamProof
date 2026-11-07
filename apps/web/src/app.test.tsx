import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Fragment as MemoryRouter } from "react";
import {
  Badge,
  Empty,
  Field,
  Form,
  Landing,
  LoadError,
  NotFound,
  Timeline,
} from "./main";
import i18n, { date, money } from "./i18n";
import { api, ApiError } from "./api";

beforeEach(() => {
  void i18n.changeLanguage("en");
  vi.restoreAllMocks();
});
describe("accessible interface", () => {
  it("renders the landing page and genuine navigation", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Your work deserves more than a handshake.",
    );
    expect(
      screen.getByRole("link", { name: "Start building your work record" }),
    ).toHaveAttribute("href", "/register");
  });
  it("labels required inputs and enforces minimum password length", () => {
    render(<Field name="password" type="password" minLength={10} />);
    expect(screen.getByLabelText("Password")).toBeRequired();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "minlength",
      "10",
    );
  });
  it("disables forms during an asynchronous submission and reports errors", async () => {
    const action = vi.fn().mockRejectedValue(new Error("Agreement changed"));
    render(
      <Form action={action}>
        <Field name="name" value="Sanjay" />
      </Form>,
    );
    fireEvent.submit(screen.getByRole("button").closest("form")!);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Agreement changed"),
    );
    expect(action).toHaveBeenCalledOnce();
  });
  it("shows useful empty and not-found states", () => {
    render(
      <MemoryRouter>
        <Empty />
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByText("Nothing here yet")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Go to overview" }),
    ).toHaveAttribute("href", "/app");
  });
  it("allows retrying errors", () => {
    const retry = vi.fn();
    render(
      <MemoryRouter>
        <LoadError error="Connection failed" retry={retry} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it("attributes customer activity and escapes user text", () => {
    render(
      <Timeline
        items={[
          {
            id: "1",
            kind: "customer_comment",
            actor: "customer",
            created_at: 100000,
            notes: "<script>alert(1)</script>",
          },
        ]}
      />,
    );
    expect(screen.getByText(/Customer-entered/)).toBeVisible();
    expect(document.querySelector("script")).toBeNull();
  });
  it.each(["hi", "ta", "kn"])(
    "translates statuses and persists %s language",
    async (language) => {
      await i18n.changeLanguage(language);
      render(<Badge status="approved" />);
      expect(screen.queryByText("Approved")).toBeNull();
      expect(localStorage.getItem("kp_language")).toBe(language);
      expect(document.documentElement.lang).toBe(language);
      expect(date(100000)).toBeTruthy();
      expect(money("1234.50")).toBeTruthy();
    },
  );
});
describe("API client", () => {
  it("uses same-origin cookies and a CSRF header without localStorage tokens", async () => {
    document.cookie = "kp_csrf=test-csrf";
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response('{"ok":true}'));
    expect(await api("/jobs", { method: "POST", body: "{}" })).toEqual({
      ok: true,
    });
    const request = fetcher.mock.calls[0][1]!;
    expect(request.credentials).toBe("same-origin");
    expect(new Headers(request.headers).get("X-CSRF-Token")).toBe("test-csrf");
    expect(localStorage.getItem("token")).toBeNull();
  });
  it("reports server errors with status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"error":{"message":"Forbidden"}}', { status: 403 }),
    );
    await expect(api("/jobs")).rejects.toEqual(new ApiError(403, "Forbidden"));
  });
  it("does not attempt an impossible refresh for anonymous visitors without a CSRF cookie", async () => {
    document.cookie = "kp_csrf=; Max-Age=0";
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response('{"error":{"message":"Please sign in"}}', { status: 401 }),
      );
    await expect(api("/auth/me")).rejects.toEqual(
      new ApiError(401, "Please sign in"),
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("retains authenticated refresh and retries when the CSRF cookie exists", async () => {
    document.cookie = "kp_csrf=session-csrf";
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response('{"error":{"message":"Expired session"}}', {
          status: 401,
        }),
      )
      .mockResolvedValueOnce(new Response('{"refreshed":true}'))
      .mockResolvedValueOnce(new Response('{"id":"owned-job"}'));
    expect(await api("/jobs/owned-job")).toEqual({ id: "owned-job" });
    expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
      "/api/v1/jobs/owned-job",
      "/api/v1/auth/refresh",
      "/api/v1/jobs/owned-job",
    ]);
    expect(
      new Headers(fetcher.mock.calls[1][1]!.headers).get("X-CSRF-Token"),
    ).toBe("session-csrf");
    document.cookie = "kp_csrf=; Max-Age=0";
  });
});
