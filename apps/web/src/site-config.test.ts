import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
describe("public origin configuration", () => {
  it("keeps local installations without a fictional public canonical origin", async () => {
    vi.stubEnv("SITE_URL", "");
    vi.resetModules();
    const { configuredSiteUrl, metadataOrigin } = await import("./site-config");
    expect(configuredSiteUrl).toBeUndefined();
    expect(metadataOrigin.origin).toBe("http://localhost:8080");
  });
  it("uses the configured origin without carrying query strings or private paths", async () => {
    vi.stubEnv("SITE_URL", "https://product.example/nested?test=1");
    vi.resetModules();
    const { configuredSiteUrl } = await import("./site-config");
    expect(configuredSiteUrl).toBe("https://product.example");
  });
  it("rejects non-web origins", async () => {
    vi.stubEnv("SITE_URL", "ftp://product.example");
    vi.resetModules();
    await expect(import("./site-config")).rejects.toThrow(
      "SITE_URL must be an HTTP or HTTPS origin",
    );
  });
});
