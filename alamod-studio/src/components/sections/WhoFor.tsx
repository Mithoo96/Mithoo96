import { LineReveal, Reveal } from "@/components/ui/Reveal";

const audiences = ["Bands", "Vocalists", "Solo artists", "Worship teams", "Music directors", "Live performers", "Creative sessions"];
const ticker = ["Bands", "Artists", "Musicians", "Rehearsals", "Miami", "Live performance"];

function Marquee({ items, reverse = false, duration = 45, className = "" }: { items: string[]; reverse?: boolean; duration?: number; className?: string }) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((w, i) => (
        <li key={i} className="flex items-center">
          <span className={i % 2 ? "outline-text" : ""}>{w}</span>
          <span aria-hidden className="mx-[0.35em] inline-block h-[0.12em] w-[0.6em] bg-red align-middle" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`flex w-max animate-marquee ${reverse ? "[animation-direction:reverse]" : ""} ${className}`} style={{ ["--marquee-duration" as string]: `${duration}s` }}>
      {row(false)}
      {row(true)}
    </div>
  );
}

export function WhoFor() {
  return (
    <section aria-labelledby="who-title" className="relative overflow-hidden bg-navy py-24 md:py-36">
      <div className="mx-auto max-w-[1600px] px-5 md:px-10">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <Reveal>
              <p className="eyebrow text-red">Who it&rsquo;s for</p>
            </Reveal>
            <LineReveal
              id="who-title"
              className="display mt-6 text-[clamp(3.2rem,12.5vw,9rem)]"
              lines={["Built for the", "session before", <span key="s" className="text-red">the show.</span>]}
            />
          </div>
          <Reveal delay={0.1} className="md:col-span-4 md:pb-3">
            <p className="max-w-sm text-paper/70">
              From a four-piece tightening the set to a worship team running Sunday&rsquo;s songs — if you need to play
              it loud before you play it live, the room is yours.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="mt-16 space-y-2 md:mt-24 md:space-y-4" aria-label="Who rehearses at ALAMOD">
        <p className="sr-only">{audiences.join(", ")}.</p>
        <div className="display -rotate-[1.5deg] bg-red py-3 text-[clamp(3rem,10vw,8rem)] text-white md:py-5" aria-hidden>
          <Marquee items={audiences} duration={50} className="[&_.outline-text]:[-webkit-text-stroke-color:#fff]" />
        </div>
        <div className="display-wide py-3 text-[clamp(1.4rem,3.6vw,2.6rem)] text-paper/65" aria-hidden>
          <Marquee items={ticker} reverse duration={60} />
        </div>
      </div>
    </section>
  );
}
