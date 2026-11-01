import { Hero } from "@/components/hero";
import { TodayCard, AiActivity, QuickActions, Approvals, ModeSwitcher, NeedsAttention, Pipeline } from "@/components/sections";
import { Page } from "@/components/ui/primitives";

export default function Home() {
  return (
    <Page>
      <Hero />
      <div className="rise -mt-4 mb-8" style={{ animationDelay: "280ms" }}><ModeSwitcher /></div>
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <TodayCard />
        <AiActivity />
      </div>
      <div className="mt-5"><Pipeline /></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <NeedsAttention />
        <Approvals />
      </div>
      <div className="mt-5"><QuickActions /></div>
    </Page>
  );
}
