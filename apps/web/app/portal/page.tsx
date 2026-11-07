import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Shared work record — KaamProof",
  robots: { index: false, follow: false },
};
import { Portal } from "../../src/public-pages";
export default function Page() {
  return <Portal />;
}
