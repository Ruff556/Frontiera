"use strict";
const {test,expect}=require('@playwright/test');
const ROOT='[data-model-reader="m1"]';
async function open(page,width,height) {
 await page.setViewportSize({width,height});
 await page.goto('/anteprime/modelli/m1/');
 const r=page.locator(ROOT);
 await expect(r).toHaveAttribute('data-layout','desktop');
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 // Native wheel scrolling does not invoke this JS setter. Count only writes
 // made by the reader itself, without replacing the browser's scroll behavior.
 await r.locator('.mr-reading').evaluate(el=>{
  const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'scrollTop');
  window.readerScrollWrites=0;
  Object.defineProperty(el,'scrollTop',{get(){return descriptor.get.call(this);},set(value){window.readerScrollWrites++;descriptor.set.call(this,value);}});
 });
 return r;
}
async function wheelTo(page,r,selector) {
 const read=r.locator('.mr-reading'),box=await read.boundingBox();
 const {delta,target}=await r.evaluate((r,selector)=>{
  const read=r.querySelector('.mr-reading'),delta=r.querySelector(selector).getBoundingClientRect().top-read.getBoundingClientRect().top-24;
  return {delta,target:Math.max(0,Math.min(read.scrollHeight-read.clientHeight,read.scrollTop+delta))};
 },selector);
 await page.mouse.move(box.x+box.width*.65,box.y+box.height*.6);
 await page.mouse.wheel(0,delta);
 // wheel() returns before Chromium dispatches the native scroll. Wait for it
 // before measuring the next target, without writing the scroll position.
 await expect.poll(()=>read.evaluate((el,target)=>Math.abs(el.scrollTop-target),target)).toBeLessThanOrEqual(1);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
const variable=id=>`[data-context-variable="${id}"]`;
for(const [width,height] of [[1366,768],[1440,900]]) {
 test(`desktop AUTO ${width}×${height}: lettura nativa avanti/indietro, neutri e Df`,async({page})=>{
  const r=await open(page,width,height);
  await expect(r).toHaveAttribute('data-sync','auto');
  await expect(r).toHaveAttribute('data-focus','');
  await expect(r.locator('[data-series].is-muted')).toHaveCount(0);
  const sequence=[['C',0],['U',0],['I',1],['KG',1],['KL',1],['SC',2],['GC',2],['DF',2]];
  for(const [id,panel] of [...sequence,...sequence.slice().reverse()]) {
   await wheelTo(page,r,variable(id));
   await expect(r).toHaveAttribute('data-focus',id);
   await expect(r).toHaveAttribute('data-panel',String(panel));
   await expect(r).toHaveAttribute('data-sync','auto');
   for(const series of await r.locator(`[data-series="${id}"]`).all()) await expect(series).toHaveClass(/is-focused/);
   await expect(r.locator(`[data-focus="${id}"].mr-margin`)).toHaveAttribute('aria-pressed','true');
   for(const term of await r.locator(`[data-term="${id}"]`).all()) await expect(term).toHaveClass(/is-focused/);
  }
  for(const panel of [1,2,0]) {
   await wheelTo(page,r,`[data-context-panel="${panel}"][data-context-variable=""]`);
   await expect(r).toHaveAttribute('data-focus','');
   await expect(r).toHaveAttribute('data-panel',String(panel));
   await expect(r.locator('[data-series].is-muted')).toHaveCount(0);
  }
  await wheelTo(page,r,variable('DF'));await expect(r).toHaveAttribute('data-focus','DF');
  await expect(r.locator('[data-series="DF"].is-focused')).toHaveCount(3);
  await expect(r.locator('[data-description-title]')).toHaveText('Df · Debito funzionale');
  await page.screenshot({path:`reports/modelli/desktop-auto-${width}-df.png`});
  await r.evaluate(r=>{
   window.focusMutations=0;
   new MutationObserver(records=>window.focusMutations+=records.length).observe(r,{attributes:true,attributeFilter:['data-focus']});
  });
  for(let i=0;i<3;i++) await page.mouse.wheel(0,40);
  await page.waitForTimeout(180);
  await expect(r).toHaveAttribute('data-focus','DF');
  expect(await page.evaluate(()=>window.focusMutations)).toBe(0);
  expect(await page.evaluate(()=>window.readerScrollWrites)).toBe(0);
 });
 test(`desktop MANUALE ${width}×${height}: blocco, disattivazione, tastiera e riallineamento immediato`,async({page})=>{
  const r=await open(page,width,height),read=r.locator('.mr-reading');
  await wheelTo(page,r,variable('SC'));await expect(r).toHaveAttribute('data-focus','SC');
  const before=await read.evaluate(el=>el.scrollTop);
  await r.locator('.mr-legend [data-focus="GC"]').click();
  await expect(r).toHaveAttribute('data-sync','focus');
  expect(await read.evaluate(el=>el.scrollTop)).toBe(before);
  await wheelTo(page,r,variable('DF'));await expect(r).toHaveAttribute('data-focus','GC');
  await r.locator('.mr-legend [data-focus="GC"]').click();
  await expect(r).toHaveAttribute('data-focus','');
  await expect(r.locator('[data-series].is-muted')).toHaveCount(0);
  await page.mouse.wheel(0,90);await expect(r).toHaveAttribute('data-focus','');
  const offset=await read.evaluate(el=>el.scrollTop);
  const align=r.locator('[data-focus-sync]');await expect(align).toBeVisible();
  await align.focus();await page.keyboard.press('Enter');
  await expect(r).toHaveAttribute('data-sync','auto');
  await expect(r).toHaveAttribute('data-focus','DF');
  expect(await read.evaluate(el=>el.scrollTop)).toBe(offset);
  expect(await page.evaluate(()=>window.readerScrollWrites)).toBe(0);
  // AUTO carries the visible editorial context through both layout changes.
  await page.setViewportSize({width:390,height:844});
  await expect(r).toHaveAttribute('data-layout','mobile');await expect(r).toHaveAttribute('data-focus','DF');
  await page.setViewportSize({width,height});
  await expect(r).toHaveAttribute('data-layout','desktop');await expect(r).toHaveAttribute('data-focus','DF');
  await expect(r).toHaveAttribute('data-sync','auto');
 });
}
test('desktop: confini stabili, scroll rapido e altezze editoriali aggiornate',async({page})=>{
 const r=await open(page,1366,768),read=r.locator('.mr-reading');
 const boundary=await r.evaluate(r=>r.querySelector('[data-context-variable="GC"]').getBoundingClientRect().top-r.querySelector('.mr-reading').getBoundingClientRect().top-32);
 for(const [delta,id] of [[-1,'SC'],[1,'GC'],[-1,'SC'],[1,'GC']]) {
  await read.evaluate((el,top)=>el.scrollTop=top,boundary+delta);
  await expect(r).toHaveAttribute('data-focus',id);await page.waitForTimeout(70);
  await expect(r).toHaveAttribute('data-focus',id);
 }
 await r.evaluate(r=>{
  const read=r.querySelector('.mr-reading');
  for(const id of ['C','GC','KG','DF']) read.scrollTop+=r.querySelector(`[data-context-variable="${id}"]`).getBoundingClientRect().top-read.getBoundingClientRect().top-24;
 });
 await expect(r).toHaveAttribute('data-focus','DF');
 await wheelTo(page,r,variable('KG'));await expect(r).toHaveAttribute('data-focus','KG');
 await read.evaluate(el=>el.style.overflowAnchor='none');
 await r.locator(variable('I')).evaluate(el=>{const spacer=document.createElement('div');spacer.style.height='1000px';el.append(spacer);});
 await expect(r).toHaveAttribute('data-focus','I');
 await expect(r).toHaveAttribute('data-panel','1');
 await r.evaluate(r=>{
  window.focusMutations=0;
  new MutationObserver(records=>window.focusMutations+=records.length).observe(r,{attributes:true,attributeFilter:['data-focus']});
 });
 await r.locator(variable('I')).evaluate(el=>el.lastElementChild.style.height='1100px');
 await page.waitForTimeout(180);
 await expect(r).toHaveAttribute('data-focus','I');
 expect(await page.evaluate(()=>window.focusMutations)).toBe(0);
});
