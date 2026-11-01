import { Home, Users, Briefcase, Sparkles, Inbox, LineChart, LayoutGrid, Settings, type LucideIcon } from "lucide-react";

type Item = { label: string; icon: LucideIcon; href: string };

const main: Item[] = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Clients", icon: Users, href: "#" },
  { label: "Work", icon: Briefcase, href: "#" },
  { label: "Create", icon: Sparkles, href: "#" },
  { label: "Inbox", icon: Inbox, href: "#" },
  { label: "Insights", icon: LineChart, href: "#" },
];
const bottom: Item[] = [
  { label: "Apps", icon: LayoutGrid, href: "#" },
  { label: "Settings", icon: Settings, href: "#" },
];

function NavLink({ item, active = false }: { item: Item; active?: boolean }) {
  const Icon = item.icon;
  return (
    <a
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[14px] transition-colors duration-300 ${
        active ? "bg-white text-ink shadow-[0_1px_2px_rgba(16,16,40,0.04),0_6px_20px_-8px_rgba(30,30,80,0.12)] ring-1 ring-hair" : "text-mute hover:text-ink"
      }`}
    >
      <Icon size={17} strokeWidth={1.6} />
      <span className="tracking-[-0.01em]">{item.label}</span>
    </a>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-hair bg-white/60 px-4 py-7 backdrop-blur-xl md:flex">
      <div className="mb-10 flex items-center gap-2.5 px-3">
        <div className="relative h-7 w-7 overflow-hidden rounded-[9px] bg-gradient-to-br from-[#f6f3ff] via-white to-[#f7efe2] ring-1 ring-hair">
          <div className="absolute inset-[7px] rounded-full bg-gradient-to-br from-sky/70 to-iris/70 blur-[1px]" />
        </div>
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Mithoo</span>
      </div>
      <nav className="flex flex-col gap-1">
        {main.map((i) => <NavLink key={i.label} item={i} active={i.label === "Home"} />)}
      </nav>
      <nav className="mt-auto flex flex-col gap-1">
        {bottom.map((i) => <NavLink key={i.label} item={i} />)}
      </nav>
    </aside>
  );
}
