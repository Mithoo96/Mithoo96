import { images } from "@/content/images";
import { site } from "@/content/site";
import { StudioImage } from "@/components/ui/StudioImage";
import { LineReveal, Reveal } from "@/components/ui/Reveal";
import { BookButton, LinkButton } from "@/components/ui/BookButton";
import { Waveform } from "@/components/ui/Waveform";

export function Rates() {
  return (
    <section id="rates" data-hide-bookbar aria-labelledby="rates-title" className="relative overflow-hidden bg-paper text-ink">
      <div className="mx-auto grid max-w-[1600px] gap-14 px-5 py-16 md:grid-cols-12 md:gap-8 md:px-10 md:py-24">
        <div className="md:col-span-6">
          <Reveal>
            <p className="eyebrow flex items-center gap-3 text-ink/70">
              <span className="h-px w-10 bg-red" /> Rates & booking
            </p>
          </Reveal>
          <LineReveal
            id="rates-title"
            className="display mt-8 text-[clamp(3.4rem,13vw,8.5rem)]"
            lines={["Book the room.", <span key="n" className="text-red">Make some noise.</span>]}
          />
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-md text-lg text-ink/75">Reserve your rehearsal session based on availability.</p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <BookButton source="rates">Book your session</BookButton>
              <LinkButton href="#contact" variant="ink">
                Contact the studio
              </LinkButton>
            </div>
          </Reveal>
        </div>

        {/* Price card */}
        <Reveal delay={0.1} className="md:col-span-6">
          <div className="grain relative isolate overflow-hidden bg-navy text-paper">
            <StudioImage image={images.ceiling} sizes="(min-width: 768px) 50vw, 100vw" className="absolute inset-0 -z-10 opacity-35" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy/70 via-navy/85 to-navy" />
            <div className="flex items-center justify-between border-b border-paper/15 px-6 py-4 md:px-10">
              <span className="eyebrow text-paper/70">Rehearsal session</span>
              <span className="eyebrow text-red">Per hour</span>
            </div>
            <div className="px-6 pb-10 pt-10 md:px-10 md:pt-14">
              <p className="eyebrow text-paper/70">Starting at</p>
              <p className="mt-3 flex items-start leading-none" aria-label={`Starting at $${site.startingRate} per hour`}>
                <span className="display mt-[0.12em] text-[clamp(3rem,9vw,6rem)] text-red">$</span>
                <span className="display text-[clamp(9rem,34vw,19rem)]">{site.startingRate}</span>
                <span className="display-wide ml-3 self-end pb-[0.6em] text-xl text-paper/70 md:text-2xl">/ hour</span>
              </p>
              <Waveform bars={48} animated={false} className="mt-4 h-10 text-paper/30" />
              <ul className="mt-8 grid gap-3 text-paper/85 sm:grid-cols-2">
                {["Hourly booking", "Fully equipped room", "Bands, artists & teams", "Miami, FL"].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <span aria-hidden className="h-[2px] w-4 bg-red" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-sm text-ink/70">
            Rates and availability may vary. Contact ALAMOD Studio for current booking details.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
