"use client";

import { useState } from "react";
import type { Range } from "@/lib/types";
import { Segmented, Field, Input } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";

export function RangePicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const [custom, setCustom] = useState(false); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const label = value === "custom" && from && to ? `${new Date(from + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(to + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Custom";
  return (
    <>
      <Segmented value={value} onChange={(v) => (v === "custom" ? setCustom(true) : onChange(v))}
        options={[{ value: "today", label: "Today" }, { value: "7d", label: "7 Days" }, { value: "30d", label: "30 Days" }, { value: "custom", label }]} />
      <Modal open={custom} onClose={() => setCustom(false)} title="Custom range" size="sm"
        footer={<><Button variant="ghost" onClick={() => setCustom(false)}>Cancel</Button><Button variant="primary" disabled={!from || !to} onClick={() => { onChange("custom"); setCustom(false); }}>Apply</Button></>}>
        <div className="grid grid-cols-2 gap-3 pb-2">
          <Field label="From"><Input id="range-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><Input id="range-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </Modal>
    </>
  );
}
