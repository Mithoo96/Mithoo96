import { MessageSquare, Users } from "lucide-react";
import type { Channel } from "@/lib/types";
import { BrandIcon, brandName, type BrandKey } from "./brand-icon";

/** Channels a business talks to clients on. SMS and Internal have no external brand. */
export type ChannelKey = Channel;
const brandOf: Partial<Record<Channel, BrandKey>> = { email: "gmail", whatsapp: "whatsapp", instagram: "instagram", facebook: "facebook" };
export const channelBrand = (c: Channel) => brandOf[c];
export const channelLabel: Record<Channel, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook", internal: "Internal" };
export const channelLongName = (c: Channel) => (c === "email" ? "Gmail" : c === "internal" ? "Team" : brandOf[c] ? brandName(brandOf[c]!) : channelLabel[c]);

const box = { "2xs": "h-[18px] w-[18px] rounded-[6px]", xs: "h-6 w-6 rounded-[8px]", sm: "h-8 w-8 rounded-[10px]", md: "h-10 w-10 rounded-[13px]", lg: "h-14 w-14 rounded-[18px]" } as const;
const glyph = { "2xs": 10, xs: 12, sm: 15, md: 18, lg: 24 } as const;

export function ChannelIcon({ channel, size = "sm" }: { channel: Channel; size?: keyof typeof box }) {
  const b = brandOf[channel];
  if (b) return <BrandIcon brand={b} size={size} />;
  const I = channel === "sms" ? MessageSquare : Users;
  return <span className={`inline-flex shrink-0 items-center justify-center bg-white ring-1 ring-hair shadow-[0_1px_2px_rgba(16,16,40,0.04)] ${box[size]}`}><I size={glyph[size]} strokeWidth={1.7} className="text-ink-soft" /></span>;
}
