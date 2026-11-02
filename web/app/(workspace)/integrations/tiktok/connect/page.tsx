import {notFound} from 'next/navigation';
import {getWorkspaceForRoute} from '@/server/auth/modules';
import {viewScope} from '@/server/adapters/workspace-views';
import {tikTokConfig} from '@/server/integrations/tiktok/config';
import {Page,PageHeader,Card} from '@/components/ui/primitives';
export default async function ConnectTikTok(){const{workspace}=await getWorkspaceForRoute('/integrations');try{viewScope(workspace,['CORE','COMMERCE','INTEGRATIONS','TIKTOK_SHOP'],'integrations.manage');}catch{notFound();}const configured=!!tikTokConfig();return <Page><PageHeader title="Connect TikTok Shop" subtitle="Authorize a shop for this workspace."/><Card className="max-w-xl space-y-5 p-7"><p className="text-sm text-mute">You will authorize TikTok Shop for {workspace.profile.organization.name}. Order synchronization is not enabled by this authorization.</p>{configured?<form action="/api/integrations/tiktok/connect" method="post"><button className="rounded-full bg-ink px-6 py-3 text-sm text-white">Continue to TikTok Shop</button></form>:<p role="status" className="text-sm text-mute">Secure authorization is awaiting app configuration in this environment.</p>}</Card></Page>;}
