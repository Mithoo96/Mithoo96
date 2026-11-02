'use client';
import {useEffect,useState} from 'react';
import {inspectElementVisibility} from '@/lib/ui/visibility';
import type {OrderRenderInspection} from '@/core/orders/render-inspection';
/** Explicit ?orderUiCheck=1 only. Reads DOM booleans and a credential-free RLS check. */
export function OrderRenderInspectionPanel({orderId,server}:{orderId:string;server:OrderRenderInspection}){
 const[report,setReport]=useState<Record<string,unknown>|null>(null);const[checks,setChecks]=useState(0);
 useEffect(()=>{let cancelled=false;let timer:number|undefined;let stop:number|undefined;async function inspect(){
 let fresh:unknown;try{const r=await fetch(`/api/health/order-access?orderId=${encodeURIComponent(orderId)}${server.deployment!=='UNAVAILABLE'?'&dpl='+encodeURIComponent(server.deployment):''}`,{cache:'no-store',credentials:'same-origin'});fresh=await r.json();}catch{fresh={error:'READ_ONLY_CHECK_UNAVAILABLE'};}
 if(cancelled)return;
 const publish=()=>{if(cancelled)return;const markers=[...document.querySelectorAll<HTMLElement>('[data-order-next-action]')];const buttons=[...document.querySelectorAll<HTMLButtonElement>('[data-order-verify]')];const sections=markers.map(inspectElementVisibility);const actions=buttons.map(inspectElementVisibility);
 setReport({page:server,freshRequest:fresh,pathMatches:location.pathname===`/orders/${orderId}`,welcomeActive:document.documentElement.classList.contains('launching'),nextActionPresent:markers.length>0,nextActionVisible:sections.some(s=>s.visible),verifyButtonPresent:buttons.length>0,verifyButtonVisible:actions.some(s=>s.visible),verifyButtonDisabled:buttons.length?buttons.every(b=>b.disabled):null,visibility:{sections,actions}});};
 publish();timer=window.setInterval(publish,1000);stop=window.setTimeout(()=>window.clearInterval(timer),12000);
 }void inspect();return()=>{cancelled=true;window.clearInterval(timer);window.clearTimeout(stop);};},[orderId,server,checks]);
 return <aside className="mb-5 rounded-2xl border border-hair bg-white p-5"><h2 className="font-semibold">Read-only order render inspection</h2><p className="my-3 text-sm text-mute">This temporary check does not change the order. Copy only the JSON below; it contains no credentials or customer information.</p><button type="button" className="mb-3 rounded-full bg-ink px-4 py-2 text-sm text-white" onClick={()=>setChecks(v=>v+1)}>Refresh read-only check</button><textarea readOnly aria-label="Safe order render inspection" className="w-full rounded-xl p-3 font-mono text-xs ring-1 ring-hair" rows={22} value={report?JSON.stringify(report,null,2):'Checking current session…'}/></aside>;
}
