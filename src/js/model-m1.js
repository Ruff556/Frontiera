/* M1 — geometrie dall’HTML fornito, canone 3 ottobre 2026.
 * Le funzioni arc/local/values/makePoints mantengono la geometria originale.
 * Coordinate illustrative: non dati, probabilità o scale confrontabili.
 * Modulo condiviso fra Eleventy (SVG statici) e browser (ridimensionamento).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else { root.FrontieraModels = root.FrontieraModels || {}; root.FrontieraModels.m1 = factory(); }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
"use strict";
const times = [0, .18, .43, .67, .94];
const panels = [
 {name: "1 · Relazione C/U", description: "C è il riferimento relativo, mentre il canone evolve. U rappresenta la divergenza Δᵤ: massimo in T3, zero in T4."},
 {name: "2A · Stato conoscitivo e controllo", description: "GC è un inviluppo sotto zero, massimo in T3 e chiuso in T4. KGᵤ ha minimo in T3. KLᵤ resta aperto sopra e sotto zero anche in T4."},
 {name: "2B · Copertura, collegamento, debito", description: "SC salta in T1 e chiude in T3. Iᵤ꜀ è binaria: zero nell’isolamento, uno prima e dopo. Dᵤ raggiunge il massimo in T3 e zero in T4 sulla propria baseline."}
];
const defs = [
 {id:"C",panel:0,symbol:"C",name:"Canone condiviso",description:"Riferimento relativo: il quadro condiviso continua a evolvere anche mentre la sua linea resta orizzontale.",dash:"3 4"},
 {id:"U",panel:0,symbol:"U / Δᵤ",name:"Divergenza attuale",description:"Divergenza fra la rappresentazione attuale di U e il canone attuale. Non è la quantità totale di conoscenza."},
 {id:"GC",panel:1,symbol:"GC",name:"Grado di controllo",description:"Inviluppo del controllo raggiunto sul quadro canonico rispetto allo standard operativo; non una probabilità.",band:true,dash:"7 4"},
 {id:"KG",panel:1,symbol:"KGᵤ",name:"Attualità globale",description:"Attualità della conoscenza globale di U rispetto al quadro corrente. Il patrimonio ricevuto non scompare."},
 {id:"KL",panel:1,symbol:"KLᵤ",name:"Conoscenza locale",description:"Possibili evoluzioni della conoscenza prodotta localmente da U. L’autonomia non si chiude in T4.",band:true,dash:"3 4"},
 {id:"SC",panel:2,symbol:"SC",name:"Copertura corrente",description:"Copertura sensoriale effettiva disponibile a C. Il ripristino del presente non ricrea le osservazioni perdute.",band:true,dash:"7 4"},
 {id:"I",panel:2,symbol:"Iᵤ꜀",name:"Collegamento",description:"Disponibilità binaria del collegamento per il contributo U→C. Riconnettersi non conclude la riconciliazione."},
 {id:"D",panel:2,symbol:"Dᵤ",name:"Debito straordinario",description:"Lavoro ancora pertinente e irrisolto attribuibile all’isolamento, addizionale rispetto alla baseline fisiologica."}
];
const phases = [
 "T0 · Condizione precedente: collegamento attivo e riferimenti operativi raggiunti.",
 "T1 · Inizio isolamento: Iᵤ꜀ passa a 0 e SC si apre; le altre evoluzioni iniziano dal riferimento.",
 "T2 · Isolamento in corso: nessuna soglia, nessun plateau, nessun nuovo evento.",
 "T3 · Riconnessione: collegamento e copertura ripristinati; riconciliazione ancora da compiere.",
 "T4 · Riconciliazione pertinente: Dᵤ = 0, GC allo standard; KLᵤ conserva autonomia."
];
const smooth=q=>q*q*(3-2*q);
function arc(t,kind) {
 if(t<=times[1]||t>=times[4])return 0;
 const rise=t<=times[3];
 let q=rise?(t-times[1])/(times[3]-times[1]):(times[4]-t)/(times[4]-times[3]);
 if(kind==='GC')return smooth(q)**1.27;
 if(kind==='KG')return smooth(q)**.92;
 if(kind==='D')return smooth(q)**(rise?1.1:1.42);
 return (1-Math.cos(Math.PI*q))/2;
}
function local(t) {const q=Math.max(0,(t-times[1])/(1-times[1]));return [1-Math.exp(-3.9*q),1-Math.exp(-3.05*q)];}
function values(id,t,p) {
 const z=p.zero;
 if(id==='C')return [z];
 if(id==='U')return [z-100*arc(t,'U')];
 if(id==='GC')return [z,z+57*arc(t,'GC')];
 if(id==='KG')return [z+83*arc(t,'KG')];
 if(id==='KL'){const [a,b]=local(t);return [z-88*a,z+99*b];}
 if(id==='SC')return [z,t<times[1]||t>=times[3]?z:z+27+59*((t-times[1])/(times[3]-times[1]))**.8];
 if(id==='I')return [t<times[1]||t>=times[3]?z:z+111];
 return [p.debt-71*arc(t,'D')];
}
function makePoints(d,p,edge) {
 let ts=Array.from({length:401},(_,i)=>i/400);
 if(d.id==='SC'||d.id==='I'){
  ts=ts.filter(t=>Math.abs(t-times[1])>.00001&&Math.abs(t-times[3])>.00001);
  ts.push(times[1]-1e-8,times[1],times[3]-1e-8,times[3]);
 }
 ts.push(...times);ts.sort((a,b)=>a-b);
 return ts.map(t=>[p.x(t),values(d.id,t,p)[edge]]);
}
function state(id,t) {
 const pre=t<times[1]-1e-7,first=Math.abs(t-times[1])<1e-7,reconn=Math.abs(t-times[3])<1e-7,end=t>=times[4]-1e-7,iso=t<times[3];
 if(id==='C')return 'Zero relativo · il canone continua a evolvere';
 if(id==='I')return (t<times[1]||t>=times[3]?'1 · disponibile':'0 · interrotto');
 if(id==='SC')return (pre||!iso?'Fascia chiusa · copertura ripristinata':first?'Fascia aperta · salto del bordo inferiore':'Fascia aperta · deficit possibile crescente');
 if(id==='KL')return pre||first?'Fascia chiusa sul riferimento':'Fascia aperta sopra e sotto zero';
 if(id==='GC')return pre||first||end?'Fascia chiusa · standard operativo':reconn?'Massima apertura · controllo da ristabilire':iso?'Fascia in apertura · bordo superiore a zero':'Fascia in chiusura verso lo standard';
 if(id==='KG')return pre||first||end?'Riferimento relativo di attualità':reconn?'Minimo di attualità':iso?'Attualità in diminuzione':'Recupero progressivo di attualità';
 if(id==='D')return pre||first||end?'0 · nessun debito straordinario pertinente':reconn?'Massimo · lavoro pertinente ancora irrisolto':iso?'Debito straordinario crescente':'Debito straordinario in riduzione';
 return pre||first||end?'0 · coerenza sintetica':reconn?'Massimo di divergenza':iso?'Divergenza crescente':'Riconvergenza progressiva';
}

const escape = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
function render(panel, width=560, height=150, event=3) {
 const originalHeight=[210,287,327][panel];
 const left=49, right=width-13, top=12, bottom=height-23;
 const p={zero:[143,137,48][panel],debt:260,x:t=>left+t*(right-left)};
 const y = v => top+(v-26)/(originalHeight-51-26)*(bottom-top);
 const line=(x1,y1,x2,y2,cls="mr-axis")=>`<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
 const label=(x,y,text,anchor="end")=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${escape(text)}</text>`;
 const path=pts=>pts.map((v,i)=>(i?"L":"M")+v[0].toFixed(2)+","+y(v[1]).toFixed(2)).join(" ");
 let out=`<title>${escape(panels[panel].name)}</title><desc>${escape(panels[panel].description)} Fasce di possibilità, non probabilità. Ampiezze non confrontabili.</desc>`;
 times.forEach((t,i)=> {out+=line(p.x(t),top,p.x(t),bottom)+label(p.x(t),height-5,"T"+i,"middle");});
 out+=line(left,y(p.zero),right,y(p.zero));
 if(panel===2) {
  out+=line(left,y(p.debt),right,y(p.debt));
  out+=label(left-7,y(p.zero)-8,"SC 0")+label(left-7,y(p.zero)+3,"Iᵤ꜀ 1")+label(left-7,y(p.zero+111)+4,"Iᵤ꜀ 0")+label(left-7,y(p.debt)+4,"Dᵤ 0");
 } else {
  out+=label(left-7,y(p.zero)+4,"0");
  if(panel===1) out+=label(left-7,y(p.zero-76),"+")+label(left-7,y(p.zero+87),"−");
 }
 const series=defs.filter(d=>d.panel===panel);
 const bands=[...series].sort((a,b)=>(a.id==="KL"?-1:0)-(b.id==="KL"?-1:0));
 bands.filter(d=>d.band).forEach(d=> {
  out+=`<path data-series="${d.id}" class="mr-band" d="${path([...makePoints(d,p,0),...makePoints(d,p,1).reverse()])}Z"/>`;
 });
 series.forEach(d=> {
  for(let edge=0;edge<(d.band?2:1);edge++) out+=`<path data-series="${d.id}" class="mr-curve" ${d.dash?`stroke-dasharray="${d.dash}"`:""} d="${path(makePoints(d,p,edge))}"/>`;
 });
 // SC's dashed upper edge must remain visible over the high level of I.
 if(panel===2) out+=`<path data-series="SC" class="mr-curve" stroke-dasharray="7 4" d="${path(makePoints(defs.find(d=>d.id==="SC"),p,0))}"/>`;
 out+=line(p.x(times[event]),top,p.x(times[event]),bottom,"mr-guide");
 return out;
}
return {times,panels,defs,phases,arc,local,values,makePoints,state,render};
});
