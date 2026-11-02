"use client";
import type { ReactNode } from "react";
import * as prototype from "@/lib/prototype/doc-moise";
import { OsProvider } from "@/lib/store";
export function DocMoiseProvider({ children, viewerName }: { children: ReactNode; viewerName: string }) {
  return <OsProvider prototype={prototype} viewerName={viewerName}>{children}</OsProvider>;
}
