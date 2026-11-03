import{test,expect}from'@playwright/test';import{login}from'./login-helper';
test('operational controls stay painted through the natural welcome path without Escape',async({page})=>{
 test.skip(process.env.RUN_READ_ONLY_VISIBILITY!=='1','Explicit read-only staging run required');
 let stage='normal owner authentication';try{
 await page.goto('/login');await login(page,process.env.DEMO_ACCOUNT_PASSWORD!);await expect(page).toHaveURL('/');
 // Existing seeded order: read-only, no new fixture, no business action invoked.
 stage='read existing NEW order';await page.goto('/orders/e0000000-0000-4000-8000-000000000001');const button=page.getByRole('button',{name:'Verify Order / Start Fulfillment',exact:true});await button.waitFor({state:'attached'});
 stage='computed visibility independent of launch state';await page.evaluate(()=>window.dispatchEvent(new Event('mithoo:replay-launch')));await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));expect(await page.evaluate(()=>document.documentElement.classList.contains('launching'))).toBe(true);expect(await button.evaluate(element=>{if(!element.getBoundingClientRect().width||!element.getBoundingClientRect().height)return false;for(let n:Element|null=element;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0')return false;}return true;})).toBe(true);
 stage='welcome closes naturally';await expect.poll(()=>page.evaluate(()=>document.documentElement.classList.contains('launching')),{timeout:15000}).toBe(false);await page.locator('.launch').waitFor({state:'hidden',timeout:15000});
 stage='genuine actionability without clicking';await button.click({trial:true});await expect(page.getByText('Current state: NEW',{exact:true})).toBeVisible();
 }catch{throw Error(`Read-only visibility regression failed at ${stage}; private details suppressed.`);}
});
