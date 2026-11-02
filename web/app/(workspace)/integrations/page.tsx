import {getWorkspaceForRoute} from '@/server/auth/modules';
import {getIntegrationHub} from '@/server/adapters/integration-hub';
import {IntegrationHub} from '@/components/integration-hub';
import {Page,PageHeader,Card} from '@/components/ui/primitives';
export default async function Integrations(){
 const{client,workspace}=await getWorkspaceForRoute('/integrations');
 let data;
 try{data=await getIntegrationHub(client,workspace);}
 catch{return <Page><PageHeader title="Integrations" subtitle="Your tools, one workspace."/><Card className="p-8"><p role="alert">Connection status is temporarily unavailable. Refresh to try again.</p></Card></Page>;}
 return <IntegrationHub data={data}/>;
}
