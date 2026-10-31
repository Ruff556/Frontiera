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
for(const [width,height] of [[390,844],[430,932]]) test(`M1 mobile ${width}×${height}: cella chiara arrotondata, scroll e pannelli blu in espansione`,async({page})=>{
 const r=await open(page,width,height);await expect(r).toHaveAttribute('data-layout','mobile');await expect(r.locator('.secnav')).toBeHidden();
 await expect(page.locator('.secroll')).toHaveCount(0);await r.locator('[data-resume]').click();
 await r.locator('.mr-reading').evaluate(el=>el.scrollTop+=600);
 const styles=await r.evaluate(r=>({paper:getComputedStyle(r.querySelector('.mr-paper')).backgroundColor,frame:getComputedStyle(r.querySelector('.mr-reading-frame')).backgroundColor,text:getComputedStyle(r.querySelector('.mr-paper')).color,strong:getComputedStyle(r.querySelector('.mr-paper strong')).color,graph:getComputedStyle(r.querySelector('.mr-graph')).backgroundImage}));
 expect(styles).toMatchObject({paper:'rgba(0, 0, 0, 0)',frame:'rgb(244, 246, 244)',text:'rgb(26, 39, 48)',strong:'rgb(15, 26, 34)'});
 const frame=r.locator('.mr-reading-frame');
 const geometry=await frame.evaluate(el=>{const s=getComputedStyle(el);return {radius:s.borderRadius,border:s.border,shadow:s.boxShadow};});
 expect(geometry.radius).toBe(await r.locator('.mr-graph').evaluate(el=>getComputedStyle(el).borderRadius));
 expect(parseFloat(geometry.radius)).toBeGreaterThan(0);expect(geometry.border).toBe('1px solid rgb(220, 225, 221)');expect(geometry.shadow).not.toBe('none');
 const bounds=await frame.boundingBox(),beforeWheel=await r.locator('.mr-reading').evaluate(el=>el.scrollTop);
 await r.locator('.mr-reading').hover();await page.mouse.wheel(0,260);
 await expect.poll(()=>r.locator('.mr-reading').evaluate(el=>el.scrollTop)).toBeGreaterThan(beforeWheel);
 expect(await frame.boundingBox()).toEqual(bounds);expect(await page.evaluate(()=>scrollY)).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(styles.graph).toContain('23, 44, 57');await page.screenshot({path:`reports/modelli/mobile-card-${width}.png`});
 const offset=await r.locator('.mr-reading').evaluate(el=>el.scrollTop);
 await r.locator('[data-expand]').click();await expect(r).toHaveAttribute('data-overview','true');
 await r.locator('[data-resume]').click();expect(await r.locator('.mr-reading').evaluate(el=>el.scrollTop)).toBe(offset);
});

for(const [width,height] of [[320,568],[390,844],[430,932],[768,1024],[1000,660]]) test(`M1 mobile ${width}×${height}: rail compatta, salti e contesto indipendente dal focus`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const r=await open(page,width,height),nav=r.locator('.secnav'),read=r.locator('.mr-reading');
 await expect(nav).toBeHidden();await r.locator('[data-resume]').click();
 await expect(nav).toBeVisible();await expect(page.locator('.secroll')).toHaveCount(0);
 const links=nav.locator('.secnav-title'),defs=await page.evaluate(()=>window.FrontieraModels.m1.defs);
 await expect(links).toHaveCount(8);
 const frame=await r.locator('.mr-reading-frame').boundingBox();
 for(const def of [...defs].reverse()) {
  const link=nav.locator(`.secnav-title[href="#mr-variable-${def.id.toLowerCase()}"]`);
  await expect(link).toHaveAccessibleName(`${def.symbol} · ${def.name}`);
  await expect(link.locator('.secnav-short-label')).toHaveText(def.symbol);
  await link.click();await expect(r).toHaveAttribute('data-focus',def.id);
  await expect(link).toHaveAttribute('aria-current','true');
  const geometry=await r.evaluate((r,id)=>{
   const rail=r.querySelector('.secnav-panel').getBoundingClientRect(),paper=r.querySelector('.mr-paper');
   const p=paper.getBoundingClientRect(),style=getComputedStyle(paper),read=r.querySelector('.mr-reading');
   const target=r.querySelector(`[data-context-variable="${id}"]`).getBoundingClientRect();
   return {rail:rail.toJSON(),proseRight:p.right-parseFloat(style.paddingRight),
    targetOffset:target.top-read.getBoundingClientRect().top-parseFloat(getComputedStyle(r).getPropertyValue('--mr-compact')),windowScroll:scrollY};
  },def.id);
  expect(Math.abs(geometry.targetOffset-24)).toBeLessThanOrEqual(1);
  expect(geometry.proseRight+4).toBeLessThan(geometry.rail.left);
  expect(geometry.rail.top).toBeGreaterThanOrEqual(frame.y);
  expect(geometry.rail.bottom).toBeLessThanOrEqual(frame.y+frame.height);
  expect(geometry.rail.width).toBeLessThanOrEqual(30);
  expect(geometry.windowScroll).toBe(0);
  const after=await r.locator('.mr-reading-frame').boundingBox();
  for(const key of ['x','y','width','height'])expect(Math.abs(after[key]-frame[key])).toBeLessThanOrEqual(1);
 }
 const kg=nav.locator('[href="#mr-variable-kg"].secnav-title');
 await kg.focus();await page.keyboard.press('ArrowDown');
 await expect(nav.locator('[href="#mr-variable-kl"].secnav-title')).toBeFocused();
 await page.keyboard.press('Enter');await expect(r).toHaveAttribute('data-focus','KL');
 await expect(page.locator('#mr-variable-kl')).toBeFocused();
 await nav.locator('[href="#mr-variable-gc"].secnav-title').click();
 await r.locator('.mr-legend [data-focus="GC"]').click();await expect(r).toHaveAttribute('data-sync','focus');
 await nav.locator('[href="#mr-variable-df"].secnav-title').click();
 await expect(r).toHaveAttribute('data-focus','GC');
 await expect(nav.locator('[href="#mr-variable-df"].secnav-title')).toHaveAttribute('aria-current','true');
 await r.locator('[data-focus-sync]').click();await expect(r).toHaveAttribute('data-focus','DF');
 const offset=await read.evaluate(el=>el.scrollTop);
 await page.mouse.move(frame.x+40,frame.y+frame.height*.6);await page.mouse.wheel(0,-180);
 await expect.poll(()=>read.evaluate(el=>el.scrollTop)).toBeLessThan(offset);
 const before=await read.evaluate(el=>el.scrollTop);
 await r.locator('[data-expand]').click();await expect(nav).toBeHidden();
 await r.locator('[data-resume]').click();await expect(nav).toBeVisible();
 expect(await read.evaluate(el=>el.scrollTop)).toBe(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

for(const [width,height] of [[1366,768],[1440,900],[390,844],[430,932]]) test(`M1 ${width}×${height}: highlight multilinea senza reflow al cambio di focus`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const r=await open(page,width,height);
 if(await r.getAttribute('data-layout')==='mobile')await r.locator('[data-resume]').click();
 const link=r.locator('.secnav-title[href="#mr-variable-sc"]');await link.focus();await link.press('Enter');
 await expect(r).toHaveAttribute('data-focus','SC');
 const term=r.locator('[data-term="SC"]');
 const measure=()=>term.evaluate(el=>{
  const s=getComputedStyle(el),r=el.closest('[data-model-reader]'),read=r.querySelector('.mr-reading');
  return {rects:[...el.getClientRects()].map(b=>b.toJSON()),scroll:read.scrollTop,paperHeight:r.querySelector('.mr-paper').getBoundingClientRect().height,
   clone:s.boxDecorationBreak,padding:s.paddingInlineStart,radius:s.borderRadius,background:s.backgroundColor,variable:s.getPropertyValue('--variable').trim()};
 });
 const before=await measure();
 expect(before.rects.length).toBeGreaterThanOrEqual(2);expect(before.clone).toBe('clone');
 expect(parseFloat(before.padding)).toBeGreaterThan(0);expect(parseFloat(before.radius)).toBeGreaterThan(0);
 const rgb=before.variable.replace('#','').match(/../g).map(v=>parseInt(v,16));
 expect(before.background).toBe(`rgb(${rgb.join(', ')})`);
 await r.locator('.mr-legend [data-focus="GC"]').click();
 await expect(r).toHaveAttribute('data-focus','GC');
 const neutral=await measure();expect(neutral.rects).toEqual(before.rects);expect(neutral.scroll).toBe(before.scroll);expect(neutral.paperHeight).toBe(before.paperHeight);
 await r.locator('.mr-legend [data-focus="SC"]').click();
 await expect(r).toHaveAttribute('data-focus','SC');
 const again=await measure();expect(again.rects).toEqual(before.rects);expect(again.scroll).toBe(before.scroll);
 await page.screenshot({path:`reports/modelli/polish-${width}-highlight.png`});
});

test('M1 mobile: touch e salto animato riusano la rail senza intercettare lo scroll',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'no-preference'});
 const page=await context.newPage();await page.goto('http://127.0.0.1:4173/anteprime/modelli/m1/');
 const r=page.locator(ROOT);await expect(r).toHaveAttribute('data-ready','true');await page.evaluate(()=>document.fonts.ready);
 await r.locator('[data-resume]').tap();const nav=r.locator('.secnav');await expect(nav).toBeVisible();
 await nav.locator('.secnav-title[href="#mr-variable-kg"]').tap();
 await expect(r).toHaveAttribute('data-focus','KG');
 await expect.poll(()=>r.locator('#mr-variable-kg').evaluate(el=>{
  const r=el.closest('[data-model-reader]');return Math.round(el.getBoundingClientRect().top-r.querySelector('.mr-reading').getBoundingClientRect().top-parseFloat(getComputedStyle(r).getPropertyValue('--mr-compact')));
 })).toBe(24);
 await expect(nav.locator('.secnav-title[href="#mr-variable-kg"]')).toHaveAttribute('aria-current','true');
 await page.screenshot({path:'reports/modelli/polish-390-navigation.png'});
 await page.setViewportSize({width:1366,height:768});await expect(r).toHaveAttribute('data-layout','desktop');
 await expect(nav.locator('.secnav-rail')).toBeVisible();await expect(nav.locator('.secnav-short-label').first()).toBeHidden();
 await page.setViewportSize({width:430,height:932});await expect(r).toHaveAttribute('data-layout','mobile');await expect(nav).toBeVisible();
 expect(await nav.locator('.secnav-title').count()).toBe(8);await context.close();
});
