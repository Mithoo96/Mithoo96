import { images } from "@/content/images";
import { StudioImage } from "@/components/ui/StudioImage";
import { ImageReveal, LineReveal, Reveal } from "@/components/ui/Reveal";

export function Intro() {
  return (
    <section id="studio" className="relative overflow-hidden bg-paper text-ink">
      <div className="mx-auto grid max-w-[1600px] gap-y-14 px-5 py-24 md:grid-cols-12 md:gap-x-8 md:px-10 md:py-36">
        {/* Copy column */}
        <div className="relative z-10 md:col-span-7">
          <Reveal>
            <p className="eyebrow flex items-center gap-3 text-ink/70">
              <span className="h-px w-10 bg-red" /> ALAMOD Studio — Miami
            </p>
          </Reveal>
          <LineReveal
            className="display mt-8 text-[clamp(4.4rem,21vw,15rem)] md:text-[clamp(6rem,13vw,15rem)]"
            lines={[
              "Show up.",
              <span key="p" className="block md:pl-[0.9em]">
                Plug in.
              </span>,
              <span key="pl" className="text-red">
                Play.
              </span>,
            ]}
          />
          <div className="mt-10 grid gap-8 md:mt-14 md:grid-cols-7">
            <Reveal className="md:col-span-5 md:col-start-2" delay={0.1}>
              <p className="text-lg leading-relaxed text-ink/80 md:text-xl">
                Forget hauling an entire rehearsal setup across Miami. ALAMOD Studio gives musicians a professional
                space with the equipment and environment they need to focus on what matters —{" "}
                <em className="font-serif text-[1.15em] italic text-ink">the music.</em>
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <dl className="mt-14 grid grid-cols-3 border-t border-ink/15 md:mt-20">
              {[
                ["Booking", "By the hour"],
                ["Setup", "Plug & play"],
                ["Location", "Miami, FL"],
              ].map(([k, v]) => (
                <div key={k} className="border-r border-ink/15 py-5 pr-3 last:border-r-0 [&:not(:first-child)]:pl-4 md:pl-0 md:[&:not(:first-child)]:pl-6">
                  <dt className="eyebrow text-[0.62rem] text-ink/65">{k}</dt>
                  <dd className="display-wide mt-2 text-base md:text-2xl">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* Layered imagery */}
        <div className="relative md:col-span-5 md:-mr-10 md:pt-24">
          <ImageReveal className="relative ml-[12%] aspect-[4/5] md:ml-0">
            <StudioImage image={images.studioWide} position="62% 55%" sizes="(min-width: 768px) 40vw, 88vw" className="absolute inset-0" />
          </ImageReveal>
          <ImageReveal
            from="left"
            delay={0.25}
            className="absolute -bottom-10 left-0 w-[46%] border-[6px] border-paper md:-bottom-16 md:-left-24 md:w-[52%]"
          >
            <div className="relative aspect-square">
              <StudioImage image={images.sign} sizes="(min-width: 768px) 20vw, 45vw" className="absolute inset-0" />
            </div>
          </ImageReveal>
          <p className="eyebrow absolute -right-1 top-6 hidden origin-top-right -rotate-90 text-ink/65 md:right-12 md:block md:top-24">
            The room — Live rehearsal
          </p>
        </div>
      </div>
    </section>
  );
}
