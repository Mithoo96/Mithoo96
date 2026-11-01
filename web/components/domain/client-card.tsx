"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Client } from "@/lib/types";
import { Avatar, StatusBadge } from "@/components/ui/primitives";
import { clientStage, clientStatus, clientTypeLabel } from "./meta";

export const clientGrid = "md:grid-cols-[40px_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,0.75fr)_minmax(0,1.4fr)_132px_16px]";

export function ClientCard({ client }: { client: Client }) {
  const s = clientStatus[client.status];
  return (
    <Link href={`/clients/${client.id}`}
      className={`group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[20px] px-4 py-4 transition-all duration-300 hover:bg-white hover:shadow-[0_10px_30px_-14px_rgba(40,40,110,0.18)] hover:ring-1 hover:ring-hair ${clientGrid}`}>
      <Avatar name={client.name} size={40} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium tracking-[-0.01em]">{client.name}</p>
        <p className="truncate text-[13px] text-mute"><span className="md:hidden">{clientStage(client)} · </span>{client.service}<span className="hidden lg:inline"> · {clientTypeLabel(client.lines)}</span></p>
      </div>
      <p className="hidden truncate text-[14px] text-ink-soft md:block">{clientStage(client)}</p>
      <p className="hidden truncate text-[13px] text-mute md:block">{client.lastContact}</p>
      <p className="hidden truncate text-[14px] text-ink-soft md:block">{client.nextAction}</p>
      <div className="hidden md:block"><StatusBadge tone={s.tone}>{s.label}</StatusBadge></div>
      <div className="flex items-center gap-2">
        <span className="md:hidden"><StatusBadge tone={s.tone}>{s.label}</StatusBadge></span>
        <ChevronRight size={16} className="text-mute transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
