import { AgencyProvider } from "@/components/agency/provider";
import type { Metadata } from "next";
import "./globals.css";
import { LaunchScreen } from "@/components/launch-screen";
import { OsProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/shell/app-shell";

// Runs before paint so the welcome screen shows every time the platform opens (no flash of the dashboard).
const launchScript = `document.documentElement.classList.add("launching")`;

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" as const };

export const metadata: Metadata = {
  title: "Mithoo Business OS",
  description: "Your business doesn't stop because you're not there.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: launchScript }} />
      </head>
      <body className="font-sans">
        <AgencyProvider>
        <LaunchScreen />
        <OsProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </OsProvider>
        </AgencyProvider>
      </body>
    </html>
  );
}
