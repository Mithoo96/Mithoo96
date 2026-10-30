import { images } from "@/content/images";
import { StudioImage } from "@/components/ui/StudioImage";
import { ImageReveal, LineReveal, Reveal } from "@/components/ui/Reveal";

/**
 * Gear list. Only brands clearly visible in the studio photos are named;
 * everything else is described by category. Keep this in sync with what is
 * actually in the room.
 */
const rider: { category: string; detail: string; level: number }[] = [
  { category: "PA system", detail: "Powered JBL PA speakers on subwoofers", level: 0.92 },
  { category: "Stage monitors", detail: "Floor wedge monitors across the front of the stage", level: 0.8 },
  { category: "Mixer / audio", detail: "Digital mixing console with outboard rack gear", level: 0.86 },
  { category: "Drum setup", detail: "PDP drum kit with Sabian cymbals", level: 0.95 },
  { category: "Percussion", detail: "Pair of congas", level: 0.6 },
  { category: "Bass amplification", detail: "Ampeg B4R and Hartke HA2500 heads with bass cabinet", level: 0.88 },
  { category: "Combo amplification", detail: "Randall combo amplifier", level: 0.72 },
  { category: "Microphones", detail: "Vocal microphones on stands", level: 0.78 },
  { category: "Instrument connectivity", detail: "Cabling and inputs to plug in and play", level: 0.66 },
  { category: "Performance area", detail: "Raised, carpeted stage area with stage lighting and acoustic treatment", level: 0.9 },
];

export function Equipment() {
  return (
    <section id="equipment" aria-labelledby="equipment-title" className="relative overflow-hidden bg-navy-800">
      <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-36">
        <div className="grid gap-14 md:grid-cols-12 md:gap-8">
          {/* Images */}
          <div className="relative md:col-span-5">
            <div className="md:sticky md:top-28">
              <ImageReveal className="relative aspect-[4/5] w-[82%] md:w-full">
                <StudioImage image={images.equipment} sizes="(min-width: 768px) 40vw, 80vw" className="absolute inset-0" />
              </ImageReveal>
              <ImageReveal
                from="right"
                delay={0.2}
                className="absolute -bottom-8 right-0 w-[48%] border-[6px] border-navy-800 md:-right-12 md:w-[46%]"
              >
                <div className="relative aspect-[3/4]">
                  <StudioImage image={images.drums} sizes="(min-width: 768px) 18vw, 45vw" className="absolute inset-0" />
                </div>
              </ImageReveal>
              <p className="eyebrow mt-14 hidden text-paper/45 md:block">Fig. 01 — Bass rig · Fig. 02 — Kit</p>
            </div>
          </div>

          {/* Rider */}
          <div className="md:col-span-7 md:col-start-6">
            <Reveal>
              <p className="eyebrow flex items-center gap-3 text-red">
                Tech rider <span className="h-px w-10 bg-red" /> In the room
              </p>
            </Reveal>
            <LineReveal
              id="equipment-title"
              className="display mt-6 text-[clamp(3.2rem,12vw,8.5rem)]"
              lines={["Everything", "you need to", <span key="g" className="text-red">get loud.</span>]}
            />

            <div className="mt-12 md:mt-16" role="table" aria-label="Studio equipment">
              <div role="row" className="eyebrow hidden grid-cols-[3.5rem_1fr_1.4fr_5rem] gap-4 border-b border-paper/15 pb-3 text-[0.62rem] text-paper/40 md:grid">
                <span role="columnheader">Ch.</span>
                <span role="columnheader">Category</span>
                <span role="columnheader">In the room</span>
                <span role="columnheader" className="text-right">Level</span>
              </div>
              {rider.map((row, i) => (
                <Reveal key={row.category} delay={i * 0.03} y={14}>
                  <div
                    role="row"
                    className="group grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-1 border-b border-paper/10 py-5 transition-colors hover:bg-paper/[0.03] md:grid-cols-[3.5rem_1fr_1.4fr_5rem] md:items-center md:py-6"
                  >
                    <span role="cell" className="row-span-2 font-mono text-xs text-paper/40 group-hover:text-red md:row-span-1">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span role="cell" className="display-wide text-lg md:text-xl">
                      {row.category}
                    </span>
                    <span role="cell" className="text-sm text-paper/65 md:text-[0.95rem]">
                      {row.detail}
                    </span>
                    <span role="cell" aria-hidden className="hidden items-end justify-end gap-[3px] md:flex">
                      {Array.from({ length: 8 }, (_, b) => (
                        <span
                          key={b}
                          className={`w-[5px] ${b / 8 < row.level ? (b >= 6 ? "bg-red" : "bg-paper/70") : "bg-paper/12"}`}
                          style={{ height: 6 + b * 2.2 }}
                        />
                      ))}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <div className="mt-10 flex flex-col gap-4 border-l-2 border-red bg-paper/[0.04] p-6 md:flex-row md:items-center md:justify-between md:p-8">
                <p className="max-w-md text-paper/85">
                  Need something specific for your session? Contact the studio before booking.
                </p>
                <a
                  href="#contact"
                  className="font-mono text-xs uppercase tracking-[0.2em] text-paper underline decoration-red decoration-2 underline-offset-8 transition hover:text-red"
                >
                  Ask about gear →
                </a>
              </div>
              <p className="mt-4 text-xs text-paper/40">
                Equipment shown reflects the current room setup and may change. Confirm specific gear with ALAMOD.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
