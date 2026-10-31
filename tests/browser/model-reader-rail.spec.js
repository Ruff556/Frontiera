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
 await expect(page.locator('.secroll')).toHaveCount(1);await expect(page.locator('.secroll')).not.toHaveClass(/is-visible/);
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
 await expect(page.locator('.secroll')).toHaveCount(1);await expect(page.locator('.secroll')).not.toHaveClass(/is-visible/);await r.locator('[data-resume]').click();
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

async function selectSection(page,id,keyboard=false) {
 const capsule=page.locator('.secroll-capsule');
 if(keyboard) {await capsule.focus();await capsule.press('Enter');}
 else await capsule.click();
 const link=page.locator(`.secroll-menu-item[href="#mr-variable-${id.toLowerCase()}"]`);
 if(keyboard) {await link.focus();await link.press('Enter');}
 else await link.click();
}
for(const [width,height] of [[320,568],[390,844],[430,932],[768,1024],[1000,660],[1280,600]]) test(`M1 mobile ${width}×${height}: rullino originale, salti e contesto indipendente dal focus`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const r=await open(page,width,height),nav=page.locator('.secroll'),read=r.locator('.mr-reading');
 await expect(r).toHaveAttribute('data-layout','mobile');
 await expect(nav).not.toHaveClass(/is-visible/);await r.locator('[data-resume]').click();
 await expect(nav).toHaveClass(/is-visible/);await expect(r.locator('.secnav')).toBeHidden();
 await expect(page.locator('.secroll')).toHaveCount(1);
 const links=nav.locator('.secroll-menu-item'),defs=await page.evaluate(()=>window.FrontieraModels.m1.defs);
 await expect(links).toHaveCount(8);await expect(nav.locator('.secroll-tick')).toHaveCount(8);
 expect(await links.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')))).toEqual(ids.map(id=>`#mr-variable-${id}`));
 const frame=await r.locator('.mr-reading-frame').boundingBox();
 for(const def of [...defs].reverse()) {
  await selectSection(page,def.id);await expect(r).toHaveAttribute('data-focus',def.id);
  const link=nav.locator(`.secroll-menu-item[href="#mr-variable-${def.id.toLowerCase()}"]`);
  await nav.locator('.secroll-capsule').click();await expect(link).toHaveAttribute('aria-current','true');
  await expect(link).toHaveAccessibleName(`${def.symbol} · ${def.name}`);
  const menu=await nav.locator('.secroll-menu').boundingBox();
  expect(menu.y).toBeGreaterThanOrEqual(frame.y);expect(menu.y+menu.height).toBeLessThanOrEqual(frame.y+frame.height);
  await page.keyboard.press('Escape');
  const geometry=await r.evaluate((r,id)=>{
   const capsule=r.querySelector('.secroll-capsule').getBoundingClientRect(),paper=r.querySelector('.mr-paper');
   const p=paper.getBoundingClientRect(),style=getComputedStyle(paper),read=r.querySelector('.mr-reading');
   const target=r.querySelector(`[data-context-variable="${id}"]`).getBoundingClientRect();
   return {capsule:capsule.toJSON(),proseRight:p.right-parseFloat(style.paddingRight),
    targetOffset:target.top-read.getBoundingClientRect().top-parseFloat(getComputedStyle(r).getPropertyValue('--mr-compact')),windowScroll:scrollY};
  },def.id);
  expect(Math.abs(geometry.targetOffset-24)).toBeLessThanOrEqual(1);
  expect(geometry.proseRight+4).toBeLessThan(geometry.capsule.left);
  expect(geometry.capsule.top).toBeGreaterThanOrEqual(frame.y);
  expect(geometry.capsule.bottom).toBeLessThanOrEqual(frame.y+frame.height);
  expect(geometry.windowScroll).toBe(0);
  await expect.poll(()=>nav.locator('.secroll-tick.is-center').evaluate(el=>[...el.parentNode.children].indexOf(el))).toBe(ids.indexOf(def.id.toLowerCase()));
  const after=await r.locator('.mr-reading-frame').boundingBox();
  for(const key of ['x','y','width','height'])expect(Math.abs(after[key]-frame[key])).toBeLessThanOrEqual(1);
 }
 await selectSection(page,'KG',true);await expect(page.locator('#mr-variable-kg')).toBeFocused();
 await nav.locator('.secroll-capsule').focus();await page.keyboard.press('Enter');
 await page.keyboard.press('ArrowDown');await expect(nav.locator('[href="#mr-variable-kl"].secroll-menu-item')).toBeFocused();
 await page.keyboard.press('Enter');await expect(r).toHaveAttribute('data-focus','KL');
 await expect(page.locator('#mr-variable-kl')).toBeFocused();
 await selectSection(page,'GC');
 await r.locator('.mr-legend [data-focus="GC"]').click();await expect(r).toHaveAttribute('data-sync','focus');
 await selectSection(page,'DF');await expect(r).toHaveAttribute('data-focus','GC');
 await nav.locator('.secroll-capsule').click();await expect(nav.locator('[href="#mr-variable-df"].secroll-menu-item')).toHaveAttribute('aria-current','true');
 await page.keyboard.press('Escape');
 await r.locator('[data-focus-sync]').click();await expect(r).toHaveAttribute('data-focus','DF');
 const offset=await read.evaluate(el=>el.scrollTop);
 await page.mouse.move(frame.x+40,frame.y+frame.height*.6);await page.mouse.wheel(0,-180);
 await expect.poll(()=>read.evaluate(el=>el.scrollTop)).toBeLessThan(offset);
 const before=await read.evaluate(el=>el.scrollTop);
 await r.locator('[data-expand]').click();await expect(nav).not.toHaveClass(/is-visible/);
 await r.locator('[data-resume]').click();await expect(nav).toHaveClass(/is-visible/);
 expect(await read.evaluate(el=>el.scrollTop)).toBe(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 expect(errors).toEqual([]);
});

for(const [width,height] of [[1366,768],[1440,900],[390,844],[430,932]]) test(`M1 ${width}×${height}: highlight multilinea senza reflow al cambio di focus`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const r=await open(page,width,height);
 if(await r.getAttribute('data-layout')==='mobile')await r.locator('[data-resume]').click();
 if(await r.getAttribute('data-layout')==='mobile') await selectSection(page,'SC',true);
 else {const link=r.locator('.secnav-title[href="#mr-variable-sc"]');await link.focus();await link.press('Enter');}
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

test('M1 mobile: touch, drag e salto animato riusano il rullino originale',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'no-preference'});
 const page=await context.newPage();await page.goto('http://127.0.0.1:4173/anteprime/modelli/m1/');
 const r=page.locator(ROOT);await expect(r).toHaveAttribute('data-ready','true');await page.evaluate(()=>document.fonts.ready);
 await r.locator('[data-resume]').tap();const nav=page.locator('.secroll');await expect(nav).toHaveClass(/is-visible/);
 await nav.locator('.secroll-capsule').tap();await expect(nav.locator('.secroll-menu')).toHaveClass(/is-open/);
 await nav.locator('.secroll-menu-item[href="#mr-variable-kg"]').tap();
 await expect(r).toHaveAttribute('data-focus','KG');
 await expect.poll(()=>r.locator('#mr-variable-kg').evaluate(el=>{
  const r=el.closest('[data-model-reader]');return Math.round(el.getBoundingClientRect().top-r.querySelector('.mr-reading').getBoundingClientRect().top-parseFloat(getComputedStyle(r).getPropertyValue('--mr-compact')));
 })).toBe(24);
 const capsule=await nav.locator('.secroll-capsule').boundingBox(),x=capsule.x+capsule.width/2,y=capsule.y+capsule.height/2;
 const cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=6;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*11}]});
 await expect(nav.locator('.secroll-popup')).toHaveClass(/is-open/);
 await expect(nav.locator('.secroll-popup-text')).toContainText('GC');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page).toHaveURL(/#mr-variable-gc$/);await expect(r).toHaveAttribute('data-focus','GC');
 await expect(nav.locator('.secroll-capsule')).toHaveAttribute('aria-expanded','false');
 await page.screenshot({path:'reports/modelli/m1-secroll-touch-390.png'});
 await page.setViewportSize({width:1366,height:768});await expect(r).toHaveAttribute('data-layout','desktop');
 await expect(r.locator('.secnav-rail')).toBeVisible();await expect(nav).toBeHidden();
 await page.setViewportSize({width:430,height:932});await expect(r).toHaveAttribute('data-layout','mobile');await expect(nav).toHaveClass(/is-visible/);
 await expect(r.locator('.secnav')).toBeHidden();expect(await nav.locator('.secroll-menu-item').count()).toBe(8);await context.close();
});

for(const [width,height] of [[390,844],[430,932]]) test(`Articolo e M1 ${width}×${height}: stessa capsula, tacche, menu e drag`,async({page})=>{
 await page.setViewportSize({width,height});
 await page.goto('/analisi/storm-shadow-ucraina-fabbrica-profondita/');
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('[data-section-navigation]').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-60));
 const roll=page.locator('.secroll'),capsule=roll.locator('.secroll-capsule');
 await expect(roll).toHaveClass(/is-visible/);await expect(page.locator('.secnav')).toBeHidden();
 const appearance=()=>capsule.evaluate(el=>{
  const s=getComputedStyle(el),t=getComputedStyle(el.parentNode.querySelector('.secroll-tick.is-center'));
  return {width:s.width,height:s.height,radius:s.borderRadius,background:s.backgroundImage,border:s.border,shadow:s.boxShadow,blur:s.backdropFilter,touch:s.touchAction,tickWidth:t.width,tickHeight:t.height,tickColor:t.backgroundColor};
 });
 const articleStyle=await appearance();
 await capsule.click();const items=roll.locator('.secroll-menu-item');
 await expect(roll.locator('.secroll-menu')).toHaveClass(/is-open/);
 const secondHash=await items.nth(1).getAttribute('href');await items.nth(1).click();await expect(page).toHaveURL(new RegExp(`${secondHash}$`));
 const drag=async(delta)=>{
  const box=await capsule.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+delta,{steps:6});
  await expect(roll.locator('.secroll-popup')).toHaveClass(/is-open/);await page.mouse.up();
 };
 await drag(-22);const thirdHash=await items.nth(2).getAttribute('href');await expect(page).toHaveURL(new RegExp(`${thirdHash}$`));
 await capsule.click();await expect(items.nth(2)).toHaveAttribute('aria-current','true');await page.keyboard.press('Escape');
 await page.screenshot({path:`reports/modelli/article-secroll-${width}.png`});
 const r=await open(page,width,height);await r.locator('[data-resume]').click();await expect(roll).toHaveClass(/is-visible/);
 expect(await appearance()).toEqual(articleStyle);
 await selectSection(page,'C');await drag(-22);await expect(page).toHaveURL(/#mr-variable-u$/);await expect(r).toHaveAttribute('data-focus','U');
 await page.screenshot({path:`reports/modelli/m1-secroll-${width}.png`});
 // Native scrolling drives the same centered tick, independently of hash changes.
 await page.locator('#mr-variable-sc').evaluate(el=>{
  const read=el.closest('.mr-reading');read.scrollTop+=el.getBoundingClientRect().top-read.getBoundingClientRect().top-parseFloat(getComputedStyle(read).getPropertyValue('--section-navigation-inset'));
 });
 await expect.poll(()=>roll.locator('.secroll-tick.is-center').evaluate(el=>[...el.parentNode.children].indexOf(el))).toBe(5);
 expect(await page.evaluate(()=>scrollY)).toBe(0);
 await page.setViewportSize({width:1366,height:900});await page.goto('/analisi/storm-shadow-ucraina-fabbrica-profondita/');
 const desktop=page.locator('.secnav');await expect(desktop).toBeVisible();await expect(roll).toBeHidden();
 const target=desktop.locator('.secnav-title').nth(1);const href=await target.getAttribute('href');
 await desktop.locator('.secnav-tickitem').nth(1).click();await expect(page).toHaveURL(new RegExp(`${href}$`));await expect(target).toHaveAttribute('aria-current','true');
});

for(const [width,height] of [[390,844],[1366,768]]) test(`M1 ${width}×${height}: deep link e cambio hash rispettano il grafico`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto('/anteprime/modelli/m1/#mr-variable-kl');
 const r=page.locator(ROOT);await expect(r).toHaveAttribute('data-ready','true');await page.evaluate(()=>document.fonts.ready);
 const offset=()=>page.locator(locationSelector).evaluate(el=>{
  const read=el.closest('.mr-reading');return Math.round(el.getBoundingClientRect().top-read.getBoundingClientRect().top-parseFloat(getComputedStyle(read).getPropertyValue('--section-navigation-inset')||0));
 });
 let locationSelector='#mr-variable-kl';await expect.poll(offset).toBe(24);
 await expect(r).toHaveAttribute('data-focus','KL');
 await page.evaluate(()=>location.hash='mr-variable-sc');locationSelector='#mr-variable-sc';await expect.poll(offset).toBe(24);
 await expect(r).toHaveAttribute('data-focus','SC');expect(await page.evaluate(()=>scrollY)).toBe(0);
});
