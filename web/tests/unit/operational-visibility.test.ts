// @vitest-environment jsdom
import{afterEach,expect,it,vi}from'vitest';import{inspectElementVisibility}from'@/lib/ui/visibility';
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();});
function target(parentStyle=''){document.body.innerHTML=`<div class="page-enter" style="${parentStyle}"><button>Test action</button></div>`;const b=document.querySelector('button')!;vi.spyOn(b,'getBoundingClientRect').mockReturnValue({width:100,height:40}as DOMRect);return b;}
it('detects an opacity-zero ancestor even when browser actionability considers the button present',()=>{const result=inspectElementVisibility(target('opacity:0'));expect(result).toMatchObject({visible:false,reason:'OPACITY_ZERO',blockingAncestor:{routeEntrance:true}});});
it('detects hidden and display-none ancestors without returning their text or identifiers',()=>{expect(inspectElementVisibility(target('display:none'))).toMatchObject({visible:false,reason:'DISPLAY_NONE'});const b=target();b.parentElement!.hidden=true;expect(inspectElementVisibility(b)).toMatchObject({visible:false,reason:'HIDDEN_ATTRIBUTE'});});
it('treats default opacity as visible and handles absent nodes safely',()=>{expect(inspectElementVisibility(target())).toMatchObject({visible:true,reason:'VISIBLE'});expect(inspectElementVisibility(null)).toMatchObject({visible:false,reason:'NOT_RENDERED'});});
