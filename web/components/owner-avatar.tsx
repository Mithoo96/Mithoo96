"use client";

import { useState } from "react";
import { useWorkspace } from "@/components/shell/workspace";
import { Avatar } from "@/components/ui/primitives";

/** Owner photo from the business config, with an initials fallback. */
export function OwnerAvatar({ size = 40, className = "" }: { size?: number; className?: string }) {
  const { profile } = useWorkspace();
  const [failed, setFailed] = useState(false);
  if (failed || !profile.viewer.avatarUrl) return <Avatar name={(profile.viewer.name ?? "Account")} size={size} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={profile.viewer.avatarUrl} alt={(profile.viewer.name ?? "Account")} width={size} height={size} onError={() => setFailed(true)}
      style={{ width: size, height: size, objectPosition: "50% 22%" }} className={`shrink-0 rounded-full object-cover ring-2 ring-white shadow-[0_2px_10px_-2px_rgba(30,30,80,0.25)] ${className}`} />
  );
}
