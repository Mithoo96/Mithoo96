"use client";

import { useEffect, useState } from "react";
import { getDayPart, greetings, type DayPart } from "@/lib/greeting";

/** Renders "Good morning/afternoon/evening". Server renders morning; client corrects to local time. */
export function Greeting({ name, emoji = false, punctuation = "" }: { name: string; emoji?: boolean; punctuation?: string }) {
  const [part, setPart] = useState<DayPart>("morning");
  useEffect(() => setPart(getDayPart()), []);
  const g = greetings[part];
  return <>{g.text}, {name}{punctuation}{emoji ? ` ${g.emoji}` : ""}</>;
}
