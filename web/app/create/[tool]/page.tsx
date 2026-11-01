import { notFound } from "next/navigation";
import { VideoWorkspace } from "@/components/create/video";
import { SocialWorkspace } from "@/components/create/social";
import { ImageWorkspace } from "@/components/create/image";
import { EmailWorkspace } from "@/components/create/email";
import { AdWorkspace } from "@/components/create/ad";
import { CampaignWorkspace } from "@/components/create/campaign";

const map = { video: VideoWorkspace, social: SocialWorkspace, image: ImageWorkspace, email: EmailWorkspace, ad: AdWorkspace, campaign: CampaignWorkspace };
export function generateStaticParams() { return Object.keys(map).map((tool) => ({ tool })); }

export default async function Page({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const W = map[tool as keyof typeof map];
  if (!W) notFound();
  return <W />;
}
