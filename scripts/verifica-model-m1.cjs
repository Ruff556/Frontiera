"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const model = require("../src/js/model-m1");
const p = {zero:0,x:t=>t};
const v = (id,t) => model.values(id,t,p);
const [t0,t1,t2,t3,t4] = model.times;
for (const t of [t0,t1,t2,t3,t4]) assert.deepEqual(v("C",t),[0]);
for (const id of ["U","KG"]) {
  const base=0;
  assert.ok(v(id,t1).every(y=>y===base));
  assert.ok(v(id,t4).every(y=>y===base));
  for(let i=1;i<=100;i++) {
    const a=t1+(t3-t1)*(i-1)/100,b=t1+(t3-t1)*i/100;
    assert.ok(Math.abs(v(id,b).at(-1)-base)>Math.abs(v(id,a).at(-1)-base), `${id}: crescita fino a T3`);
    const c=t3+(t4-t3)*(i-1)/100,d=t3+(t4-t3)*i/100;
    assert.ok(Math.abs(v(id,d).at(-1)-base)<Math.abs(v(id,c).at(-1)-base), `${id}: rientro dopo T3`);
  }
}
assert.ok(v("KG",t3)[0]>0, "Coordinate SVG negative epistemicamente: KG sotto la baseline");
assert.ok(v("KL",t4)[0]<0 && v("KL",t4)[1]>0);
// Illustrative extents, not numerical operational thresholds or comparable units.
for(const [id,extent] of [["SC",86],["GC",57]]) {
  assert.deepEqual(v(id,t1-1e-8),[0,0],`${id}: chiuso prima di T1`);
  for(let i=0;i<100;i++) {
    const t=t1+(t3-t1)*i/100;
    assert.deepEqual(v(id,t),[0,extent],`${id}: salto in T1 e plateau fino a T3`);
  }
  for(let i=0;i<=1000;i++) assert.equal(v(id,i/1000)[0],0,`${id}: bordo superiore sullo zero`);
  assert.match(model.state(id,t1),/salto/);
  assert.match(model.state(id,t2),/persistente/);
  for(let i=0;i<=100;i++) {
    const t=t3+(t4-t3)*i/100;
    if(id==="SC") assert.deepEqual(v(id,t),[0,0],"SC: chiusura in T3 e fino a T4");
    else if(i>0) assert.ok(v(id,t)[1]<v(id,t3+(t4-t3)*(i-1)/100)[1],"GC: recupero continuo T3–T4");
  }
  assert.deepEqual(v(id,t4),[0,0]);
  assert.deepEqual(v(id,1),[0,0]);
}
assert.deepEqual(v("GC",t3),[0,57]);
assert.ok(Math.abs(v("GC",t3+1e-8)[1]-v("GC",t3)[1])<1e-6,"GC: nessun salto in T3");
assert.ok(v("GC",t4-1e-8)[1]<1e-6,"GC: chiusura continua in T4");
assert.deepEqual([v("I",t1-1e-8)[0],v("I",t1)[0],v("I",t3-1e-8)[0],v("I",t3)[0]],[0,111,111,0]);
// DF returns two scenario ordinates, never the fixed edges of an envelope.
assert.deepEqual(model.defs.find(d=>d.id==="DF").scenarios,["A","B"]);
assert.ok(!model.defs.find(d=>d.id==="DF").band);
for(const t of [t0,t1,t4,1]) assert.deepEqual(v("DF",t),[0,0]);
for(let i=1;i<=100;i++) {
  const t=t1+(t3-t1)*i/100, [a,b]=v("DF",t);
  assert.ok(a>0 && b>a,"Df: entrambi sotto la baseline durante l’isolamento (ordinate SVG)");
}
assert.deepEqual(v("DF",t2),v("DF",t3),"Df: carichi stabili fra T2 e T3");
for(let i=1;i<=100;i++) {
  const a=t1+(t2-t1)*(i-1)/100,b=t1+(t2-t1)*i/100;
  for(const edge of [0,1]) assert.ok(v("DF",b)[edge]>v("DF",a)[edge],"Df: riduzione progressiva T1–T2");
  const c=t3+(t4-t3)*(i-1)/100,d=t3+(t4-t3)*i/100;
  assert.ok(v("DF",d)[0]<v("DF",c)[0],"Df A: recupero graduale T3–T4");
}
const post=Array.from({length:1001},(_,i)=>v("DF",t3+(t4-t3)*i/1000));
assert.ok(post.some(([a,b])=>b<0 && b<a),"Df B: possibile picco positivo e superamento di A dopo T3");
assert.ok(post.some(([a,b])=>b>a),"Df: identità degli scenari conservata prima dell’incrocio");
for(const t of [t1,t2,t3,t4]) for(const edge of [0,1]) {
  assert.ok(Math.abs(v("DF",t-1e-8)[edge]-v("DF",t+1e-8)[edge])<1e-4,"Df: continuità agli eventi");
}
for(const id of ["SC","GC","I"]) {
  const points=model.makePoints(model.defs.find(d=>d.id===id),p,id==="I"?0:1);
  for(const t of id==="GC"?[t1]:[t1,t3]) {
    const near=points.filter(pt=>Math.abs(pt[0]-t)<1e-7);
    assert.ok(near.length>=2 && Math.max(...near.map(pt=>pt[1]))-Math.min(...near.map(pt=>pt[1]))>20);
  }
}
// Compare against the supplied, immutable HTML, independently of our renderer.
const original=fs.readFileSync("docs/modelli/fonti-m1/Modello-M1-Ritorno-alla-coerenza.html","utf8")
  .replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
const equations=original.slice(original.indexOf("const smooth=q"),original.indexOf("function el(tag"));
const reference={};vm.runInNewContext(`const times=${JSON.stringify(model.times)};${equations};this.values=values;`,reference);
const unchanged=model.defs.filter(d=>!["SC","GC","DF"].includes(d.id));
for (const def of unchanged) for(let i=0;i<=1000;i++) {
  assert.deepEqual([...reference.values(def.id,i/1000,p)],v(def.id,i/1000), `Original geometry changed: ${def.id} ${i}`);
}
// La prosa di M1 viene ora revisionata editorialmente: il confronto con la
// prima stesura archiviata non è più un'invariante del modello.
// Proteggiamo invece il contratto strutturale del lettore interattivo.
const edited=fs.readFileSync("src/_includes/modelli/m1.md","utf8");
const segments=[...edited.matchAll(/^:::segment ([012])(?: ([A-Z]+))?$/gm)];
const actualOrder=segments.map(m=>m[2]?`${m[1]}:${m[2]}`:m[1]);
const expectedOrder=["0","0","0:C","0:U","0","1","1:I","1:KG","1:KL","2","2:SC","2:GC","2:DF","2"];
assert.deepEqual(actualOrder,expectedOrder,"Sequenza dei segmenti M1 alterata");
// La chiusura di KL rimane nel contesto della variabile, senza segmento neutro vuoto.
assert.doesNotMatch(edited,/\\<\/?span\b/,"Tag span M1 erroneamente escapati");
const panelVariables=[["C","U"],["I","KG","KL"],["SC","GC","DF"]];
assert.equal(new Set(model.defs.map(d=>d.id)).size,8,"Identificativi univoci");
for(const [panel,ids] of panelVariables.entries()) {
  assert.deepEqual(model.defs.filter(d=>d.panel===panel).map(d=>d.id),ids,"Appartenenza e ordine delle variabili");
  const svg=model.render(panel);
  assert.deepEqual([...new Set([...svg.matchAll(/data-series="([A-Z]+)"/g)].map(m=>m[1]))].sort(),[...ids].sort(),"Serie SVG del pannello");
}
const html=require("../src/_lib/modelli/content")(edited,model);
assert.deepEqual([...html.matchAll(/data-context-panel="([012])" data-context-variable="([A-Z]*)"/g)].map(m=>m[2]?`${m[1]}:${m[2]}`:m[1]),expectedOrder,"Contesti del rendering statico");
assert.deepEqual([...html.matchAll(/class="mr-variable mr-margin" data-focus="([A-Z]+)"/g)].map(m=>m[1]),panelVariables.flat(),"Celle marginali e focus");
for(let i=0;i<segments.length;i++) {
  const start=segments[i].index+segments[i][0].length;
  const end=segments[i+1]?.index??edited.length;
  // The canonical editorial revision ends with a neutral closing marker.
  if(i===segments.length-1 && !segments[i][2]) continue;
  assert.ok(edited.slice(start,end).trim(),`Segmento M1 vuoto: ${actualOrder[i]}`);
}
for(const {id} of model.defs) {
  assert.ok(edited.includes(`data-term="${id}"`),`Richiamo alla variabile M1 mancante: ${id}`);
}
for(const [,id] of edited.matchAll(/data-term="([^"]+)"/g)) {
  assert.ok(model.defs.some(d=>d.id===id),`Richiamo M1 sconosciuto: ${id}`);
}
const editorialEquations=edited.match(/<div class="mr-equation"[^>]*>[\s\S]*?<\/div>/g)||[];
assert.equal(editorialEquations.length,1,"Attesa una sola formula della divergenza");
assert.ok(editorialEquations[0].includes('<span data-term="U">Δ<sub>U</sub>(t)</span>'),"Richiamo a ΔU mancante");
assert.ok(editorialEquations[0].includes("d(R<sub>U</sub>(t), K<sub>C</sub>(t))"),"Formula della divergenza alterata");
const svg=model.render(2);
assert.equal((svg.match(/data-series="DF"/g)||[]).length,2,"Due tracciati per un unico focus DF");
assert.match(svg,/data-scenario="A"/);assert.match(svg,/data-scenario="B"/);
assert.doesNotMatch(svg,/<path[^>]*data-series="DF"[^>]*class="mr-band"/);
for(const source of [edited,svg,JSON.stringify(model.defs),JSON.stringify(model.phases),fs.readFileSync("src/css/model-reader.css","utf8")]) {
  assert.doesNotMatch(source,/Dᵤ|debito straordinario|data-(?:term|focus|series|context-variable)="D"|--mr-D\b|:::segment 2 D\b/i,"Nessun riferimento attivo alla vecchia variabile");
}
// Test rendered coordinates independently of the ordinate helpers, at both sizes.
for(const [width,height] of [[560,150],[280,72]]) {
  const rendered=model.render(2,width,height);
  const baseline=Number(rendered.match(/class="mr-baseline"[^>]*y1="([^"]+)"/)[1]);
  assert.equal(baseline,(12+height-23)/2,"Zero nella metà dell’area utile");
  for(const id of ["SC","GC","DF"]) {
    const paths=[...rendered.matchAll(new RegExp(`<path data-series="${id}"[^>]*class="mr-curve"[^>]*d="([^"]+)"`,"g"))];
    assert.equal(paths.length,2);
    for(const [,path] of paths) for(const [,x,y] of path.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)) {
      assert.ok(Number(x)>=49 && Number(x)<=width-13);
      assert.ok(Number(y)>=12 && Number(y)<=height-23,"Curve entro l’area utile");
      if(id!=="DF") assert.ok(Number(y)>=baseline-.01,"SC/GC sotto lo zero mediano");
    }
  }
}
console.log(`[model-m1] PASS: ${unchanged.length*1001} confronti geometrici storici, SC/GC sullo zero mediano, scenari Df e integrità strutturale del lettore.`);
