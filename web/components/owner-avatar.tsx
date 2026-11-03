"use client";

import { useState } from "react";
import { useBusiness } from "@/components/agency/provider";
import { Avatar } from "@/components/ui/primitives";

/** Owner photo from the business config, with an initials fallback. */
export function OwnerAvatar({ size = 40, className = "" }: { size?: number; className?: string }) {
  const business = useBusiness();
  const [failed, setFailed] = useState(false);
  if (failed || !business.owner.image) return <Avatar name={business.owner.name} size={size} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={business.owner.image} alt={business.owner.name} width={size} height={size} onError={() => setFailed(true)}
      style={{ width: size, height: size, objectPosition: "50% 22%" }} className={`shrink-0 rounded-full object-cover ring-2 ring-white shadow-[0_2px_10px_-2px_rgba(30,30,80,0.25)] ${className}`} />
  );
}
