/** Technical inspection only: never reads element text, identities, cookies or values. */
export function inspectElementVisibility(element:HTMLElement|null){
 if(!element)return{present:false,visible:false,reason:'NOT_RENDERED'};
 const rect=element.getBoundingClientRect();
 for(let node:HTMLElement|null=element;node;node=node.parentElement){
  const style=getComputedStyle(node);const opacity=style.opacity===''?1:Number(style.opacity);
  const reason=node.hidden?'HIDDEN_ATTRIBUTE':style.display==='none'?'DISPLAY_NONE':style.visibility==='hidden'||style.visibility==='collapse'?'VISIBILITY_HIDDEN':opacity===0?'OPACITY_ZERO':null;
  if(reason)return{present:true,visible:false,reason,blockingAncestor:{tag:node.tagName,display:style.display,visibility:style.visibility,opacity,routeEntrance:node.classList.contains('page-enter'),reactStagingContainer:/^[SBP]:/.test(node.id)}};
 }
 return{present:true,visible:rect.width>0&&rect.height>0,reason:rect.width>0&&rect.height>0?'VISIBLE':'ZERO_SIZE'};
}
