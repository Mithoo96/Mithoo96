import { Hero } from "@/components/hero";
import { TodayCard, AiActivity, QuickActions, Approvals } from "@/components/sections";
import { Page } from "@/components/ui/primitives";

export default function Home() {
  return (
    <Page>
      <Hero />
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <TodayCard />
        <AiActivity />
      </div>
      <div className="mt-5"><QuickActions /></div>
      <div className="mt-5"><Approvals /></div>
    </Page>
  );
}
