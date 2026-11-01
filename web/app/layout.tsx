import type { Metadata } from "next";
import "./globals.css";
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" as const };
export const metadata: Metadata = { title: "Mithoo Business OS", description: "Your Business Is Moving." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" suppressHydrationWarning><body className="font-sans">{children}</body></html>;
}
