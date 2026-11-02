import {notFound} from 'next/navigation';
import {getWorkspaceForRoute} from '@/server/auth/modules';
import {getCreateWorkspace} from '@/server/adapters/create-workspace';
import {ContentDraft} from '@/components/create/content-draft';
export default async function Tool({params,searchParams}:{params:Promise<{tool:string}>;searchParams:Promise<{preset?:string|string[]}>}){
 const{tool}=await params;const query=await searchParams;if(Array.isArray(query.preset))notFound();
 const path='/create/'+tool+(query.preset!==undefined?'?preset='+encodeURIComponent(query.preset):'');
 const{workspace}=await getWorkspaceForRoute(path);const data=getCreateWorkspace(workspace,tool,query.preset);if(!data.selection)notFound();return <ContentDraft key={`${workspace.profile.organization.id}:${tool}:${query.preset??''}`} selection={data.selection}/>;
}
