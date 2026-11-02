import {notFound} from 'next/navigation';
import Link from 'next/link';
import {getWorkspaceForRoute} from '@/server/auth/modules';
import {getCreateWorkspace} from '@/server/adapters/create-workspace';
import {Page,PageHeader,Card,SectionTitle} from '@/components/ui/primitives';
import {ArrowUpRight,Sparkles} from 'lucide-react';
export default async function CreatePage({searchParams}:{searchParams:Promise<{preset?:string|string[]}>}){
 const params=await searchParams;if(Array.isArray(params.preset))notFound();const preset=typeof params.preset==='string'?params.preset:undefined;
 const{workspace}=await getWorkspaceForRoute('/create'+(preset!==undefined?'?preset='+encodeURIComponent(preset):''));const data=getCreateWorkspace(workspace,undefined,preset);
 return <Page><PageHeader title="Create" subtitle="Turn an idea into content. Mithoo keeps it on brand."/><div className="mb-8 flex flex-wrap gap-2.5" aria-label="Workspace content presets">{data.presets.map(p=>p.available?<Link key={p.id} href={`/create/${p.tool}?preset=${p.id}`} className="glass inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium"><Sparkles size={15}/>{p.name}</Link>:<span key={p.id} className="rounded-full bg-[#f7f7fa] px-4 py-3 text-sm text-mute">{p.name} · Not available</span>)}</div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.tools.map(t=><Link key={t.id} href={'/create/'+t.id} className="glass group flex min-h-[200px] flex-col rounded-[26px] p-6 transition-transform hover:-translate-y-1"><div className="flex justify-between"><Sparkles size={22} className="text-ink-soft"/><ArrowUpRight size={17} className="text-mute"/></div><h2 className="mt-auto pt-10 text-[19px] font-semibold">{t.name}</h2><p className="mt-1 text-sm text-mute">{t.purpose}</p></Link>)}</div><div className="mt-10"><SectionTitle>Drafts</SectionTitle><Card className="p-6"><p className="text-sm text-mute">Drafts are not stored in this workspace yet. You can write and download a draft. Publishing, scheduling, sending, and AI generation are not enabled.</p></Card></div></Page>;
}
