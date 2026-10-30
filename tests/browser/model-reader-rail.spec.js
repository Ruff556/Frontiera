"use strict";
const {test,expect}=require('@playwright/test');
const ROOT='[data-model-reader="m1"]';
const ids=['c','u','i','kg','kl','sc','gc','df'];
async function open(page,width,height) {
 await page.setViewportSize({width,height});await page.goto('/anteprime/modelli/m1/');
 const r=page.locator(ROOT);await expect(r).toHaveAttribute('data-ready','true');
 await page.evaluate(()=>document.fonts.ready);return r;
}
for(const [width,height] of [[1024,768],[1366,768],[1440,900]]) test(`M1 ${width}×${height}: rail Frontiera, otto variabili, click e focus preservato`,async({page})=>{
 const r=await open(page,width,height);await expect(r).toHaveAttribute('data-layout','desktop');
 await expect(page.locator('script[src="/js/nav-sezioni.js"]')).toHaveCount(1);
 const nav=r.locator('.secnav');await expect(nav).toBeVisible();
 await expect(nav.locator('.secnav-tick')).toHaveCount(8);await expect(nav.locator('.secnav-title')).toHaveCount(8);
 await expect(page.locator('.secroll')).toHaveCount(0);
 expect(await nav.locator('.secnav-title').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')))).toEqual(ids.map(id=>`#mr-variable-${id}`));
 const scrollStyle=await r.locator('.mr-reading').evaluate(el=>({width:getComputedStyle(el).scrollbarWidth,webkit:getComputedStyle(el,'::-webkit-scrollbar').display}));
 expect(scrollStyle).toEqual({width:'none',webkit:'none'});
 const read=await r.locator('.mr-reading').boundingBox(),rail=await nav.locator('.secnav-rail').boundingBox();
 expect(rail.x).toBeGreaterThanOrEqual(read.x+read.width);expect(rail.x+rail.width).toBeLessThanOrEqual(width);
 await nav.locator('.secnav-tickitem[href="#mr-variable-kg"]').click();await expect(r).toHaveAttribute('data-focus','KG');
 await expect(r.locator('[data-series="KG"].is-focused')).toHaveCount(3);
 await expect(nav.locator('.secnav-title.is-active')).toHaveAttribute('href','#mr-variable-kg');
 const geometry=await r.locator('.mr-band[data-series="KG"]').evaluate(el=>{
  const svg=el.ownerSVGElement,m=window.FrontieraModels.m1,left=49,right=svg.viewBox.baseVal.width-13,top=12,bottom=svg.viewBox.baseVal.height-23;
  const inside=t=>{const [a,b]=m.values('KG',t,{zero:137});return el.isPointInFill(new DOMPoint(left+t*(right-left),top+((a+b)/2-26)/233*(bottom-top)));};
  return {before:inside(.55),after:inside(.75),late:inside(.9),opacity:getComputedStyle(el).fillOpacity};
 });
 expect(geometry).toEqual({before:false,after:true,late:true,opacity:'0.14'});
 await page.waitForTimeout(180);await page.screenshot({path:`reports/modelli/kg-rail-${width}.png`});
 const title=nav.locator('.secnav-title[href="#mr-variable-sc"]');await title.focus();await page.keyboard.press('Enter');
 await expect(r).toHaveAttribute('data-focus','SC');await expect(page.locator('#mr-variable-sc')).toBeFocused();
 await r.locator('.mr-legend [data-focus="GC"]').click();await expect(r).toHaveAttribute('data-sync','focus');
 await nav.locator('.secnav-tickitem[href="#mr-variable-df"]').click();await expect(r).toHaveAttribute('data-focus','GC');
 await expect(nav.locator('.secnav-title.is-active')).toHaveAttribute('href','#mr-variable-df');
 await r.locator('[data-focus-sync]').click();await expect(r).toHaveAttribute('data-focus','DF');
 expect(await page.evaluate(()=>scrollY)).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('M1 mobile: lettura chiara, rail non sovrapposta e pannelli blu in espansione',async({page})=>{
 const r=await open(page,390,844);await expect(r).toHaveAttribute('data-layout','mobile');await expect(r.locator('.secnav')).toBeHidden();
 await expect(page.locator('.secroll')).toHaveCount(0);await r.locator('[data-resume]').click();
 await r.locator('.mr-reading').evaluate(el=>el.scrollTop+=600);
 const styles=await r.evaluate(r=>({paper:getComputedStyle(r.querySelector('.mr-paper')).backgroundColor,frame:getComputedStyle(r.querySelector('.mr-reading-frame')).backgroundColor,text:getComputedStyle(r.querySelector('.mr-paper')).color,strong:getComputedStyle(r.querySelector('.mr-paper strong')).color,graph:getComputedStyle(r.querySelector('.mr-graph')).backgroundImage}));
 expect(styles).toMatchObject({paper:'rgb(244, 246, 244)',frame:'rgb(244, 246, 244)',text:'rgb(26, 39, 48)',strong:'rgb(15, 26, 34)'});
 expect(styles.graph).toContain('23, 44, 57');await page.screenshot({path:'reports/modelli/kg-rail-mobile-reading.png'});
 const offset=await r.locator('.mr-reading').evaluate(el=>el.scrollTop);
 await r.locator('[data-expand]').click();await expect(r).toHaveAttribute('data-overview','true');
 await r.locator('[data-resume]').click();expect(await r.locator('.mr-reading').evaluate(el=>el.scrollTop)).toBe(offset);
});
