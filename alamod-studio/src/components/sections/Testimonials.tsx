import { showTestimonialPlaceholders, testimonials } from "@/content/testimonials";
import { LineReveal, Reveal } from "@/components/ui/Reveal";

export function Testimonials() {
  const real = testimonials.filter((t) => !t.placeholder);
  const list = real.length ? real : showTestimonialPlaceholders ? testimonials : [];
  if (!list.length) return null;
  const isPlaceholder = !real.length;

  return (
    <section aria-labelledby="voices-title" className="relative bg-navy">
      <div className="mx-auto max-w-[1600px] px-5 py-16 md:px-10 md:py-24">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Reveal>
              <p className="eyebrow text-red">From the room</p>
            </Reveal>
            <LineReveal id="voices-title" className="display mt-6 text-[clamp(3rem,11vw,7.5rem)]" lines={["Heard at", "ALAMOD."]} />
          </div>
          {isPlaceholder && (
            <p className="eyebrow max-w-xs border border-dashed border-paper/30 p-3 text-[0.62rem] leading-relaxed text-paper/70">
              Developer note: placeholder layout. Replace with real client testimonials in src/content/testimonials.ts.
            </p>
          )}
        </div>

        <ul className="mt-14 grid gap-px bg-paper/10 md:mt-20 md:grid-cols-3">
          {list.map((t, i) => (
            <li key={i} className={`bg-navy p-7 md:p-10 ${isPlaceholder ? "outline-1 -outline-offset-8 outline-dashed outline-paper/20" : ""}`}>
              <Reveal delay={i * 0.08}>
                <span aria-hidden className="font-serif text-7xl leading-none text-red">&ldquo;</span>
                <blockquote className={`mt-2 text-xl leading-snug md:text-2xl ${isPlaceholder ? "font-mono text-base text-paper/65 md:text-lg" : "text-paper/90"}`}>
                  {t.quote}
                </blockquote>
                <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-paper/70">
                  {t.name}
                  {t.role && <span className="block pt-1 text-paper/60">{t.role}</span>}
                </p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
