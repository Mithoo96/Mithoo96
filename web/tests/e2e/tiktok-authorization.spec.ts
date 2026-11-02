import{test,expect}from'@playwright/test';
import{readFileSync}from'node:fs';
import{login}from'./login-helper';
const path=process.env.OPERATIONAL_FIXTURE_FILE;
const fixtures=path?JSON.parse(readFileSync(path,'utf8')) as {model:string;email:string;password:string}[]:[];
test('deployed callback rejects unsolicited requests without echoing authorization codes or login forwarding',async({request})=>{const response=await request.get('/api/integrations/tiktok/callback?code=fictional-do-not-reflect',{maxRedirects:0});expect(response.status()).toBe(400);expect(await response.text()).not.toContain('fictional-do-not-reflect');expect(response.headers()['cache-control']).toContain('no-store');expect(response.headers()['referrer-policy']).toBe('no-referrer');expect(response.headers().location).toBeUndefined();});
test('authorization setup uses the authenticated commerce workspace and never pretends to connect',async({page})=>{test.skip(!path,'Isolated fictional fixture required');const f=fixtures.find(f=>f.model==='ECOMMERCE')!;await page.goto('/login');await login(page,f.password,f.email);await expect(page).toHaveURL('/');await page.keyboard.press('Escape');const response=await page.goto('/integrations/tiktok/connect');expect(response?.status()).toBe(200);await expect(page.getByRole('heading',{name:'Connect TikTok Shop',exact:true})).toBeVisible();const form=page.locator('form[action="/api/integrations/tiktok/connect"]');if(await form.count()){await expect(form.getByRole('button',{name:'Continue to TikTok Shop'})).toBeVisible();}else{await expect(page.getByRole('status')).toContainText('awaiting app configuration');}await expect(page.locator('body')).toContainText('Order synchronization is not enabled');});
test('a Tax workspace cannot open commerce authorization setup',async({page})=>{test.skip(!path,'Isolated fictional fixture required');const f=fixtures.find(f=>f.model==='TAX')!;await page.goto('/login');await login(page,f.password,f.email);await expect(page).toHaveURL('/');await page.keyboard.press('Escape');const response=await page.goto('/integrations/tiktok/connect');expect(response?.status()).toBe(404);});
test('configured TikTok Connect starts a tenant-bound US seller authorization without connecting the shop',async({page,request},testInfo)=>{
 test.skip(!path,'Isolated fictional fixture required');const f=fixtures.find(f=>f.model==='ECOMMERCE')!;let stage='login';
 try{
  await page.goto('/login');await login(page,f.password,f.email);await expect(page).toHaveURL('/');await page.keyboard.press('Escape');await page.goto('/integrations');await page.keyboard.press('Escape');
  const card=page.locator('[data-provider="TIKTOK_SHOP"]');await expect(card.getByTestId('integration-status')).toHaveText('Not Connected');await expect(card.getByRole('button',{name:'Connect',exact:true})).toBeEnabled();
  let serverStatus=0,redirected=false;
  // Playwright only routes the first URL of a redirect chain. Fetch the real
  // initiation POST without following it, preserving its real state cookie.
  // Stop before seller consent, and never print the Location or cookie values.
  await page.route('**/api/integrations/tiktok/connect',async route=>{
   const response=await route.fetch({maxRedirects:0});serverStatus=response.status();const location=response.headers().location;
   if(location){const url=new URL(location);redirected=url.origin==='https://services.us.tiktokshop.com'&&url.pathname==='/open/authorize'&&!!url.searchParams.get('service_id')&&/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('state')??'')&&!url.searchParams.has('app_key')&&!url.searchParams.has('app_secret')&&!url.searchParams.has('access_token');}
   const headers=response.headers();for(const key of ['location','content-length','content-encoding'])delete headers[key];headers['content-type']='text/html';
   await route.fulfill({status:200,headers,body:'<p>Authorization redirect verified. Seller consent was not submitted.</p>'});
  });
  stage='secure authorization POST';await card.getByRole('button',{name:'Connect',exact:true}).click();await expect.poll(()=>serverStatus).toBe(303);expect(redirected).toBe(true);
  const base=testInfo.project.use.baseURL!;const stateCookie=(await page.context().cookies(base)).find(c=>c.name==='__Host-mithoo_tiktok_oauth');expect(!!stateCookie&&stateCookie.httpOnly&&stateCookie.secure&&stateCookie.sameSite==='Lax'&&stateCookie.path==='/').toBe(true);
  stage='CSRF and unchanged connection';const rejected=await page.context().request.post(base+'/api/integrations/tiktok/connect',{headers:{origin:'https://untrusted.example.test'},maxRedirects:0});expect(rejected.status()).toBe(403);
  const invalidCallback=await page.context().request.get(base+'/api/integrations/tiktok/callback?state='+'z'.repeat(43)+'&code=fictional-invalid',{maxRedirects:0});expect(invalidCallback.status()).toBe(400);
  await page.goto('/integrations');await page.keyboard.press('Escape');await expect(page.locator('[data-provider="TIKTOK_SHOP"]').getByTestId('integration-status')).toHaveText('Not Connected');const callback=await request.get('/api/integrations/tiktok/callback',{maxRedirects:0});expect(callback.status()).toBe(400);
 }catch{throw Error(`Hosted TikTok initiation failed at ${stage}; authorization identifiers, state and credentials suppressed.`);}
});
test('Tax and employee sessions cannot initiate TikTok authorization',async({page},testInfo)=>{test.skip(!path,'Isolated fictional fixtures required');for(const model of ['TAX','TEST_EMPLOYEE']){await page.context().clearCookies();const f=fixtures.find(f=>f.model===model)!;await page.goto('/login');await login(page,f.password,f.email);await page.waitForURL(u=>u.pathname==='/'||u.pathname==='/work');const response=await page.context().request.post(testInfo.project.use.baseURL!+'/api/integrations/tiktok/connect',{headers:{origin:testInfo.project.use.baseURL!},maxRedirects:0});expect(response.status()).toBe(403);}});
