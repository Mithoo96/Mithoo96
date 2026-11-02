import {test,expect} from '@playwright/test';
import {login} from './login-helper';
test.skip(!process.env.DEMO_ACCOUNT_PASSWORD||!process.env.NEXT_PUBLIC_SUPABASE_URL,'Configured fictional staging account required');
const unrelated=/Doc Moise|W-2|1099|Social Security Card|36 waiting on clients|Organized in Drive|Request Document|Tax Returns|Insurance workflows/i;
test('Zile commerce workspace excludes vertical prototypes and exposes truthful channel boundaries',async({page},testInfo)=>{
 await page.goto('/login');await login(page,process.env.DEMO_ACCOUNT_PASSWORD!);await expect(page).toHaveURL('/');await page.keyboard.press('Escape');
 await expect(page.getByRole('heading',{name:'Your business is moving.',exact:true})).toBeVisible();
 await expect(page.locator('body')).not.toContainText(unrelated);
 const nav=page.locator('aside').first();
 for(const label of ['Home','Orders','Products','Work','Shipping','Customers','Inbox','Insights','Integrations','Settings'])await expect(nav.getByRole('link',{name:label,exact:true})).toBeVisible();
 for(const label of ['Clients','Documents','Tax','Insurance','Create','Apps'])await expect(nav.getByRole('link',{name:label,exact:true})).toHaveCount(0);
 await page.screenshot({path:testInfo.outputPath('zile-dashboard.png'),fullPage:true});
 for(const route of ['/products','/shipping','/customers','/inbox','/insights','/settings','/integrations']){
  const response=await page.goto(route);expect(response?.status()).toBe(200);await page.keyboard.press('Escape');await expect(page.locator('body')).not.toContainText(unrelated);await expect(page.getByRole('heading',{name:/Something went wrong|Application error/i})).toHaveCount(0);
 }
 await expect(page.getByRole('heading',{name:'Shopify',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'TikTok Shop',exact:true})).toBeVisible();await expect(page.locator('[data-testid=integration-status][data-state="Not Connected"]')).toHaveCount(2);await expect(page.locator('[data-testid=integration-status][data-state="Connected"]')).toHaveCount(0);
 await page.screenshot({path:testInfo.outputPath('sales-channels.png'),fullPage:true});
 await page.getByRole('button',{name:'Search',exact:true}).first().click();await expect(page.getByRole('dialog')).not.toContainText(unrelated);await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Notifications',exact:true}).first().click();await expect(page.getByRole('dialog')).not.toContainText(unrelated);await page.keyboard.press('Escape');
 for(const route of ['/documents','/clients','/clients/demo','/apps','/approvals','/appointments','/create','/create/campaign','/insights/revenue']){
  const response=await page.goto(route);expect(response?.status()).toBe(404);await expect(page.locator('body')).not.toContainText(unrelated);
 }
 await page.goto('/integrations');await page.keyboard.press('Escape');await page.setViewportSize({width:390,height:844});await expect(page.getByRole('heading',{name:'Integrations',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Open menu',exact:true}).click();await expect(page.getByRole('dialog').getByRole('link',{name:'Integrations',exact:true})).toBeVisible();await expect(page.getByRole('dialog').getByRole('link',{name:'Documents',exact:true})).toHaveCount(0);await page.keyboard.press('Escape');await page.screenshot({path:testInfo.outputPath('sales-channels-mobile.png'),fullPage:true});
});
test('employee cannot open owner commerce catalogs or sales channels',async({page})=>{
 await page.goto('/login');await login(page,process.env.DEMO_ACCOUNT_PASSWORD!,'employee1@zileboutik.demo');await expect(page).toHaveURL('/work');await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'Today’s Work',exact:true})).toBeVisible();
 for(const route of ['/products','/shipping','/customers','/integrations','/insights','/documents']){const response=await page.goto(route);expect(response?.status()).toBe(404);await expect(page.locator('body')).not.toContainText(unrelated);}
});
