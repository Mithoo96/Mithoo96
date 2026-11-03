import {test,expect} from '@playwright/test';
import {login} from './login-helper';

test('versioned operational action transport returns validation and offers recovery without mutation',async({page})=>{
 test.skip(process.env.RUN_READ_ONLY_VISIBILITY!=='1','Explicit read-only staging run required');
 let stage='owner authentication';try{
 await page.goto('/login');await login(page,process.env.DEMO_ACCOUNT_PASSWORD!);await expect(page).toHaveURL('/');
 stage='read existing order';await page.goto('/orders/e0000000-0000-4000-8000-000000000001');await page.keyboard.press('Escape');
 const verify=page.getByRole('button',{name:'Verify Order / Start Fulfillment',exact:true});await expect(verify).toBeVisible();
 stage='deployment identity';const health=await page.request.get('/api/health/order-access?orderId=e0000000-0000-4000-8000-000000000001');expect(health.status()).toBe(200);const {deployment}=await health.json() as {deployment:string};expect(deployment).toMatch(/^dpl_/);
 let stale=false;let requests=0;let versionMatches=false;let payloadRejected=false;
 await page.route('**/orders/e0000000-0000-4000-8000-000000000001',async route=>{
 const request=route.request();if(request.method()!=='POST')return route.continue();requests++;
 const body=request.postData();versionMatches=request.headers()['x-deployment-id']===deployment;
 if(!body?.includes('verifyOrder')||!body.includes('e0000000-0000-4000-8000-000000000001')){payloadRejected=true;return route.abort();}
 // Both paths are non-mutating: schema rejection before DB access, or an intercepted stale response.
 if(stale)return route.fulfill({status:409,headers:{'x-nextjs-action-not-found':'1','content-type':'text/plain'},body:'Outdated action reference'});
 return route.continue({postData:body.replaceAll('e0000000-0000-4000-8000-000000000001','invalid-order-id')});
 });
 stage='fresh authenticated action schema rejection';const response=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/orders/'));await verify.click();const result=await response;expect(result.status()).toBe(200);expect(await result.text()).toContain('VALIDATION_FAILED');await expect(page.getByRole('status').filter({hasText:'Invalid input'})).toBeVisible();expect(versionMatches).toBe(true);expect(payloadRejected).toBe(false);
 stage='stale reference recovery without retry';stale=true;await verify.click();await expect(page.getByRole('button',{name:'Refresh order page',exact:true})).toBeVisible();await expect(verify).toBeDisabled();expect(requests).toBe(2);await expect(page.getByText('Current state: NEW',{exact:true})).toBeVisible();
 }catch(error){const kind=error instanceof Error?error.name:'Unknown';throw Error(`Read-only action transport check failed at ${stage} (${kind}); private details suppressed.`);}
});
