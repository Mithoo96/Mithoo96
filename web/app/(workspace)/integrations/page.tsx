import {getWorkspaceForRoute} from '@/server/auth/modules';
import {getIntegrationHub} from '@/server/adapters/integration-hub';
import {IntegrationHub} from '@/components/integration-hub';
import {Page,PageHeader,Card} from '@/components/ui/primitives';
export default async function Integrations({searchParams}:{searchParams:Promise<{tiktok?:string}>}){
 const result=(await searchParams).tiktok;
 const notice=result==='authorized'?'TikTok Shop authorization verified. Order synchronization is not enabled.':result==='denied'?'TikTok Shop authorization was cancelled. Your connection has not changed.':null;
 const{client,workspace}=await getWorkspaceForRoute('/integrations');
 let data;
 try{data=await getIntegrationHub(client,workspace);}
 catch{return <Page><PageHeader title="Integrations" subtitle="Your tools, one workspace."/><Card className="p-8"><p role="alert">Connection status is temporarily unavailable. Refresh to try again.</p></Card></Page>;}
 return <>{notice&&<p role="status" className="mx-auto max-w-6xl px-6 pt-6 text-sm text-mute">{notice}</p>}<IntegrationHub data={data}/></>;
}
