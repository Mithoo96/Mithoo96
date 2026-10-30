import { Logo } from "@/components/ui/Logo";
import { BookButton } from "@/components/ui/BookButton";
import { site } from "@/content/site";

const footerNav = [
  { label: "Studio", href: "#studio" },
  { label: "Gallery", href: "#gallery" },
  { label: "Rates", href: "#rates" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const icons: Record<keyof typeof site.social, { label: string; path: string }> = {
  instagram: {
    label: "Instagram",
    path: "M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6Zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Zm6.1-8.1a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM12 3.6c2.7 0 3 0 4.1.1 1 0 1.5.2 1.9.3.5.2.8.4 1.2.8.4.4.6.7.8 1.2.1.4.3.9.3 1.9.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c0 1-.2 1.5-.3 1.9-.2.5-.4.8-.8 1.2-.4.4-.7.6-1.2.8-.4.1-.9.3-1.9.3-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1 0-1.5-.2-1.9-.3a3.2 3.2 0 0 1-1.2-.8 3.2 3.2 0 0 1-.8-1.2c-.1-.4-.3-.9-.3-1.9-.1-1.1-.1-1.4-.1-4.1s0-3 .1-4.1c0-1 .2-1.5.3-1.9.2-.5.4-.8.8-1.2.4-.4.7-.6 1.2-.8.4-.1.9-.3 1.9-.3 1.1-.1 1.4-.1 4.1-.1M12 2c-2.7 0-3.1 0-4.1.1-1.1 0-1.8.2-2.4.5-.7.3-1.2.6-1.8 1.2-.6.6-.9 1.1-1.2 1.8-.3.6-.4 1.3-.5 2.4C2 8.9 2 9.3 2 12s0 3.1.1 4.1c0 1.1.2 1.8.5 2.4.3.7.6 1.2 1.2 1.8.6.6 1.1.9 1.8 1.2.6.3 1.3.4 2.4.5 1 .1 1.4.1 4.1.1s3.1 0 4.1-.1c1.1 0 1.8-.2 2.4-.5.7-.3 1.2-.6 1.8-1.2.6-.6.9-1.1 1.2-1.8.3-.6.4-1.3.5-2.4.1-1 .1-1.4.1-4.1s0-3.1-.1-4.1c0-1.1-.2-1.8-.5-2.4-.3-.7-.6-1.2-1.2-1.8-.6-.6-1.1-.9-1.8-1.2-.6-.3-1.3-.4-2.4-.5C15.1 2 14.7 2 12 2Z",
  },
  facebook: {
    label: "Facebook",
    path: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z",
  },
  tiktok: {
    label: "TikTok",
    path: "M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-1.8-2.5V9.7a5.7 5.7 0 1 0 4.9 5.7V9a7.4 7.4 0 0 0 4.3 1.4V7.3s-1.9.1-3.2-1.5Z",
  },
  youtube: {
    label: "YouTube",
    path: "M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z",
  },
};

export function Footer() {
  const { contact } = site;
  return (
    <footer id="contact" className="relative overflow-hidden bg-navy-900 pb-28 md:pb-10">
      <div className="mx-auto max-w-[1600px] px-5 pt-20 md:px-10 md:pt-28">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="eyebrow text-red">Contact</p>
            <h2 className="display mt-6 text-6xl md:text-7xl">
              Let&rsquo;s get
              <br />
              you in the room.
            </h2>
            <p className="mt-6 max-w-sm text-paper/65">
              Questions about gear, availability or larger groups? Send a session request and ALAMOD will get back to
              you.
            </p>
            <BookButton source="footer" className="mt-8" />
          </div>

          <div className="grid grid-cols-2 gap-10 md:col-span-6 md:col-start-7 md:grid-cols-3">
            <div>
              <p className="eyebrow text-paper/40">Studio</p>
              <address className="mt-4 not-italic leading-relaxed text-paper/85">
                {site.name}
                <br />
                {contact.streetAddress && (
                  <>
                    {contact.streetAddress}
                    <br />
                  </>
                )}
                {site.city}, {site.regionName}
                {contact.postalCode ? ` ${contact.postalCode}` : ""}
              </address>
              {contact.mapsUrl && (
                <a href={contact.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-paper/60 underline decoration-red underline-offset-4 hover:text-paper">
                  Get directions
                </a>
              )}
              {(contact.phone || contact.email) && (
                <ul className="mt-4 space-y-1 text-paper/85">
                  {contact.phone && (
                    <li>
                      <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="hover:text-red">{contact.phone}</a>
                    </li>
                  )}
                  {contact.email && (
                    <li>
                      <a href={`mailto:${contact.email}`} className="hover:text-red">{contact.email}</a>
                    </li>
                  )}
                </ul>
              )}
              {contact.hours && <p className="mt-4 text-sm text-paper/60">{contact.hours}</p>}
            </div>

            <nav aria-label="Footer">
              <p className="eyebrow text-paper/40">Navigate</p>
              <ul className="mt-4 space-y-2">
                {footerNav.map((n) => (
                  <li key={n.href}>
                    <a href={n.href} className="text-paper/85 transition hover:text-red">{n.label}</a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="col-span-2 md:col-span-1">
              <p className="eyebrow text-paper/40">Follow</p>
              <ul className="mt-4 flex gap-2">
                {(Object.keys(icons) as (keyof typeof icons)[]).map((key) => {
                  const url = site.social[key];
                  const svg = (
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="currentColor">
                      <path d={icons[key].path} />
                    </svg>
                  );
                  return (
                    <li key={key}>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`ALAMOD Studio on ${icons[key].label}`}
                          className="grid size-11 place-items-center border border-paper/20 text-paper transition hover:border-red hover:bg-red"
                        >
                          {svg}
                        </a>
                      ) : (
                        <span
                          aria-label={`${icons[key].label} (coming soon)`}
                          title={`${icons[key].label} — coming soon`}
                          role="img"
                          className="grid size-11 place-items-center border border-paper/10 text-paper/30"
                        >
                          {svg}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-24 border-t border-paper/10 pt-10">
          <Logo className="h-auto w-full opacity-95" title="ALAMOD Studio" />
        </div>

        <div className="mt-10 flex flex-col justify-between gap-3 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-paper/40 md:flex-row">
          <p>© {new Date().getFullYear()} ALAMOD Studio. All Rights Reserved.</p>
          <p>Music &amp; band rehearsal studio · Miami, Florida</p>
        </div>
      </div>
    </footer>
  );
}
