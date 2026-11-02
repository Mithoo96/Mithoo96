import {WorkspaceSelection} from "@/components/team-setup";
import { getWorkspaceForRoute } from '@/server/auth/modules';
import { hasDocMoisePrototype } from '@/core/tenancy/modules';
import { Page,PageHeader,Card } from '@/components/ui/primitives';
import { getSessionEmployees } from '@/server/adapters/fulfillment';
export default async function SettingsPage(){
 const {client,workspace}=await getWorkspaceForRoute('/settings');
 if(hasDocMoisePrototype(workspace.profile.organization)){const{default:Prototype}=await import('@/components/prototype/doc-moise/pages/settings');return <Prototype/>;}
 const p=workspace.profile;
 let employees:Awaited<ReturnType<typeof getSessionEmployees>>=[];
 if(p.organization.enabledModules.includes('TEAM')&&(p.viewer.role==='OWNER'||p.viewer.role==='MANAGER'))employees=await getSessionEmployees(client,workspace);
 return <Page><WorkspaceSelection/><PageHeader title="Settings" subtitle={p.organization.name}/><div className="grid gap-6 lg:grid-cols-2"><Card className="p-6 md:p-8"><h2 id="profile" className="mb-5 text-[20px] font-semibold">My Profile</h2><p>{p.viewer.name??'Account name not set'}</p><p className="mt-2 text-[14px] text-mute">{p.viewer.role}</p></Card><Card className="p-6 md:p-8"><h2 id="business" className="mb-5 text-[20px] font-semibold">Business Profile</h2><p>{p.organization.name}</p><p className="mt-2 text-[14px] text-mute">{p.organization.timezone}</p><p className="mt-4 text-[13px] text-mute">Organization configuration is managed by your administrator.</p></Card><Card className="p-6 md:p-8"><h2 className="mb-5 text-[20px] font-semibold">Enabled modules</h2><p className="text-[14px]">{p.organization.enabledModules.join(' · ')}</p></Card>{p.organization.enabledModules.includes('TEAM')&&<Card className="p-6 md:p-8"><h2 id="team" className="mb-5 text-[20px] font-semibold">Employees</h2>{employees.map(e=><p key={e.id} className="border-b border-hair py-3 text-[14px]">{e.display_name??e.full_name??'Employee'}</p>)}{!employees.length&&<p className="text-[14px] text-mute">No employee records are visible for this session.</p>}</Card>}</div></Page>;
}
