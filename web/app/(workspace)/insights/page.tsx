import {getWorkspaceForRoute} from '@/server/auth/modules';
import {getWorkspaceInsights} from '@/server/adapters/insights';
import {Page,PageHeader,Card} from '@/components/ui/primitives';
export default async function InsightsPage(){
 const{client,workspace}=await getWorkspaceForRoute('/insights');let data;
 try{data=await getWorkspaceInsights(client,workspace);}catch{return <Page><PageHeader title="Insights"/><Card className="p-8"><p role="alert">Insights are temporarily unavailable. No estimates are shown.</p></Card></Page>;}
 return <Page><PageHeader title="Insights" subtitle={data.subtitle}/><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.metrics.map(m=><Card key={m.label} className="p-6"><p className="text-[32px] font-semibold tabular-nums">{m.value}</p><p className="mt-2 text-sm text-mute">{m.label}</p></Card>)}</div><p className="mt-5 text-[13px] text-mute">Stored workspace counts · {data.timezone}. No forecasts, unconnected channel activity, or unverified outcomes are assumed.</p></Page>;
}
