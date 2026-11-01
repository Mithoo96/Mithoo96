"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Workspace } from "@/server/auth/workspace";
const Context = createContext<Workspace | null>(null);
export function WorkspaceProvider({ workspace, children }: { workspace: Workspace; children: ReactNode }) {
  return <Context.Provider value={workspace}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const workspace = useContext(Context);
  if (!workspace) throw new Error("Workspace provider is missing");
  return workspace;
}
