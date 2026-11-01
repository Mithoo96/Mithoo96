import type { Metadata } from "next";
import { PasswordSetup } from "./password-setup";

export const metadata: Metadata = { referrer: "no-referrer", robots: { index: false, follow: false } };
export default function PasswordSetupPage() {
  return <PasswordSetup />;
}
