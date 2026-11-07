import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
import { Shell } from "../../src/worker-pages";
export default function Workspace({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
