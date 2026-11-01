import { Sidebar } from "@/components/sidebar";
import { Hero, HeroGlow } from "@/components/hero";
import { TodayCard, AiActivity, QuickActions, Approvals } from "@/components/sections";
import { CommandBar } from "@/components/command-bar";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="relative flex-1 overflow-x-clip">
        <HeroGlow />
        <div className="relative mx-auto max-w-[1080px] px-6 md:px-12">
          <Hero />
          <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
            <TodayCard />
            <AiActivity />
          </div>
          <div className="mt-5">
            <QuickActions />
          </div>
          <div className="mt-5">
            <Approvals />
          </div>
          <CommandBar />
        </div>
      </main>
    </div>
  );
}
