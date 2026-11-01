import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mithoo — Business OS",
  description: "An operating system for your business.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
