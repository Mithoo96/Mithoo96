"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, Check, ArrowRight, Download } from "lucide-react";
import { Page, Card, Textarea, Chip } from "@/components/ui/primitives";
import { Button, useSimulated } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { WorkspaceHeader, mockArt } from "./shared";

const styles = ["Warm natural light", "Clean professional", "Editorial", "Illustration"];
const ratios = [{ k: "1:1", c: "aspect-square" }, { k: "4:5", c: "aspect-[4/5]" }, { k: "9:16", c: "aspect-[9/16]" }, { k: "16:9", c: "aspect-video" }];

export function ImageWorkspace() {
  const toast = useToast();
  const [prompt, setPrompt] = useState("A smiling family at a kitchen table reviewing paperwork together, warm morning light, calm and trustworthy");
  const [style, setStyle] = useState(styles[0]); const [ratio, setRatio] = useState(ratios[0]);
  const [seed, setSeed] = useState<string | null>(null); const [pick, setPick] = useState<number | null>(null);
  const gen = useSimulated(1800, 300);
  return (
    <Page>
      <WorkspaceHeader title="Create Image" subtitle="Describe what you want. Mithoo keeps it on brand." />
      <Card className="p-5">
        <label htmlFor="img-prompt" className="mb-2 block text-[13px] font-medium text-ink-soft">Describe the image</label>
        <Textarea id="img-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-[90px]" />
        <div className="mt-4 flex flex-wrap gap-2">{styles.map((s) => <Chip key={s} active={style === s} onClick={() => setStyle(s)}>{s}</Chip>)}</div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">{ratios.map((r) => <Chip key={r.k} active={ratio.k === r.k} onClick={() => setRatio(r)}>{r.k}</Chip>)}</div>
          <Button variant="primary" icon={Sparkles} loading={gen.loading} disabled={!prompt.trim()} onClick={() => { setPick(null); gen.run(() => setSeed(prompt + style + Date.now())); }}>{gen.loading ? "Generating…" : seed ? "Generate again" : "Generate"}</Button>
        </div>
      </Card>
      {(seed || gen.loading) && <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <button key={i} onClick={() => setPick(i)} className={`relative overflow-hidden rounded-[22px] ring-1 transition-all duration-300 ${ratio.c} ${pick === i ? "ring-2 ring-ink" : "ring-hair hover:-translate-y-0.5"}`}
            style={{ background: gen.loading || !seed ? "#f3f3f7" : mockArt(seed, i) }}>
            {gen.loading && <span className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/0 via-white/60 to-white/0" />}
            {pick === i && <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-ink"><Check size={13} className="text-white" strokeWidth={2.6} /></span>}
          </button>
        ))}
      </div>}
      {seed && !gen.loading && <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button icon={Download} disabled={pick === null} onClick={() => toast({ title: "Downloads are disabled in the demo", tone: "info" })}>Download</Button>
        <Link href="/create/social"><Button variant="primary" iconRight={ArrowRight} disabled={pick === null}>Use in Social Post</Button></Link>
      </div>}
      <p className="mt-6 text-center text-[12px] text-mute">Prototype: these are placeholder visuals. No image model is connected.</p>
    </Page>
  );
}
