"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { MotionConfig } from "framer-motion";
import { site } from "@/content/site";

const BookingModal = dynamic(() => import("./BookingModal").then((m) => m.BookingModal), { ssr: false });

type BookingContextValue = {
  open: (source?: string) => void;
  close: () => void;
  isOpen: boolean;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [source, setSource] = useState<string>("site");

  const open = useCallback((src = "site") => {
    const { provider, url } = site.booking;
    // "link" mode hands visitors straight to the external scheduler.
    if (provider === "link" && url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setSource(src);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <MotionConfig reducedMotion="user">
      <BookingContext.Provider value={{ open, close, isOpen }}>
        {children}
        {isOpen && <BookingModal onClose={close} source={source} />}
      </BookingContext.Provider>
    </MotionConfig>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside <BookingProvider>");
  return ctx;
}
