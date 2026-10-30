"use strict";
const {test,expect}=require('@playwright/test');
const ROOT='[data-model-reader="m1"]';
const phases=['Condizione precedente all’isolamento','Inizio interdizione dei collegamenti','Interdizione in corso','Ripristino dei collegamenti','Riconciliazione fra U e C'];
const definitions={
 C:'Quadro informativo aggregato assunto come riferimento comune.',
 U:'Scostamento fra la rappresentazione di U e il canone C.',
 I:'Disponibilità del collegamento informativo fra U e C.',
 KG:'Attualità delle informazioni sul quadro globale disponibili a U.',
 KL:'Conoscenza del settore operativo sviluppata direttamente da U.',
 SC:'Copertura osservativa effettiva del settore garantita dalle fonti accessibili a C.',
 GC:'Grado di verifica e controllo del quadro condiviso raggiunto da C.',
 DF:'Quantità di lavoro informativo acquisito da C e non ancora completato.'
};
async function open(page,width,height) {
 await page.setViewportSize({width,height});await page.goto('/anteprime/modelli/m1/');
 const r=page.locator(ROOT);await expect(r).toHaveAttribute('data-ready','true');await page.evaluate(()=>document.fonts.ready);return r;
}
async function contrast(locator,background) {
 return locator.evaluate((el,background)=>{
  const rgba=color=>{const values=color.match(/[\d.]+/g).map(Number);return [...values.slice(0,3),values[3]??1];};
  const luminance=color=>{
   const rgb=color.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
   return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  };
  // Focus backgrounds fade from transparent: measure the composited paper,
  // rather than treating a transparent RGB value as an opaque black surface.
  const layers=[];
  if(background) layers.push(rgba(background));
  else for(let node=el;node;node=node.parentElement) {
   const color=rgba(getComputedStyle(node).backgroundColor);layers.push(color);if(color[3]===1) break;
  }
  const backdrop=layers.reverse().reduce((base,color)=>base.map((v,i)=>color[i]*color[3]+v*(1-color[3])),[255,255,255]);
  const a=luminance(rgba(getComputedStyle(el).color)),b=luminance(backdrop);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 },background);
}
for(const [width,height] of [[1366,768],[1440,900]]) {
 test(`M1 ${width}×${height}: definizioni definitive, tooltip e fine naturale`,async({page})=>{
  const r=await open(page,width,height);await expect(r).toHaveAttribute('data-layout','desktop');
  for(const [i,phase] of phases.entries()) {
   const button=r.locator(`[data-model-event="${i}"]`);await expect(button).toHaveAttribute('title',phase);
   await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(r.locator('[data-phase]')).toHaveText(phase);
  }
  for(const [id,description] of Object.entries(definitions)) {
   await r.locator(`.mr-legend [data-focus="${id}"]`).click();
   await expect(r.locator('[data-description]')).toHaveText(description);
   await expect(r).toHaveAttribute('data-sync','focus');
  }
  await r.locator('.mr-legend [data-focus="SC"]').click();
  await expect(r.locator('[data-description-title]')).toHaveText('SC · Copertura sensoriale');
  await expect(r.locator('.mr-margin[data-focus="SC"]')).toContainText('Copertura sensoriale');
  await expect(r.locator('.mr-end')).toHaveCount(0);await expect(r.getByText('Fine del modello · M1',{exact:true})).toHaveCount(0);
  await r.locator('.mr-reading').evaluate(el=>el.scrollTop=el.scrollHeight);
  await expect(r.locator('.mr-prose p').last()).toBeInViewport();
  await expect(r.locator('.mr-prose p').last()).toContainText('il sistema torna al proprio regime operativo ordinario.');
 });
 test(`M1 ${width}×${height}: carta editoriale, contrasti e grafici scuri`,async({page})=>{
  const r=await open(page,width,height),paper=r.locator('.mr-paper'),info=r.locator('.mr-description');
  const styles=await r.evaluate(r=>{
   const style=selector=>getComputedStyle(r.querySelector(selector));
   return {paper:style('.mr-paper').backgroundColor,text:style('.mr-paper').color,strong:style('.mr-paper strong').color,
    heading:style('.mr-paper h2').color,info:style('.mr-description').backgroundColor,infoText:style('.mr-description p').color,
    infoTitle:style('.mr-description strong').color,infoHeight:style('.mr-description').height,overflow:style('.mr-description').overflow,
    graph:style('.mr-graph').backgroundImage,curve:style('[data-series="DF"].mr-curve').stroke};
  });
  expect(styles).toMatchObject({paper:'rgb(244, 246, 244)',text:'rgb(26, 39, 48)',strong:'rgb(15, 26, 34)',heading:'rgb(15, 26, 34)',info:'rgb(244, 246, 244)',infoText:'rgb(26, 39, 48)',infoTitle:'rgb(28, 110, 140)',overflow:'auto',curve:'rgb(220, 164, 189)'});
  expect(parseFloat(styles.infoHeight)).toBeCloseTo(70.4,0);expect(styles.graph).toContain('23, 44, 57');
  expect(await contrast(paper)).toBeGreaterThan(4.5);expect(await contrast(info.locator('p'),styles.info)).toBeGreaterThan(4.5);
  expect(await contrast(info.locator('strong'),styles.info)).toBeGreaterThan(4.5);
  // Exercise every variable color on the new paper surface, including pale C.
  for(const id of Object.keys(definitions)) {
   await r.locator(`.mr-legend [data-focus="${id}"]`).click();
   const margin=r.locator(`.mr-margin[data-focus="${id}"]`),term=r.locator(`[data-term="${id}"]`).first();
   await expect(term).toHaveClass(/is-focused/);
   expect(await contrast(term)).toBeGreaterThan(4.5);expect(await contrast(margin)).toBeGreaterThan(4.5);
  }
  // Use an isolated DOM sample to check the shared editorial link style.
  await paper.evaluate(el=>{const a=document.createElement('a');a.href='#';a.textContent='Collegamento editoriale';a.dataset.editorialSample='';el.append(a);});
  const link=paper.locator('[data-editorial-sample]');expect(await link.evaluate(el=>getComputedStyle(el).color)).toBe('rgb(28, 110, 140)');
  expect(await contrast(link,styles.paper)).toBeGreaterThan(4.5);
  await link.evaluate(el=>el.remove());
  const read=r.locator('.mr-reading');await read.evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:`reports/modelli/editorial-paper-${width}.png`});
 });
}
test('M1 mobile: superficie blu e interazioni conservate, senza dicitura finale',async({page})=>{
 const r=await open(page,390,844);await expect(r).toHaveAttribute('data-layout','mobile');
 expect(await r.locator('.mr-paper').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 expect(await r.locator('.mr-reading-frame').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(17, 31, 43)');
 expect(await r.locator('.mr-paper strong').first().evaluate(el=>getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
 await expect(r.locator('.mr-description')).toBeHidden();await expect(r.locator('.mr-end')).toHaveCount(0);
 await r.locator('[data-resume]').click();await r.locator('[data-panel-step="1"]').click();await r.locator('[data-panel-step="1"]').click();
 await r.locator('.mr-legend [data-focus="DF"]').click();await expect(r.locator('[data-series="DF"].is-focused')).toHaveCount(3);
 const offset=await r.locator('.mr-reading').evaluate(el=>el.scrollTop);
 await r.locator('[data-expand]').click();await expect(r).toHaveAttribute('data-space','expanded');
 const resume=r.locator('[data-resume]');await expect(resume).toContainText('Riprendi la lettura');
 expect(await resume.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(244, 246, 244)');
 expect(await resume.evaluate(el=>getComputedStyle(el).color)).toBe('rgb(28, 110, 140)');
 expect(await contrast(resume)).toBeGreaterThan(4.5);
 const tab=await resume.boundingBox();expect(tab.height).toBeGreaterThanOrEqual(44);expect(tab.y+tab.height).toBeCloseTo(844,0);
 expect(await r.locator('.mr-reading').evaluate(el=>el.scrollTop)).toBe(offset);
 await page.screenshot({path:'reports/modelli/editorial-paper-mobile.png'});
 await resume.click();await expect(r).toHaveAttribute('data-space','reading');
 expect(await r.locator('.mr-reading').evaluate(el=>el.scrollTop)).toBe(offset);
});
