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
  const compact=parseFloat(getComputedStyle(r).getPropertyValue('--mr-compact'));
  reading.scrollTop+=segment.getBoundingClientRect().top-reading.getBoundingClientRect().top-compact+12;
 },key);
}
test('nuova articolazione: segmenti, legende, serie SVG e focus desktop coerenti',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await ready(page);
 const r=page.locator(ROOT),groups=[['C','U'],['I','KG','KL'],['SC','GC','D']];
 expect(await r.locator('[data-context-panel]').evaluateAll(nodes=>nodes.map(n=>n.dataset.contextPanel+(n.dataset.contextVariable?':'+n.dataset.contextVariable:''))))
  .toEqual(['0','0','0:C','0:U','0','1','1:I','1:KG','1:KL','1','2','2:SC','2:GC','2:D','2']);
 for(const [panel,ids] of groups.entries()) {
  const chart=r.locator(`[data-model-panel="${panel}"]`);
  expect(await chart.locator('.mr-legend [data-focus]').evaluateAll(nodes=>nodes.map(n=>n.dataset.focus))).toEqual(ids);
  expect(await chart.locator('[data-series]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.series))].sort())).toEqual([...ids].sort());
  for(const id of ids) {
   const segment=r.locator(`[data-context-variable="${id}"]`);
   await expect(segment).toHaveAttribute('data-context-panel',String(panel));
   await scrollToVariable(page,id);await expect(r).toHaveAttribute('data-focus','');
   await segment.locator('.mr-margin').click();await expect(r).toHaveAttribute('data-focus',id);
   await expect(chart.locator(`[data-focus="${id}"]`)).toHaveAttribute('aria-pressed','true');
   const series=chart.locator(`[data-series="${id}"]`);
   for(const curve of await series.all()) await expect(curve).toHaveClass(/is-focused/);
   // GC's escaped span is a pre-existing editorial defect; preserve the source.
   const terms=r.locator(`[data-term="${id}"]`);
   expect(await terms.count()).toBeGreaterThanOrEqual(id==='GC'?0:1);
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
 const sequence=[['I','1'],['KG','1'],['KL','1'],['SC','2'],['GC','2'],['D','2']];
 for(const [id,panel] of [...sequence,...sequence.slice().reverse()]) {
  await scrollToVariable(page,id);await expect(r).toHaveAttribute('data-focus',id);await expect(r).toHaveAttribute('data-panel',panel);
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
test('desktop: focus esclusivo bidirezionale, neutro, niente scroll imposto',async({page})=>{
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
 await r.locator('.mr-legend [data-focus="D"]').click();
 await page.setViewportSize({width:390,height:844});await expect(r).toHaveAttribute('data-layout','mobile');await expect(r).toHaveAttribute('data-focus','D');
 await page.setViewportSize({width:1024,height:768});await expect(r).toHaveAttribute('data-layout','desktop');await expect(r).toHaveAttribute('data-focus','D');
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
 await expect(page.getByText('Perché T4: la coerenza di un presente diverso',{exact:true})).toBeVisible();
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
