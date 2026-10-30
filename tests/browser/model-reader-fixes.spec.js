"use strict";
const {test,expect}=require('@playwright/test');
const URL='/anteprime/modelli/m1/', ROOT='[data-model-reader="m1"]';
async function open(page, viewport={width:390,height:844}) {
 await page.emulateMedia({reducedMotion:"reduce"});await page.setViewportSize(viewport);await page.goto(URL);
 await expect(page.locator('html')).toHaveAttribute('data-model-reader-ready','true');
 await page.evaluate(()=>document.fonts.ready);
 return page.locator(ROOT);
}
async function wheelTo(page,key) {
 const delta=await page.locator(ROOT).evaluate((r,key)=>{
  const read=r.querySelector('.mr-reading'),segment=r.querySelector(`[data-context-variable="${key}"]`);
  return segment.getBoundingClientRect().top-read.getBoundingClientRect().top-parseFloat(getComputedStyle(r).getPropertyValue('--mr-compact'))+12;
 },key);
 await page.mouse.move(180,700);await page.mouse.wheel(0,delta);
 await page.waitForTimeout(150);
}
async function outerStill(page) {
 await page.waitForTimeout(180);
 expect(await page.evaluate(()=>({x:scrollX,y:scrollY,body:document.body.scrollTop,main:document.querySelector('main').scrollTop}))).toEqual({x:0,y:0,body:0,main:0});
}
async function swipe(client,x1,y1,x2,y2) {
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y:y1}]});
 for(let i=1;i<=10;i++) {
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x1+(x2-x1)*i/10,y:y1+(y2-y1)*i/10}]});
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}

test.describe('A — contenitori e rappresentazione',()=>{
 for(const viewport of [{width:390,height:844},{width:1366,height:768}]) test(`A1: wheel esterna e confini interni, ${viewport.width}px`,async({page})=>{
  const r=await open(page,viewport);await expect(page.locator('footer')).toHaveCount(0);
  const heading=await r.locator('.mr-heading').boundingBox();
  await page.mouse.move(heading.x+50,heading.y+10);await page.mouse.wheel(0,800);await outerStill(page);
  const read=r.locator('.mr-reading'),box=await read.boundingBox();
  await read.evaluate(e=>e.scrollTop=e.scrollHeight);
  await page.mouse.move(box.x+box.width/2,box.y+box.height-60);await page.mouse.wheel(0,1000);await outerStill(page);
  await read.evaluate(e=>e.scrollTop=0);await page.mouse.wheel(0,-1000);await outerStill(page);
  const reserved=await r.getAttribute('data-reserved-height');
  await page.evaluate(()=>window.scrollTo(0,500));await page.setViewportSize({...viewport,height:viewport.height-1});await page.setViewportSize(viewport);
  await expect(r).toHaveAttribute('data-reserved-height',reserved);await outerStill(page);
 });
 test('A2/A3/A5/A6: trascinamento della linguetta, ripresa esatta, menu e touch nativo',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const page=await context.newPage();await page.goto(`http://127.0.0.1:4173${URL}`);
  const r=page.locator(ROOT),read=r.locator('.mr-reading');await expect(r).toHaveAttribute('data-ready','true');
  await r.locator('[data-resume]').tap();
  const client=await context.newCDPSession(page);const offset=await read.evaluate(e=>e.scrollTop);
  await swipe(client,180,740,180,480);await expect.poll(()=>read.evaluate(e=>e.scrollTop)).toBeGreaterThan(offset);
  await expect.poll(async()=>{const a=await read.evaluate(e=>e.scrollTop);await page.waitForTimeout(120);return (await read.evaluate(e=>e.scrollTop))-a;}).toBe(0);const before=await read.evaluate(e=>e.scrollTop);
  await r.locator('[data-expand]').tap();await expect(r).toHaveAttribute('data-space','expanded');const tab=await r.locator('[data-resume]').boundingBox();
  expect(tab.height).toBeGreaterThanOrEqual(44);expect(tab.y+tab.height).toBeCloseTo(844,0);
  await swipe(client,180,tab.y+tab.height/2,180,tab.y-200);await outerStill(page);
  await expect(r).toHaveAttribute('data-space','expanded');expect(await read.evaluate(e=>e.scrollTop)).toBe(before);
  const title=await r.locator('.mr-heading').boundingBox();await swipe(client,180,title.y+20,180,0);await outerStill(page);
  await r.locator('[data-resume]').tap();await expect(r).toHaveAttribute('data-space','reading');expect(await read.evaluate(e=>e.scrollTop)).toBe(before);
  await page.locator('#burger').tap();await expect(page.locator('#mobilemenu')).toHaveAttribute('aria-hidden','false');
  const link=page.locator('#mobilemenu a').first(),href=await link.getAttribute('href');await link.tap();await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator('html')).not.toHaveAttribute('data-model-reader-ready','true');await expect(page.locator('footer')).toHaveCount(1);
  await context.close();
 });
 for(const panel of [0,1,2]) test(`A4: espansione mostra tre pannelli partendo da ${panel}`,async({page})=>{
  const r=await open(page);await r.locator('[data-resume]').click();
  for(let i=0;i<panel;i++) await r.locator('[data-panel-step="1"]').click();
  const before=await r.locator('.mr-reading').evaluate(e=>e.scrollTop);
  await r.locator('[data-expand]').click();await expect(r).toHaveAttribute('data-overview','true');
  const plot=await r.locator('.mr-plots-window').boundingBox();
  for(const p of await r.locator('[data-model-panel]').all()) {
   await expect(p).toHaveAttribute('aria-hidden','false');const box=await p.boundingBox();
   expect(box.y).toBeGreaterThanOrEqual(plot.y-1);expect(box.y+box.height).toBeLessThanOrEqual(plot.y+plot.height+1);
  }
  await r.locator('[data-resume]').click();await expect(r).toHaveAttribute('data-overview','false');await expect(r).toHaveAttribute('data-panel',String(panel));
  expect(await r.locator('.mr-reading').evaluate(e=>e.scrollTop)).toBe(before);
 });
 test('A5: safe area e variazione della viewport conservano linguetta e separazione',async({page})=>{
  const r=await open(page);await page.addStyleTag({content:'.model-reader{--mr-safe-bottom:24px}'});
  await page.setViewportSize({width:390,height:744});await r.locator('[data-expand]').click();
  await expect.poll(async()=>Math.round((await r.locator('[data-resume]').boundingBox()).height)).toBe(68);
  for(const height of [744,844]) {
   await page.setViewportSize({width:390,height});
   await expect.poll(async()=>{const b=await r.locator('[data-resume]').boundingBox();return Math.round(b.y+b.height);}).toBe(height);
   const tab=await r.locator('[data-resume]').boundingBox(),graph=await r.locator('.mr-graph').boundingBox();
   expect(tab.y-graph.y-graph.height).toBeCloseTo(10.4,0);await outerStill(page);
  }
 });
 test('A3: espansione durante ingresso parziale conserva anche un offset breve',async({page})=>{
  const r=await open(page);await page.mouse.move(180,720);await page.mouse.wheel(0,80);
  await expect.poll(()=>r.locator('.mr-reading').evaluate(e=>e.scrollTop)).toBe(80);
  await r.locator('[data-expand]').click();await r.locator('[data-resume]').click();
  expect(await r.locator('.mr-reading').evaluate(e=>e.scrollTop)).toBe(80);
 });
 for(const failure of ['no-js','missing-module','render-error']) test(`A7: flusso accessibile con ${failure}`,async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:failure!=='no-js'});
  const page=await context.newPage();
  if(failure==='missing-module') await page.route('**/js/model-m1.js',route=>route.abort());
  if(failure==='render-error') await page.route('**/js/model-m1.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.FrontieraModels.m1.render=()=>{throw new Error("test initialization failure")};'});});
  await page.goto(`http://127.0.0.1:4173${URL}`);await page.waitForTimeout(150);
  await expect(page.locator(ROOT)).not.toHaveAttribute('data-ready','true');
  await page.mouse.move(180,700);await page.mouse.wheel(0,800);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  await page.locator(`${ROOT} .mr-prose p`).last().scrollIntoViewIfNeeded();
  await expect(page.locator(`${ROOT} .mr-prose p`).last()).toBeInViewport();
  await page.setViewportSize({width:430,height:932});await expect(page.locator('html')).not.toHaveAttribute('data-model-reader-ready','true');
  await context.close();
 });
});

test.describe('B — gerarchia di focus e navigazione',()=>{
 for(const align of ['data-focus-sync','data-panel-sync']) test(`B1/B2/B7/B8: riallineamento completo tramite ${align}`,async({page})=>{
  const r=await open(page);await wheelTo(page,'KL');await expect(r).toHaveAttribute('data-focus','KL');
  await r.locator('[data-panel-step="1"]').click();await expect(r).toHaveAttribute('data-panel','2');await expect(r).toHaveAttribute('data-focus','');
  await expect(r.locator('[data-focus-sync]')).toBeVisible();await expect(r.locator('[data-panel-sync]')).toHaveAttribute('aria-pressed','false');
  await r.locator('[data-panel-step="-1"]').click();await expect(r).toHaveAttribute('data-panel','1');
  const before=await r.locator('.mr-reading').evaluate(e=>e.scrollTop),space=await r.getAttribute('data-space');
  await r.locator(`[${align}]`).click();await expect(r).toHaveAttribute('data-sync','auto');await expect(r).toHaveAttribute('data-focus','KL');
  expect(await r.locator('.mr-reading').evaluate(e=>e.scrollTop)).toBe(before);await expect(r).toHaveAttribute('data-space',space);
  await wheelTo(page,'SC');await expect(r).toHaveAttribute('data-panel','2');await expect(r).toHaveAttribute('data-focus','SC');
  await wheelTo(page,'KG');await expect(r).toHaveAttribute('data-panel','1');await expect(r).toHaveAttribute('data-focus','KG');
 });
 test('B3/B4/B5: tap sul focus automatico lo fissa; secondo tap ripristina AUTO dal testo corrente',async({page})=>{
  const r=await open(page);await wheelTo(page,'KL');await expect(r).toHaveAttribute('data-focus','KL');
  const kl=r.locator('.mr-legend [data-focus="KL"]');await kl.click();await expect(r).toHaveAttribute('data-sync','focus');
  await wheelTo(page,'SC');await expect(r).toHaveAttribute('data-panel','1');await expect(r).toHaveAttribute('data-focus','KL');
  await kl.click();await expect(r).toHaveAttribute('data-sync','auto');await expect(r).toHaveAttribute('data-panel','2');await expect(r).toHaveAttribute('data-focus','SC');
  await wheelTo(page,'KL');await kl.click();await kl.click();await expect(r).toHaveAttribute('data-sync','auto');await expect(r).toHaveAttribute('data-focus','KL');
 });
 test('B6/B10: ultima scelta manuale prevale; espansione conserva focus e allineamento',async({page})=>{
  const r=await open(page);await wheelTo(page,'KL');await r.locator('.mr-legend [data-focus="KL"]').click();
  await r.locator('[data-panel-step="1"]').click();await expect(r).toHaveAttribute('data-sync','free');await expect(r).toHaveAttribute('data-panel','2');await expect(r).toHaveAttribute('data-focus','');
  await r.locator('.mr-legend [data-focus="SC"]').click();await expect(r).toHaveAttribute('data-sync','focus');
  const before=await r.locator('.mr-reading').evaluate(e=>e.scrollTop);
  await r.locator('[data-expand]').click();await expect(r).toHaveAttribute('data-focus','SC');await expect(r.locator('[data-focus-sync]')).toBeVisible();
  await r.locator('[data-resume]').click();await expect(r).toHaveAttribute('data-panel','2');await expect(r).toHaveAttribute('data-focus','SC');
  await r.locator('[data-expand]').click();await r.locator('[data-focus-sync]').click();await expect(r).toHaveAttribute('data-space','expanded');await expect(r).toHaveAttribute('data-sync','auto');
  await r.locator('[data-resume]').click();await expect(r).toHaveAttribute('data-panel','1');await expect(r).toHaveAttribute('data-focus','KL');
  expect(await r.locator('.mr-reading').evaluate(e=>e.scrollTop)).toBe(before);
 });
 test('B9: introduzione neutra dopo ritorno da focus manuale',async({page})=>{
  const r=await open(page);await r.locator('.mr-legend [data-focus="KL"]').click();await expect(r).toHaveAttribute('data-sync','focus');
  await r.locator('[data-panel-sync]').click();await expect(r).toHaveAttribute('data-focus','');await expect(r.locator('.is-muted')).toHaveCount(0);
  await r.locator('[data-resume]').click();await expect(r).toHaveAttribute('data-focus','');await expect(r.locator('.is-muted')).toHaveCount(0);
 });
 test('B11/B12: tempo selezionato e focus esclusivo desktop restano indipendenti',async({page})=>{
  const r=await open(page,{width:1366,height:768});await r.locator('[data-model-event="1"]').click();
  await r.locator('.mr-legend [data-focus="KL"]').click();await page.mouse.move(1100,600);await page.mouse.wheel(0,1500);await expect(r).toHaveAttribute('data-focus','KL');
  await r.locator('.mr-legend [data-focus="KL"]').click();await expect(r).toHaveAttribute('data-focus','');
  await page.setViewportSize({width:390,height:844});await expect(r).toHaveAttribute('data-layout','mobile');
  await r.locator('[data-panel-step="1"]').click();await r.locator('[data-focus-sync]').click();
  await page.setViewportSize({width:1366,height:768});await expect(r.locator('[data-model-event="1"]')).toHaveAttribute('aria-pressed','true');
 });
 test('B6: swipe reale annulla il focus manuale come le frecce',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const page=await context.newPage();await page.goto(`http://127.0.0.1:4173${URL}`);const r=page.locator(ROOT);await expect(r).toHaveAttribute('data-ready','true');
  await r.locator('.mr-legend [data-focus="KL"]').tap();await r.locator('[data-resume]').tap();
  const box=await r.locator('[data-panel-selector]').boundingBox(),client=await context.newCDPSession(page);
  await swipe(client,box.x+box.width*.8,box.y+20,box.x+box.width*.2,box.y+20);
  await expect(r).toHaveAttribute('data-panel','2');await expect(r).toHaveAttribute('data-sync','free');await expect(r).toHaveAttribute('data-focus','');
  await expect(r.locator('[data-focus-sync]')).toBeVisible();
  const before=await r.locator('.mr-reading').evaluate(e=>e.scrollTop);
  // Let Chromium finish the native touch gesture before starting a new tap.
  await page.waitForTimeout(350);
  await r.locator('[data-panel-sync]').tap();await expect(r).toHaveAttribute('data-sync','auto');await expect(r).toHaveAttribute('data-panel','0');
  expect(await r.locator('.mr-reading').evaluate(e=>e.scrollTop)).toBe(before);await context.close();
 });
});
