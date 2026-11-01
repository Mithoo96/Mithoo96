import type { Metadata } from "next";
import "./globals.css";
import { LaunchScreen } from "@/components/launch-screen";
import { OsProvider } from "@/lib/store";
import { business } from "@/lib/config/business";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/shell/app-shell";

// Runs before paint so the welcome screen shows every time the platform opens (no flash of the dashboard).
const launchScript = `document.documentElement.classList.add("launching")`;

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" as const };

export const metadata: Metadata = {
  title: `${business.name} · Mithoo`,
  description: `${business.type} · Powered by Mithoo`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: launchScript }} />
      </head>
      <body className="font-sans">
        <LaunchScreen />
        <OsProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </OsProvider>
      </body>
    </html>
  );
}
