"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const model = require("../src/js/model-m1");
const p = {zero:0,debt:260,x:t=>t};
const v = (id,t) => model.values(id,t,p);
const [t0,t1,t2,t3,t4] = model.times;
for (const t of [t0,t1,t2,t3,t4]) assert.deepEqual(v("C",t),[0]);
for (const id of ["U","GC","KG","D"]) {
  const base=id==="D"?260:0;
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
assert.deepEqual(v("GC",t3),[0,57]);
assert.ok(v("KL",t4)[0]<0 && v("KL",t4)[1]>0);
assert.deepEqual(v("SC",t1),[0,27]);
assert.deepEqual(v("SC",t3),[0,0]);
assert.ok(v("SC",t3-1e-8)[1]>85.99);
assert.deepEqual([v("I",t1-1e-8)[0],v("I",t1)[0],v("I",t3-1e-8)[0],v("I",t3)[0]],[0,111,111,0]);
assert.ok(v("D",t3)[0]<260 && v("D",t4)[0]===260);
for(const id of ["SC","I"]) {
  const points=model.makePoints(model.defs.find(d=>d.id===id),p,id==="SC"?1:0);
  for(const t of [t1,t3]) {
    const near=points.filter(pt=>Math.abs(pt[0]-t)<1e-7);
    assert.ok(near.length>=2 && Math.max(...near.map(pt=>pt[1]))-Math.min(...near.map(pt=>pt[1]))>20);
  }
}
// Compare against the supplied, immutable HTML, independently of our renderer.
const original=fs.readFileSync("docs/modelli/fonti-m1/Modello-M1-Ritorno-alla-coerenza.html","utf8")
  .replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
const equations=original.slice(original.indexOf("const smooth=q"),original.indexOf("function el(tag"));
const reference={};vm.runInNewContext(`const times=${JSON.stringify(model.times)};${equations};this.values=values;`,reference);
for (const def of model.defs) for(let i=0;i<=1000;i++) {
  assert.deepEqual([...reference.values(def.id,i/1000,p)],v(def.id,i/1000), `Original geometry changed: ${def.id} ${i}`);
}
// La prosa di M1 viene ora revisionata editorialmente: il confronto con la
// prima stesura archiviata non è più un'invariante del modello.
// Proteggiamo invece il contratto strutturale del lettore interattivo.
const edited=fs.readFileSync("src/_includes/modelli/m1.md","utf8");
const segments=[...edited.matchAll(/^:::segment ([012])(?: ([A-Z]+))?$/gm)];
const actualOrder=segments.map(m=>m[2]?`${m[1]}:${m[2]}`:m[1]);
const expectedOrder=["0","0","0:C","0:U","0","1","1:GC","1:KG","1:KL","1","2","2:SC","2:I","2:D","2"];
assert.deepEqual(actualOrder,expectedOrder,"Sequenza dei segmenti M1 alterata");
for(let i=0;i<segments.length;i++) {
  const start=segments[i].index+segments[i][0].length;
  const end=segments[i+1]?.index??edited.length;
  assert.ok(edited.slice(start,end).trim(),`Segmento M1 vuoto: ${actualOrder[i]}`);
}
for(const {id} of model.defs) {
  assert.ok(edited.includes(`data-term="${id}"`),`Richiamo alla variabile M1 mancante: ${id}`);
}
const editorialEquations=edited.match(/<div class="mr-equation"[^>]*>[\s\S]*?<\/div>/g)||[];
assert.equal(editorialEquations.length,1,"Attesa una sola formula della divergenza");
assert.ok(editorialEquations[0].includes('<span data-term="U">Δ<sub>U</sub>(t)</span>'),"Richiamo a ΔU mancante");
assert.ok(editorialEquations[0].includes("d(R<sub>U</sub>(t), K<sub>C</sub>(t))"),"Formula della divergenza alterata");
console.log("[model-m1] PASS: 8008 confronti geometrici, vincoli canonici e integrità strutturale dell’editoriale.");
