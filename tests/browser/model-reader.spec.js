"use strict";
const {test,expect}=require("@playwright/test");
const fs=require("node:fs");
const URL="/anteprime/modelli/m1/";
const ROOT='[data-model-reader="m1"]';
const viewports=[[320,568,"mobile"],[390,844,"mobile"],[430,932,"mobile"],[768,1024,"mobile"],[1024,768,"desktop"],[1000,660,"mobile"],[1366,768,"desktop"],[1440,900,"desktop"],[1920,1080,"desktop"]];
async function ready(page) {
 await page.goto(URL);
 await expect(page.locator(ROOT)).toHaveAttribute("data-ready","true");
 await page.evaluate(()=>document.fonts.ready);
}
async function scrollToVariable(page,key) {
 await page.locator(ROOT).evaluate((r,key)=>{
  const reading=r.querySelector('.mr-reading'), segment=r.querySelector(`[data-context-variable="${key}"]`);
  const compact=r.dataset.layout==='mobile'?parseFloat(getComputedStyle(r).getPropertyValue('--mr-compact')):0;
  reading.scrollTop+=segment.getBoundingClientRect().top-reading.getBoundingClientRect().top-compact+12;
 },key);
}
test('nuova articolazione: segmenti, legende, serie SVG e focus desktop coerenti',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await ready(page);
 const r=page.locator(ROOT),groups=[['C','U'],['I','KG','KL'],['SC','GC','DF']];
 expect(await r.locator('[data-context-panel]').evaluateAll(nodes=>nodes.map(n=>n.dataset.contextPanel+(n.dataset.contextVariable?':'+n.dataset.contextVariable:''))))
  .toEqual(['0','0','0:C','0:U','0','1','1:I','1:KG','1:KL','2','2:SC','2:GC','2:DF','2']);
 // La chiusura editoriale appartiene ancora al contesto interattivo KL.
 await expect(r.locator('[data-context-variable="KL"]')).toContainText('Resta un’ultima conseguenza.');
 for(const [panel,ids] of groups.entries()) {
  const chart=r.locator(`[data-model-panel="${panel}"]`);
  expect(await chart.locator('.mr-legend [data-focus]').evaluateAll(nodes=>nodes.map(n=>n.dataset.focus))).toEqual(ids);
  expect(await chart.locator('[data-series]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.series))].sort())).toEqual([...ids].sort());
  for(const id of ids) {
   const segment=r.locator(`[data-context-variable="${id}"]`);
   await expect(segment).toHaveAttribute('data-context-panel',String(panel));
   if(await r.locator('[data-focus-sync]').isVisible()) await r.locator('[data-focus-sync]').click();
   await scrollToVariable(page,id);await expect(r).toHaveAttribute('data-focus',id);
   await expect(r).toHaveAttribute('data-sync','auto');
   await segment.locator('.mr-margin').click();await expect(r).toHaveAttribute('data-focus',id);
   await expect(chart.locator(`[data-focus="${id}"]`)).toHaveAttribute('aria-pressed','true');
   const series=chart.locator(`[data-series="${id}"]`);
   for(const curve of await series.all()) await expect(curve).toHaveClass(/is-focused/);
   // Tutti i richiami HTML devono partecipare al focus, incluso GC.
   const terms=r.locator(`[data-term="${id}"]`);
   expect(await terms.count()).toBeGreaterThanOrEqual(1);
   for(const term of await terms.all()) await expect(term).toHaveClass(/is-focused/);
   await expect(r.locator('[data-description-title]')).toContainText(await chart.locator(`[data-focus="${id}"]`).innerText());
   await chart.locator(`[data-focus="${id}"]`).click();await expect(r).toHaveAttribute('data-focus','');
   await expect(segment.locator('.mr-margin')).toHaveAttribute('aria-pressed','false');
  }
 }
 // Shared upper bounds remain distinguishable through solid SC and dashed GC.
 const upperSC=r.locator('[data-model-panel="2"] .mr-curve[data-series="SC"]').first();
 const upperGC=r.locator('[data-model-panel="2"] .mr-curve[data-series="GC"]').first();
 expect(await upperSC.getAttribute('d')).toBe(await upperGC.getAttribute('d'));
 expect(await upperSC.getAttribute('stroke-dasharray')).toBeNull();
 await expect(upperGC).toHaveAttribute('stroke-dasharray','7 4');
});
test('mobile: nuovo ordine singolare/aggregato reversibile allo scroll',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page);const r=page.locator(ROOT);
 const sequence=[['I','1'],['KG','1'],['KL','1'],['SC','2'],['GC','2'],['DF','2']];
 for(const [id,panel] of [...sequence,...sequence.slice().reverse()]) {
  await scrollToVariable(page,id);await expect(r).toHaveAttribute('data-focus',id);await expect(r).toHaveAttribute('data-panel',panel);
 }
});
for(const [width,height] of [[320,568],[390,844],[1366,768],[1440,900]]) test(`Panel 2B ${width}×${height}: scenari Df, zero mediano e focus comune`,async({page})=>{
 await page.setViewportSize({width,height});await ready(page);
 const r=page.locator(ROOT),panel=r.locator('[data-model-panel="2"]');
 if(await r.getAttribute('data-layout')==='mobile') {
  await r.locator('[data-resume]').click();
  await r.locator('.mr-reading').evaluate(el=>el.scrollTop+=200);
  await r.locator('[data-panel-step="1"]').click();
  await r.locator('[data-panel-step="1"]').click();
  await scrollToVariable(page,'DF');
  await expect(r).toHaveAttribute('data-overview','false');
  // ResizeObserver may need another frame after the compact layout settles.
  await expect.poll(()=>r.evaluate(r=>Math.abs(
   r.querySelector('[data-model-panel="2"]').getBoundingClientRect().top-
   r.querySelector('.mr-plots-window').getBoundingClientRect().top
  ))).toBeLessThan(.5);
  await page.waitForTimeout(200); // Capture the settled ResizeObserver layout.
 } else {
  await scrollToVariable(page,'DF');
  await expect(r).toHaveAttribute('data-focus','DF');
  await panel.locator('[data-focus="DF"]').click();
  await panel.locator('[data-focus="DF"]').click();
 }
 await expect(r).toHaveAttribute('data-focus','');
 await expect(panel).toBeInViewport();
 await expect(panel.locator('.mr-legend [data-focus="DF"]')).toHaveCount(1);
 const curves=panel.locator('.mr-curve[data-series="DF"]');
 await expect(curves).toHaveCount(2);
 await expect(curves.nth(0)).toHaveAttribute('data-scenario','A');
 await expect(curves.nth(0)).toHaveAttribute('stroke-dasharray','4 3');
 await expect(curves.nth(1)).toHaveAttribute('data-scenario','B');
 expect(await curves.nth(1).getAttribute('stroke-dasharray')).toBeNull();
 const fill=panel.locator('.mr-band[data-series="DF"]');
 await expect(fill).toHaveCount(1);
 expect(await panel.locator('svg text').allTextContents()).not.toEqual(expect.arrayContaining([expect.stringMatching(/Df:/)]));
 const fillChecks=await fill.evaluate(el=>{
  const svg=el.ownerSVGElement,model=window.FrontieraModels.m1;
  const left=49,right=svg.viewBox.baseVal.width-13,top=12,bottom=svg.viewBox.baseVal.height-23;
  const y=v=>top+(v-26)/250*(bottom-top);
  return [.3,.55,.74,.82,.88,.92].map(t=>{
   const [a,b]=model.values('DF',t,{zero:151});
   return el.isPointInFill(new DOMPoint(left+t*(right-left),y((a+b)/2)));
  });
 });
 expect(fillChecks).toEqual([true,true,true,true,true,true]);
 const fillStyle=await fill.evaluate(el=>{const style=getComputedStyle(el),other=getComputedStyle(el.parentNode.querySelector('.mr-band[data-series="SC"]'));return {fill:style.fill,opacity:style.fillOpacity,otherOpacity:other.fillOpacity,curve:getComputedStyle(el.parentNode.querySelector('.mr-curve[data-series="DF"]')).stroke};});
 expect(fillStyle.fill).toBe(fillStyle.curve);
 expect(fillStyle.opacity).toBe(fillStyle.otherOpacity);
 expect(await r.locator('[data-series].is-muted').count()).toBe(0);
 const geometry=await panel.locator('svg').evaluate(svg=>{
  const baseline=Number(svg.querySelector('.mr-baseline').getAttribute('y1'));
  return {baseline,height:svg.viewBox.baseVal.height,
   paths:[...svg.querySelectorAll('.mr-curve')].map(path=>{const {x,y,width,height}=path.getBBox();return {id:path.dataset.series,bounds:{x,y,width,height}};})};
 });
 expect(geometry.baseline).toBeCloseTo((12+geometry.height-23)/2,2);
 for(const {id,bounds} of geometry.paths) {
  expect(bounds.y).toBeGreaterThanOrEqual(11.99);
  expect(bounds.y+bounds.height).toBeLessThanOrEqual(geometry.height-22.99);
  if(id!=='DF') expect(bounds.y).toBeGreaterThanOrEqual(geometry.baseline-.01);
 }
 fs.mkdirSync('reports/modelli',{recursive:true});
 await page.screenshot({path:`reports/modelli/panel2b-${width}-neutro.png`});
 await panel.screenshot({path:`reports/modelli/panel2b-${width}-dettaglio.png`});
 await panel.locator('[data-focus="DF"]').click();
 await expect(r).toHaveAttribute('data-focus','DF');
 for(const curve of await panel.locator('[data-series="DF"]').all()) {
  await expect(curve).toHaveClass(/is-focused/);
  expect(await curve.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
 }
 await expect(r.locator('[data-term="DF"]')).toHaveClass(/is-focused/);
 if(await r.getAttribute('data-layout')==='desktop') {
  await expect(r.locator('[data-description-title]')).toHaveText('Df · Debito funzionale');
  await expect(r.locator('[data-description]')).toHaveText('Quantità di lavoro informativo acquisito da C e non ancora completato.');
 }
 await page.screenshot({path:`reports/modelli/panel2b-${width}-focus-df.png`});
 await panel.screenshot({path:`reports/modelli/panel2b-${width}-dettaglio-focus-df.png`});
 // A time change redraws all SVG nodes; both scenarios must retain focus.
 if(await r.getAttribute('data-layout')==='desktop') {
  await r.locator('[data-model-event="4"]').click();
  for(const curve of await panel.locator('[data-series="DF"]').all()) await expect(curve).toHaveClass(/is-focused/);
  await r.locator('.mr-margin[data-focus="DF"]').click();
  await expect(r).toHaveAttribute('data-focus','');
  expect(await r.locator('[data-series].is-muted').count()).toBe(0);
 }
});
for(const [width,height,layout] of viewports) test(`M1 ${width}×${height}: layout, geometrie visibili e assenza overflow`,async({page})=>{
 await page.setViewportSize({width,height});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await ready(page);await expect(page.locator(ROOT)).toHaveAttribute('data-layout',layout);
 const sizes=await page.locator(ROOT).evaluate(r=>({
  graph:r.querySelector('.mr-graph').getBoundingClientRect().toJSON(),
  charts:[...r.querySelectorAll('.mr-chart')].map(s=>s.getBoundingClientRect().toJSON()),
  overflow:document.documentElement.scrollWidth>innerWidth,
  X:Number(r.dataset.minimumHeight),Y:Number(r.dataset.reservedHeight),
 }));
 expect(sizes.overflow).toBe(false);expect(sizes.graph.bottom).toBeLessThanOrEqual(height);
 for(const chart of sizes.charts){expect(chart.height).toBeGreaterThan(48);expect(chart.bottom).toBeLessThan(sizes.graph.bottom);}
 if(layout==='desktop') expect(sizes.X+sizes.Y).toBeLessThanOrEqual(height);
 else {
  await expect(page.locator(`${ROOT} [data-resume]`)).toBeVisible();
  await expect(page.locator(`${ROOT} .mr-description`)).toBeHidden();
 }
 expect(errors).toEqual([]);
 fs.mkdirSync('reports/modelli',{recursive:true});await page.screenshot({path:`reports/modelli/${width}x${height}.png`});
});
test('desktop: override manuale esclusivo, neutro, niente scroll imposto',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await ready(page);
 const r=page.locator(ROOT),read=r.locator('.mr-reading');
 expect(await r.locator('[data-series].is-muted').count()).toBe(0);
 await r.locator('.mr-legend [data-focus="GC"]').click();
 await expect(r.locator('.mr-margin[data-focus="GC"]')).toHaveAttribute('aria-pressed','true');
 expect(await read.evaluate(e=>e.scrollTop)).toBe(0);
 await scrollToVariable(page,'GC');
 await expect(r).toHaveAttribute('data-focus','GC');
 const offset=await read.evaluate(e=>e.scrollTop);
 await r.locator('.mr-margin[data-focus="GC"]').click();
 await expect(r).toHaveAttribute('data-focus','');
 expect(await r.locator('[data-series].is-muted').count()).toBe(0);
 await r.locator('.mr-margin[data-focus="GC"]').click();
 expect(await read.evaluate(e=>e.scrollTop)).toBe(offset);
 await r.locator('.mr-legend [data-focus="U"]').click();
 await expect(r.locator('.mr-margin[data-focus="GC"]')).toHaveAttribute('aria-pressed','false');
 await expect(r.locator('.mr-margin[data-focus="U"]')).toHaveAttribute('aria-pressed','true');
 expect(await read.evaluate(e=>e.scrollTop)).toBe(offset);
 await read.evaluate(e=>e.scrollTop+=1800);
 await expect(r).toHaveAttribute('data-focus','U');
 await r.locator('.mr-legend [data-focus="U"]').click();
 await expect(r).toHaveAttribute('data-focus','');
});
test('mobile: contrazione continua, wheel nativa anche sopra il grafico',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page);
 const r=page.locator(ROOT),g=r.locator('.mr-graph');
 const initial=await g.boundingBox();
 const chart=await r.locator('.mr-chart').first().boundingBox();
 await page.mouse.move(chart.x+chart.width/2,chart.y+chart.height/2);await page.mouse.wheel(0,80);
 await expect.poll(()=>r.locator('.mr-reading').evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
 const middle=await g.boundingBox();expect(middle.height).toBeLessThan(initial.height);expect(middle.height).toBeGreaterThan(272);
 await r.locator('.mr-reading').evaluate(e=>e.scrollTop=600);
 await expect.poll(async()=>Math.round((await g.boundingBox()).height)).toBe(272);
 await r.locator('.mr-reading').evaluate(e=>e.scrollTop=0);
 await expect.poll(async()=>Math.round((await g.boundingBox()).height)).toBe(Math.round(initial.height));
});
test('mobile: focus contestuale, override, esplorazione libera ed espansione senza perdere testo',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page);
 const r=page.locator(ROOT),read=r.locator('.mr-reading');
 await scrollToVariable(page,'KG');await expect(r).toHaveAttribute('data-focus','KG');await expect(r).toHaveAttribute('data-panel','1');
 await r.locator('.mr-legend [data-focus="I"]').click();await expect(r).toHaveAttribute('data-focus','I');
 await read.evaluate(e=>e.scrollTop+=120);await expect(r).toHaveAttribute('data-focus','I');
 await r.locator('[data-focus-sync]').click();await expect(r).toHaveAttribute('data-focus','KG');
 const offset=await read.evaluate(e=>e.scrollTop);
 await r.locator('[data-panel-step="1"]').click();await expect(r).toHaveAttribute('data-sync','free');await expect(r).toHaveAttribute('data-panel','2');
 await read.evaluate(e=>e.scrollTop+=30);await expect(r).toHaveAttribute('data-panel','2');
 const before=await read.evaluate(e=>e.scrollTop);
 await r.locator('[data-expand]').click();await expect(r).toHaveAttribute('data-space','expanded');
 expect(await read.evaluate(e=>e.scrollTop)).toBe(before);
 await r.locator('[data-resume]').click();await expect(r).toHaveAttribute('data-space','reading');
 expect(await read.evaluate(e=>e.scrollTop)).toBe(before);await expect(r).toHaveAttribute('data-sync','free');
 await r.locator('[data-panel-sync]').click();await expect(r).toHaveAttribute('data-panel','1');
 expect(await read.evaluate(e=>e.scrollTop)).toBe(offset+30);
});
test('mobile: transizione fra pannelli proporzionale, reversibile e ferma a metà',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:390,height:844});await ready(page);
 const r=page.locator(ROOT);
 const target=await r.evaluate(r=>{
  const read=r.querySelector('.mr-reading'),segment=r.querySelector('[data-context-panel="1"]');
  return segment.getBoundingClientRect().top-read.getBoundingClientRect().top-parseFloat(getComputedStyle(r).getPropertyValue('--mr-compact'))-32;
 });
 const move=async y=>{await r.locator('.mr-reading').evaluate((e,y)=>e.scrollTop=y,y);await page.waitForTimeout(70);return r.locator('.mr-plots').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42);};
 const a=await move(target-50),mid=await move(target),b=await move(target+50);
 expect(a).toBeGreaterThan(mid);expect(mid).toBeGreaterThan(b);
 await page.waitForTimeout(120);expect(await r.locator('.mr-plots').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42)).toBe(b);
 expect(await move(target)).toBeCloseTo(mid,0);
 await page.screenshot({path:'reports/modelli/390-transition.png'});
});
test('resize, orientamento e testo ingrandito preservano focus e non oscillano',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await ready(page);const r=page.locator(ROOT);
 await r.locator('.mr-legend [data-focus="DF"]').click();
 await page.setViewportSize({width:390,height:844});await expect(r).toHaveAttribute('data-layout','mobile');await expect(r).toHaveAttribute('data-focus','DF');
 await page.setViewportSize({width:1024,height:768});await expect(r).toHaveAttribute('data-layout','desktop');await expect(r).toHaveAttribute('data-focus','DF');
 await page.addStyleTag({content:'html{font-size:24px!important}'});
 await page.setViewportSize({width:1025,height:768});await expect(r).toHaveAttribute('data-layout','mobile');
 await page.waitForTimeout(200);await expect(r).toHaveAttribute('data-layout','mobile');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('zoom 200%, barre browser variabili e movimento ridotto',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:683,height:384});await ready(page);const r=page.locator(ROOT);
 await expect(r).toHaveAttribute('data-layout','mobile');
 await expect(r).toHaveAttribute('data-constrained','true');
 for(const svg of await r.locator('.mr-chart').all()) expect((await svg.boundingBox()).height).toBeGreaterThan(48);
 await page.screenshot({path:'reports/modelli/zoom200.png'});
 await page.setViewportSize({width:390,height:744});await r.locator('[data-resume]').click();
 const offset=await r.locator('.mr-reading').evaluate(e=>e.scrollTop);
 await page.setViewportSize({width:390,height:844});await expect(r).toHaveAttribute('data-layout','mobile');
 expect(await r.locator('.mr-reading').evaluate(e=>e.scrollTop)).toBe(offset);
 await r.locator('[data-expand]').click();
 expect(await r.locator('.mr-graph').evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');
});
test('tastiera, controlli alternativi allo swipe e navigazione globale',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page);const r=page.locator(ROOT);
 await r.locator('[data-resume]').focus();await page.keyboard.press('Enter');
 await expect(r).toHaveAttribute('data-space','reading');
 await r.locator('[data-panel-step="1"]').focus();await page.keyboard.press('Enter');await expect(r).toHaveAttribute('data-panel','1');
 await r.locator('[data-panel-sync]').focus();await page.keyboard.press('Enter');await expect(r).toHaveAttribute('data-sync','auto');
 await page.locator('#burger').click();await expect(page.locator('#burger')).toHaveAttribute('aria-expanded','true');
 await page.keyboard.press('Escape');await expect(page.locator('#burger')).toHaveAttribute('aria-expanded','false');
});
test('senza JavaScript: testo completo, tre SVG e anteprima esclusa dagli indici',async({browser,request})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();await page.goto(`http://127.0.0.1:4173${URL}`);
 await expect(page.locator(`${ROOT} .mr-chart`)).toHaveCount(3);
 await expect(page.locator(`${ROOT} .mr-prose p`).last()).toBeVisible();
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, follow');
 expect(await (await request.get('/sitemap.xml')).text()).not.toContain(URL);
 expect(await (await request.get('/feed.xml')).text()).not.toContain(URL);
 expect(await (await request.get('/')).text()).not.toContain(URL);
 await context.close();
});
test('touch reale emulato: swipe nel selettore e scroll verticale sul grafico',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 const page=await context.newPage();await page.goto(`http://127.0.0.1:4173${URL}`);const r=page.locator(ROOT);
 await expect(r).toHaveAttribute('data-ready','true');await r.locator('[data-resume]').tap();
 const client=await context.newCDPSession(page);
 async function swipe(x1,y1,x2,y2){
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y:y1}]});
  for(let i=1;i<=8;i++) await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x1+(x2-x1)*i/8,y:y1+(y2-y1)*i/8}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 const selector=await r.locator('[data-panel-selector]').boundingBox();
 await swipe(selector.x+selector.width*.8,selector.y+20,selector.x+selector.width*.2,selector.y+20);
 await expect(r).toHaveAttribute('data-panel','1');await expect(r).toHaveAttribute('data-sync','free');
 const offset=await r.locator('.mr-reading').evaluate(e=>e.scrollTop);
 const chart=await r.locator('.mr-chart').nth(1).boundingBox();
 await swipe(chart.x+120,chart.y+100,chart.x+122,chart.y+15);
 await expect.poll(()=>r.locator('.mr-reading').evaluate(e=>e.scrollTop)).toBeGreaterThan(offset);
 await expect(r).toHaveAttribute('data-panel','1');
 await context.close();
});
test('espansione animata cambia la geometria, mai la posizione della prosa',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:390,height:844});await ready(page);
 const r=page.locator(ROOT);await scrollToVariable(page,'GC');await expect(r).toHaveAttribute('data-focus','GC');
 const before=await r.locator('.mr-reading').evaluate(e=>e.scrollTop);
 await r.locator('[data-expand]').click();await page.waitForTimeout(75);
 const middle=(await r.locator('.mr-graph').boundingBox()).height;
 expect(middle).toBeGreaterThan(272);expect(middle).toBeLessThan(672);
 await page.waitForTimeout(250);expect(await r.locator('.mr-reading').evaluate(e=>e.scrollTop)).toBe(before);
 await page.screenshot({path:'reports/modelli/390-expanded.png'});
 await r.locator('[data-resume]').click();await page.waitForTimeout(320);
 expect(await r.locator('.mr-reading').evaluate(e=>e.scrollTop)).toBe(before);
 await page.screenshot({path:'reports/modelli/390-focus.png'});
});

test('esplorazione dalla panoramica: la linguetta porta all’inizio del testo',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ready(page);
 const r=page.locator(ROOT);
 await r.locator('[data-panel-step="1"]').click();await expect(r).toHaveAttribute('data-space','overview');
 await r.locator('[data-resume]').click();await expect(r).toHaveAttribute('data-space','reading');
 await expect(r).toHaveAttribute('data-panel','1');await expect(r).toHaveAttribute('data-sync','free');
 await expect.poll(async()=>Math.round((await r.locator('.mr-graph').boundingBox()).height)).toBe(272);
 await expect(r.locator('.mr-prose p').first()).toBeVisible();
});

// The elastic strip is a presentation of the existing focus, never a second
// interaction state. Canonical definitions drive the labels and expectations.
async function elasticCells(r) {
 return r.locator('.mr-legend .mr-variable').evaluateAll(buttons=>buttons.map(b=>{
  const label=b.querySelector('.mr-variable-label'),rect=b.getBoundingClientRect();
  const range=document.createRange();range.selectNodeContents(label);
  return {id:b.dataset.focus,pressed:b.getAttribute('aria-pressed'),width:rect.width,height:rect.height,
   x:rect.x,right:rect.right,y:rect.y,label:label.textContent,opacity:getComputedStyle(label).opacity,
   display:getComputedStyle(label).display,lines:[...range.getClientRects()].map(r=>r.toJSON()),
   labelRect:label.getBoundingClientRect().toJSON(),symbol:b.querySelector('.mr-variable-symbol').getBoundingClientRect().toJSON()};
 }));
}
for(const [width,height] of [[320,568],[390,844],[430,932],[768,1024],[1000,660]]) {
 test(`celle elastiche ${width}×${height}: AUTO, manuale, neutro e nomi canonici`,async({page})=>{
  await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});await ready(page);
  const r=page.locator(ROOT),read=r.locator('.mr-reading');
  await expect(r).toHaveAttribute('data-layout','mobile');
  expect((await elasticCells(r)).every(c=>c.display==='none')).toBe(true);
  // Even a manual selection in the initial overview keeps all cells compact.
  await r.locator('.mr-legend [data-focus="KG"]').click();
  expect((await elasticCells(r)).every(c=>c.display==='none')).toBe(true);
  await r.locator('[data-panel-sync]').click();
  const defs=await page.evaluate(()=>window.FrontieraModels.m1.defs);
  for(const def of defs) {
   await scrollToVariable(page,def.id);
   await expect(r).toHaveAttribute('data-focus',def.id);
   await expect(r).toHaveAttribute('data-overview','false');
   // Marginal prose controls share .mr-variable but must keep their mobile
   // display:none; exposing them would reflow the article and move scrollTop.
   expect(await r.locator('.mr-margin').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).display==='none'))).toBe(true);
   const button=r.locator(`.mr-legend [data-focus="${def.id}"]`);
   await expect(button).toHaveAccessibleName(`${def.symbol} · ${def.name}`);
   await expect(button.locator('.mr-variable-label')).toHaveCSS('opacity','1');
   const cells=await elasticCells(r),active=cells.find(c=>c.id===def.id);
   expect(active.label).toBe(`${def.symbol} · ${def.name}`);
   expect(active.opacity).toBe('1');
   expect(cells.filter(c=>c.opacity==='1').map(c=>c.id)).toEqual([def.id]);
   const peers=cells.filter(c=>defs.find(d=>d.id===c.id).panel===def.panel);
   for(const cell of peers) {
    expect(cell.width).toBeGreaterThanOrEqual(44);expect(cell.height).toBeGreaterThanOrEqual(44);
    expect(cell.x).toBeGreaterThanOrEqual(0);expect(cell.right).toBeLessThanOrEqual(width);
    expect(cell.y).toBeCloseTo(active.y,1);
    if(cell.id!==def.id) {
     expect(active.width).toBeGreaterThan(cell.width);
     expect(cell.opacity).toBe('0');
     expect(cell.symbol.y+cell.symbol.height/2).toBeCloseTo(cell.y+cell.height/2,0);
    }
   }
   for(const line of active.lines) {
    expect(line.x).toBeGreaterThanOrEqual(active.labelRect.x-.5);
    expect(line.right).toBeLessThanOrEqual(active.labelRect.right+.5);
    expect(line.bottom).toBeLessThanOrEqual(active.y+active.height);
   }
   expect(new Set(active.lines.map(l=>Math.round(l.y))).size).toBeLessThanOrEqual(2);
   const before=await r.evaluate(r=>({scroll:r.querySelector('.mr-reading').scrollTop,
    chart:r.querySelector('.mr-chart').getBoundingClientRect().toJSON(),paper:r.querySelector('.mr-paper').getBoundingClientRect().toJSON()}));
   // Toggle with the keyboard and return to AUTO without changing the prose.
   await button.focus();await page.keyboard.press('Enter');
   await expect(r).toHaveAttribute('data-sync','focus');
   await button.press('Enter');await expect(r).toHaveAttribute('data-sync','auto');
   const after=await r.evaluate(r=>({scroll:r.querySelector('.mr-reading').scrollTop,
    chart:r.querySelector('.mr-chart').getBoundingClientRect().toJSON(),paper:r.querySelector('.mr-paper').getBoundingClientRect().toJSON()}));
   expect(after).toEqual(before);
  }
  await scrollToVariable(page,'KG');await expect(r).toHaveAttribute('data-focus','KG');
  await r.locator('.mr-legend [data-focus="I"]').click();
  await read.evaluate(e=>e.scrollTop+=25);await expect(r).toHaveAttribute('data-focus','I');
  await expect(r.locator('.mr-legend [data-focus="I"] .mr-variable-label')).toHaveCSS('opacity','1');
  expect((await elasticCells(r)).filter(c=>c.opacity==='1').map(c=>c.id)).toEqual(['I']);
  await r.locator('[data-panel-sync]').click();await expect(r).toHaveAttribute('data-focus','KG');
  if([320,390,430].includes(width)) {
   fs.mkdirSync('reports/modelli',{recursive:true});
   await page.screenshot({path:`reports/modelli/elastic-${width}-kg.png`});
   await r.locator('.mr-legend [data-focus="KL"]').click();
   await page.screenshot({path:`reports/modelli/elastic-${width}-kl.png`});
   await r.locator('[data-panel-sync]').click();
  }
  await r.locator('[data-panel-step="1"]').click();await expect(r).toHaveAttribute('data-focus','');
  expect((await elasticCells(r)).every(c=>c.opacity==='0')).toBe(true);
  await r.locator('[data-panel-sync]').click();await expect(r).toHaveAttribute('data-focus','KG');
  // A neutral prose segment collapses every label while staying in reading mode.
  await r.evaluate(r=>{const read=r.querySelector('.mr-reading'),segment=r.querySelector('[data-context-panel="2"][data-context-variable=""]');
   read.scrollTop+=segment.getBoundingClientRect().top-read.getBoundingClientRect().top-parseFloat(getComputedStyle(r).getPropertyValue('--mr-compact'))+12;});
  await expect(r).toHaveAttribute('data-focus','');
  expect((await elasticCells(r)).every(c=>c.opacity==='0')).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 });
}

test('celle elastiche: animazione continua, interrompibile e confinata alla fascia',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});await ready(page);
 const r=page.locator(ROOT);await scrollToVariable(page,'I');await expect(r).toHaveAttribute('data-focus','I');
 await page.waitForTimeout(350);
 // Sample actual rendered frames, including a mid-flight reversal and a third
 // destination. SVG mutations would expose redundant redraw/measurement loops.
 const result=await r.evaluate(async r=>{
  const panel=r.querySelector('[data-model-panel="1"]'),buttons=[...panel.querySelectorAll('.mr-variable')];
  const chart=panel.querySelector('.mr-chart'),read=r.querySelector('.mr-reading'),paper=r.querySelector('.mr-paper');
  const snapshot=()=>({widths:buttons.map(b=>b.getBoundingClientRect().width),xs:buttons.map(b=>b.getBoundingClientRect().x),
   chart:chart.getBoundingClientRect().toJSON(),graph:r.querySelector('.mr-graph').getBoundingClientRect().toJSON(),
   paper:paper.getBoundingClientRect().toJSON(),scroll:read.scrollTop,
   opacity:buttons.map(b=>getComputedStyle(b.querySelector('.mr-variable-label')).opacity)});
  let mutations=0;const observer=new MutationObserver(records=>mutations+=records.length);
  observer.observe(chart,{childList:true,subtree:true});
  const before=snapshot(),frames=[];buttons[1].click();let reversed=false,third=false,start=performance.now();
  await new Promise(resolve=>{function frame(now){const t=now-start;
   frames.push({...snapshot(),t});
   if(t>=90&&!reversed){buttons[0].click();reversed=true;}
   if(t>=150&&!third){buttons[2].click();third=true;}
   if(t<500)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
  observer.disconnect();return {before,frames,mutations};
 });
 expect(result.frames.length).toBeGreaterThan(10);expect(result.mutations).toBe(0);
 const first=result.frames.filter(f=>f.t<90);
 expect(first.some(f=>f.widths[1]>result.before.widths[1]+5)).toBe(true);
 expect(first.every(f=>Number(f.opacity[1])===0)).toBe(true);
 for(const frame of result.frames) {
  expect(frame.chart).toEqual(result.before.chart);expect(frame.graph).toEqual(result.before.graph);
  expect(frame.paper).toEqual(result.before.paper);expect(frame.scroll).toBe(result.before.scroll);
  expect(frame.widths.reduce((a,b)=>a+b,0)).toBeCloseTo(result.before.widths.reduce((a,b)=>a+b,0),0);
  for(let i=1;i<3;i++)expect(frame.xs[i]).toBeGreaterThanOrEqual(frame.xs[i-1]+frame.widths[i-1]);
 }
 expect(new Set(result.frames.map(f=>Math.round(f.widths[2]))).size).toBeGreaterThan(5);
 expect(result.frames.at(-1).widths[2]).toBeGreaterThan(result.frames.at(-1).widths[0]);
 expect(result.frames.at(-1).opacity).toEqual(['0','0','1']);
 await page.emulateMedia({reducedMotion:'reduce'});
 const reduced=await r.evaluate(r=>{const b=r.querySelector('.mr-legend [data-focus="KG"]');b.click();return {
  transition:getComputedStyle(b).transitionDuration,opacity:getComputedStyle(b.querySelector('.mr-variable-label')).opacity,
  animations:b.closest('.mr-legend').getAnimations({subtree:true}).length};});
 expect(reduced).toEqual({transition:'0s',opacity:'1',animations:0});
});

test('celle elastiche: desktop conserva simboli compatti e geometria',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await ready(page);const r=page.locator(ROOT);
 const before=(await elasticCells(r)).map(c=>({width:c.width,height:c.height}));
 for(const id of ['C','U','I','KG','KL','SC','GC','DF']) {
  await scrollToVariable(page,id);await expect(r).toHaveAttribute('data-focus',id);
  const cells=await elasticCells(r);expect(cells.every(c=>c.display==='none')).toBe(true);
  expect(cells.map(c=>({width:c.width,height:c.height}))).toEqual(before);
 }
});
