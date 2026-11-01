"use client";

import { useRef, useState } from "react";
import { ImagePlus, Sparkles, CalendarClock, Save, Heart, MessageCircle, Send, X } from "lucide-react";
import { Page, Card, Field, Input, Textarea, Avatar } from "@/components/ui/primitives";
import { Button, useSimulated } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { BrandIcon, brandName, type BrandKey } from "@/components/brand-icon";
import { business } from "@/lib/config/business";
const handle = business.shortName.toLowerCase().replace(/\s+/g, "");
import { PlatformPicker, WorkspaceHeader, mockArt } from "./shared";

export function SocialWorkspace() {
  const toast = useToast(); const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("Tax season is almost here. 🧾\n\nBook early with our team and skip the rush. We handle individual and small business returns, and we'll make sure you get every credit you qualify for.\n\nBook through the link in our bio.");
  const [media, setMedia] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<BrandKey[]>(["instagram", "facebook"]);
  const [preview, setPreview] = useState<BrandKey>("instagram");
  const [schedule, setSchedule] = useState(false); const [when, setWhen] = useState({ date: "", time: "12:00" });
  const improve = useSimulated(1200, 400); const save = useSimulated(700);
  const limit = preview === "instagram" ? 2200 : 63206;
  return (
    <Page>
      <WorkspaceHeader title="Social Post" subtitle="Write once. Preview it everywhere."
        actions={<>
          <Button icon={Save} loading={save.loading} done={save.done} onClick={() => save.run(() => toast({ title: "Draft saved" }))}>{save.done ? "Saved" : "Save Draft"}</Button>
          <Button variant="primary" icon={CalendarClock} disabled={!platforms.length} onClick={() => setSchedule(true)}>Schedule</Button>
        </>} />
      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between"><label htmlFor="post-text" className="text-[13px] font-medium text-ink-soft">Content</label><span className="text-[12px] tabular-nums text-mute">{text.length} / {limit.toLocaleString()}</span></div>
            <Textarea id="post-text" value={text} onChange={(e) => setText(e.target.value)} className="min-h-[180px]" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="soft" icon={Sparkles} loading={improve.loading} onClick={() => improve.run(() => { setText("Don't wait until April. 🗓️\n\nFile early, get your refund sooner, and let our team handle the paperwork for you and your family.\n\nAppointments are filling up. Tap the link in our bio to reserve yours."); toast({ title: "Rewritten in your brand voice" }); })}>Improve with AI</Button>
              <Button size="sm" variant="ghost" onClick={() => setText((t) => t + "\n\n#taxseason #taxprep #lifeinsurance #protectyourfamily")}>Add hashtags</Button>
            </div>
          </Card>
          <Card className="p-5">
            <p className="mb-3 text-[13px] font-medium text-ink-soft">Media</p>
            {media ? <div className="relative w-40"><img src={media} alt="Selected media" className="aspect-square w-40 rounded-2xl object-cover ring-1 ring-hair" /><button onClick={() => setMedia(null)} aria-label="Remove media" className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-hair"><X size={14} /></button></div>
              : <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(15,15,30,0.14)] py-8 text-[14px] text-mute transition-colors hover:border-iris/50 hover:text-ink"><ImagePlus size={18} />Add photo or video</button>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setMedia(URL.createObjectURL(f)); }} />
          </Card>
          <div><p className="mb-3 text-[13px] font-medium text-ink-soft">Platforms</p>
            <PlatformPicker options={["instagram", "facebook", "tiktok", "youtube"]} value={platforms} onChange={(v) => { setPlatforms(v); if (v.length && !v.includes(preview)) setPreview(v[0]); }} /></div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-3 flex items-center justify-between"><p className="text-[13px] font-medium text-ink-soft">Preview</p>
            <div className="flex gap-1.5">{platforms.map((p) => <button key={p} onClick={() => setPreview(p)} aria-label={`Preview on ${brandName(p)}`} className={`rounded-[10px] transition-all ${preview === p ? "ring-2 ring-ink ring-offset-2" : "opacity-60 hover:opacity-100"}`}><BrandIcon brand={p} size="sm" /></button>)}</div>
          </div>
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-3 px-4 py-3"><Avatar name={business.name} size={32} /><div className="flex-1"><p className="text-[13px] font-semibold">{handle}</p><p className="text-[11px] text-mute">{business.type}</p></div><BrandIcon brand={preview} size="xs" /></div>
            <div className="aspect-square w-full" style={media ? { backgroundImage: `url(${media})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: mockArt("tax season") }} />
            <div className="flex gap-4 px-4 pt-3 text-ink"><Heart size={20} strokeWidth={1.6} /><MessageCircle size={20} strokeWidth={1.6} /><Send size={20} strokeWidth={1.6} /></div>
            <p className="whitespace-pre-line px-4 pb-4 pt-2 text-[13px] leading-relaxed"><b>{handle}</b> {text.length > 180 ? text.slice(0, 180) + "… more" : text}</p>
          </Card>
        </div>
      </div>
      <Modal open={schedule} onClose={() => setSchedule(false)} title="Schedule post" description={`Publishing to ${platforms.map(brandName).join(" + ")}`} size="sm"
        footer={<><Button variant="ghost" onClick={() => setSchedule(false)}>Cancel</Button><Button variant="primary" onClick={() => { setSchedule(false); toast({ title: "Post scheduled", description: `${when.date || "Tomorrow"} at ${when.time} · sent to approvals · demo only` }); }}>Schedule</Button></>}>
        <div className="grid grid-cols-2 gap-3 pb-2">
          <Field label="Date"><Input id="post-date" type="date" value={when.date} onChange={(e) => setWhen({ ...when, date: e.target.value })} /></Field>
          <Field label="Time"><Input id="post-time" type="time" value={when.time} onChange={(e) => setWhen({ ...when, time: e.target.value })} /></Field>
        </div>
        <p className="pb-2 text-[13px] text-mute">Best time for your audience: Thursday, 12:00 PM.</p>
      </Modal>
    </Page>
  );
}
