import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
export default {
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
  output: "standalone",
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          (process.env.API_ORIGIN || "http://127.0.0.1:8000") + "/api/:path*",
      },
    ];
  },
};
