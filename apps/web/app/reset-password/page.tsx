import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Reset password — KaamProof",
  robots: { index: false, follow: false },
};
import { AuthPage } from "../../src/public-pages";
export default function Page() {
  return <AuthPage mode="reset" />;
}
