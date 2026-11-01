import { Mic, Sparkles, ArrowUp } from "lucide-react";

export function CommandBar() {
  return (
    <div className="pointer-events-none sticky bottom-0 z-10 -mx-6 bg-gradient-to-t from-white via-white/90 to-transparent px-6 pb-8 pt-10 md:-mx-12 md:px-12">
      <form
        className="glass pointer-events-auto relative mx-auto flex max-w-3xl items-center gap-3 rounded-full py-2.5 pl-5 pr-2.5 ring-1 ring-transparent transition-shadow duration-500 focus-within:shadow-[0_0_0_6px_rgba(139,124,246,0.08),0_18px_50px_-18px_rgba(60,60,140,0.25)]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e6edff] via-[#efe9ff] to-[#f6eedd]">
          <Sparkles size={15} strokeWidth={1.7} className="text-iris" />
        </span>
        <input
          type="text"
          placeholder="Ask your business anything..."
          aria-label="Ask your business anything"
          className="min-w-0 flex-1 bg-transparent text-[15px] tracking-[-0.01em] text-ink placeholder:text-mute focus:outline-none"
        />
        <button type="button" aria-label="Voice input" className="flex h-9 w-9 items-center justify-center rounded-full text-mute transition-colors hover:bg-[#f4f4f8] hover:text-ink">
          <Mic size={17} strokeWidth={1.6} />
        </button>
        <button type="button" aria-label="Send" className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white">
          <ArrowUp size={16} strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}
