'use client';
import {useEffect,useState} from 'react';
import type {OrderRenderInspection} from '@/core/orders/render-inspection';
function visible(element:HTMLElement|null){
 if(!element)return false;const rect=element.getBoundingClientRect();if(!rect.width||!rect.height)return false;
 for(let node:HTMLElement|null=element;node;node=node.parentElement){const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return false;}
 return true;
}
/** Explicit ?orderUiCheck=1 only. Reads DOM booleans and a credential-free RLS check. */
export function OrderRenderInspectionPanel({orderId,server}:{orderId:string;server:OrderRenderInspection}){
 const[report,setReport]=useState<Record<string,unknown>|null>(null);const[checks,setChecks]=useState(0);
 useEffect(()=>{let cancelled=false;async function inspect(){
 let fresh:unknown;try{const r=await fetch(`/api/health/order-access?orderId=${encodeURIComponent(orderId)}${server.deployment!=='UNAVAILABLE'?'&dpl='+encodeURIComponent(server.deployment):''}`,{cache:'no-store',credentials:'same-origin'});fresh=await r.json();}catch{fresh={error:'READ_ONLY_CHECK_UNAVAILABLE'};}
 await new Promise(resolve=>setTimeout(resolve,750));
 const marker=document.querySelector<HTMLElement>('[data-order-next-action]');const button=document.querySelector<HTMLElement>('[data-order-verify]');
 if(!cancelled)setReport({page:server,freshRequest:fresh,pathMatches:location.pathname===`/orders/${orderId}`,nextActionPresent:!!marker,nextActionVisible:visible(marker),verifyButtonPresent:!!button,verifyButtonVisible:visible(button),verifyButtonDisabled:button instanceof HTMLButtonElement?button.disabled:null});
 }void inspect();return()=>{cancelled=true;};},[orderId,server,checks]);
 return <aside className="mb-5 rounded-2xl border border-hair bg-white p-5"><h2 className="font-semibold">Read-only order render inspection</h2><p className="my-3 text-sm text-mute">This temporary check does not change the order. Copy only the JSON below; it contains no credentials or customer information.</p><button type="button" className="mb-3 rounded-full bg-ink px-4 py-2 text-sm text-white" onClick={()=>setChecks(v=>v+1)}>Refresh read-only check</button><textarea readOnly aria-label="Safe order render inspection" className="w-full rounded-xl p-3 font-mono text-xs ring-1 ring-hair" rows={22} value={report?JSON.stringify(report,null,2):'Checking current session…'}/></aside>;
}
