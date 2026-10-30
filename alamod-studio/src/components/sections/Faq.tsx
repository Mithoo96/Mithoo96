import { faq } from "@/content/faq";
import { LineReveal, Reveal } from "@/components/ui/Reveal";

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="relative bg-paper text-ink">
      <div className="mx-auto grid max-w-[1600px] gap-12 px-5 py-16 md:grid-cols-12 md:gap-8 md:px-10 md:py-24">
        <div className="md:col-span-4">
          <div className="md:sticky md:top-28">
            <Reveal>
              <p className="eyebrow flex items-center gap-3 text-ink/70">
                <span className="h-px w-10 bg-red" /> FAQ
              </p>
            </Reveal>
            <LineReveal id="faq-title" className="display mt-8 text-[clamp(3.4rem,12vw,7rem)]" lines={["Before", "you book."]} />
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-xs text-ink/65">
                Still have a question?{" "}
                <a href="#contact" className="underline decoration-red decoration-2 underline-offset-4 hover:text-red">
                  Contact the studio
                </a>
                .
              </p>
            </Reveal>
          </div>
        </div>

        <div className="md:col-span-8 md:col-start-5">
          <ul className="border-t border-ink/15">
            {faq.map((item, i) => (
              <li key={item.q} className="border-b border-ink/15">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start gap-4 py-6 md:gap-8 md:py-8 [&::-webkit-details-marker]:hidden">
                    <span className="mt-1.5 font-mono text-xs text-ink/65 group-open:text-red">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="display-wide flex-1 text-lg leading-snug md:text-2xl">{item.q}</span>
                    <span aria-hidden className="relative mt-2 size-4 shrink-0">
                      <span className="absolute left-0 top-1/2 h-[2px] w-4 -translate-y-1/2 bg-ink" />
                      <span className="absolute left-1/2 top-0 h-4 w-[2px] -translate-x-1/2 bg-ink transition-transform duration-300 group-open:scale-y-0" />
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-8 pl-8 pr-8 text-ink/70 md:pl-14 md:text-lg">{item.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
