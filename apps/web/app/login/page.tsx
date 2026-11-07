import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Sign in — KaamProof",
  robots: { index: false, follow: false },
};
import { AuthPage } from "../../src/public-pages";
export default function Page() {
  return <AuthPage mode="login" />;
}
