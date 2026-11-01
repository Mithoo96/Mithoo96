import type { Metadata } from "next";
import "./globals.css";
import { LaunchScreen } from "@/components/launch-screen";
import { LAUNCH_KEY } from "@/lib/greeting";
import { OsProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/shell/app-shell";

// Runs before paint: decide whether today's launch screen should show (no flash of dashboard).
const launchScript = `try{if(localStorage.getItem("${LAUNCH_KEY}")!==new Date().toDateString())document.documentElement.classList.add("launching")}catch(e){}`;

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" as const };

export const metadata: Metadata = {
  title: "Mithoo — Business OS",
  description: "An operating system for your business.",
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
