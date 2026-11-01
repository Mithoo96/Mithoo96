import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BrandIcon, type BrandKey } from "@/components/brand-icon";

/** One row of activity: brand tile when an external service did it, otherwise a neutral Lucide icon. */
export function ActivityItem({ brand, icon: Icon, title, detail, when, trailing }: { brand?: BrandKey; icon?: LucideIcon; title: ReactNode; detail?: ReactNode; when?: string; trailing?: ReactNode }) {
  return (
    <div className="flex items-start gap-3.5">
      {brand ? <BrandIcon brand={brand} size="sm" /> : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-white to-[#f5f4fa] ring-1 ring-hair">
          {Icon && <Icon size={15} strokeWidth={1.7} className="text-ink-soft" />}
        </span>
      )}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[14px] font-medium leading-snug tracking-[-0.01em]">{title}</p>
        {detail && <p className="mt-0.5 text-[13px] text-mute">{detail}</p>}
      </div>
      {when && <span className="shrink-0 pt-0.5 text-[12px] text-mute">{when}</span>}
      {trailing}
    </div>
  );
}
