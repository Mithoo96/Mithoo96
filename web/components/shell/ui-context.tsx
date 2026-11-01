"use client";

import { createContext, useContext } from "react";

export interface ShellUi { openAssistant: (prompt?: string) => void; openSearch: () => void; openNotifications: () => void; openMenu: () => void }
export const ShellCtx = createContext<ShellUi>({ openAssistant: () => {}, openSearch: () => {}, openNotifications: () => {}, openMenu: () => {} });
export const useShell = () => useContext(ShellCtx);
