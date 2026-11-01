"use client";

import { useEffect, useState } from "react";
import { Scissors, Captions, Crop, AudioLines, Clapperboard, Music, Loader2, Check, Film, CalendarClock, Send, RotateCcw, type LucideIcon } from "lucide-react";
import { Page, Card, SectionTitle, Textarea } from "@/components/ui/primitives";
import { Button, useSimulated } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { BrandKey } from "@/components/brand-icon";
import { Dropzone, PlatformPicker, WorkspaceHeader, mockArt } from "./shared";

const tools: { key: string; label: string; icon: LucideIcon; done: string }[] = [
  { key: "trim", label: "Trim", icon: Scissors, done: "Trimmed to 0:42" },
  { key: "captions", label: "Captions", icon: Captions, done: "Captions added" },
  { key: "resize", label: "Resize", icon: Crop, done: "9:16 and 1:1 ready" },
  { key: "silence", label: "Remove Silence", icon: AudioLines, done: "6.4s removed" },
  { key: "clips", label: "Generate Clips", icon: Clapperboard, done: "3 clips ready" },
  { key: "music", label: "Add Music", icon: Music, done: "“Morning Light” added" },
];

export function VideoWorkspace() {
  const toast = useToast();
  const [file, setFile] = useState<{ name: string; url: string } | null>(null);
  const [state, setState] = useState<Record<string, "idle" | "working" | "done">>({});
  const [platforms, setPlatforms] = useState<BrandKey[]>(["instagram", "tiktok"]);
  const [caption, setCaption] = useState("A quiet morning at the studio. Book your fall reset — link in bio.");
  const publish = useSimulated(1400);
  useEffect(() => () => { if (file) URL.revokeObjectURL(file.url); }, [file]);

  const run = (k: string) => {
    setState((s) => ({ ...s, [k]: "working" }));
    setTimeout(() => { setState((s) => ({ ...s, [k]: "done" })); toast({ title: tools.find((t) => t.key === k)!.done, description: "Simulated edit" }); }, 1300);
  };

  return (
    <Page>
      <WorkspaceHeader title="Create Video" subtitle="Drop in a video. Mithoo prepares it for every platform."
        actions={file && <Button icon={RotateCcw} onClick={() => { setFile(null); setState({}); }}>Start over</Button>} />
      {!file ? <Dropzone accept="video/*" label="Drop your video here" hint="or click to choose a file · MP4, MOV up to 2 GB · stays on your device"
        onFile={(f) => setFile({ name: f.name, url: URL.createObjectURL(f) })} />
      : <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Card className="overflow-hidden p-3">
            <video src={file.url} controls playsInline className="aspect-video w-full rounded-[18px] bg-black object-contain" />
            <div className="flex items-center gap-2 px-3 py-3 text-[13px] text-mute"><Film size={14} />{file.name}</div>
          </Card>
          <Card className="p-5">
            <p className="mb-4 text-[15px] font-semibold">Tools</p>
            <div className="grid grid-cols-2 gap-2">
              {tools.map((t) => { const s = state[t.key] ?? "idle"; return (
                <button key={t.key} disabled={s === "working"} onClick={() => run(t.key)}
                  className={`flex flex-col items-start gap-2.5 rounded-[18px] p-3.5 text-left ring-1 transition-all duration-300 active:scale-[0.98] ${s === "done" ? "bg-[#f4fbf7] ring-emerald-200" : "bg-white ring-hair hover:ring-iris/40"}`}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#f6f6f9]">{s === "working" ? <Loader2 size={15} className="animate-spin text-iris" /> : s === "done" ? <Check size={15} className="text-emerald-600" /> : <t.icon size={15} className="text-ink-soft" />}</span>
                  <span><span className="block text-[13px] font-medium">{t.label}</span><span className="block text-[11px] text-mute">{s === "done" ? t.done : s === "working" ? "Working…" : "Tap to apply"}</span></span>
                </button>
              ); })}
            </div>
          </Card>
        </div>}

      {state.clips === "done" && <div className="mt-8">
        <SectionTitle>Clips</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {["The morning ritual", "Inside the studio", "Client moment"].map((c, i) => (
            <div key={c} className="overflow-hidden rounded-[20px] bg-white ring-1 ring-hair">
              <div className="relative aspect-[9/16]" style={{ background: mockArt(c, i) }}><span className="absolute bottom-2 right-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[11px] text-white">0:{15 + i * 7}</span></div>
              <p className="truncate px-3 py-2.5 text-[13px] font-medium">{c}</p>
            </div>
          ))}
        </div>
      </div>}

      <div className="mt-10">
        <SectionTitle>Prepare for Social</SectionTitle>
        <PlatformPicker options={["instagram", "facebook", "tiktok", "youtube"]} value={platforms} onChange={setPlatforms}
          notes={{ instagram: "Reel · 9:16", facebook: "Reel · 9:16", tiktok: "Video · 9:16", youtube: "Short · 9:16" }} />
        <Card className="mt-4 p-5">
          <label className="mb-2 block text-[13px] font-medium text-ink-soft" htmlFor="video-caption">Caption</label>
          <Textarea id="video-caption" value={caption} onChange={(e) => setCaption(e.target.value)} className="min-h-[80px]" />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button icon={CalendarClock} disabled={!file || !platforms.length} onClick={() => toast({ title: "Scheduled for tomorrow, 12:00 PM", description: "Demo only. Nothing will be published." })}>Schedule</Button>
            <Button variant="primary" icon={Send} disabled={!file || !platforms.length} loading={publish.loading} done={publish.done}
              onClick={() => publish.run(() => toast({ title: "Ready to publish", description: `Prepared for ${platforms.length} platform${platforms.length > 1 ? "s" : ""} · demo only` }))}>
              {publish.loading ? "Preparing…" : publish.done ? "Prepared" : "Prepare for Social"}
            </Button>
          </div>
          {!file && <p className="mt-3 text-right text-[12px] text-mute">Add a video above to continue.</p>}
        </Card>
      </div>
    </Page>
  );
}
