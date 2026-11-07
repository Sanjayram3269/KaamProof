// Configure the real public origin before enabling search indexing. Never infer it from Host headers.
const value = process.env.SITE_URL;
export const configuredSiteUrl = value ? new URL(value).origin : undefined;
if (value && !/^https?:$/.test(new URL(value).protocol))
  throw new Error("SITE_URL must be an HTTP or HTTPS origin");
export const metadataOrigin = new URL(
  configuredSiteUrl || "http://localhost:8080",
);
