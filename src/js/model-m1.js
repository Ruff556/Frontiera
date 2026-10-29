/* M1 — geometrie concettuali, revisione Df del 29 ottobre 2026.
 * SC e GC: salto alla criticità in T1, plateau fino a T3, chiusura in T3/T4.
 * Df: due scenari espliciti sullo zero mediano condiviso visivamente con SC/GC.
 * Panel 1 e 2A mantengono la geometria originale.
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
 {name: "2A · Dinamiche singolari", description: "Iᵤ꜀ è binaria: zero nell’isolamento, uno prima e dopo. KGᵤ ha minimo in T3. KLᵤ resta aperto sopra e sotto zero anche in T4. Riferimenti distinti anche quando coincidono graficamente."},
 {name: "2B · Dinamiche aggregate", description: "SC, GC e Df condividono la posizione mediana dello zero operativo, con significati e scale distinti. SC e GC hanno il bordo superiore sullo zero; il limite inferiore salta alla criticità in T1 e resta orizzontale fino a T3. SC chiude in T3; GC recupera fino a T4. Criticità: insufficienza rispetto alle esigenze di C, non assenza completa di osservazioni. Df mostra due scenari qualitativi: A, riduzione limitata (tratteggio); B, riduzione pronunciata e possibile picco dopo T3 (linea continua). Si incrociano e tornano al riferimento fisiologico in T4; non delimitano un inviluppo né esauriscono le possibilità. Sotto zero significa carico inferiore al riferimento, non debito assoluto negativo. Df non misura la qualità conoscitiva e non si ricava da SC o GC."}
];
const defs = [
 {id:"C",panel:0,symbol:"C",name:"Canone condiviso",description:"Riferimento relativo: il quadro condiviso continua a evolvere anche mentre la sua linea resta orizzontale.",dash:"3 4"},
 {id:"U",panel:0,symbol:"U / Δᵤ",name:"Divergenza attuale",description:"Divergenza fra la rappresentazione attuale di U e il canone attuale. Non è la quantità totale di conoscenza."},
 {id:"I",panel:1,symbol:"Iᵤ꜀",name:"Collegamento",description:"Disponibilità binaria del collegamento per il contributo U→C. Riconnettersi non conclude la riconciliazione."},
 {id:"KG",panel:1,symbol:"KGᵤ",name:"Attualità globale",description:"Attualità della conoscenza globale di U rispetto al quadro corrente. Il patrimonio ricevuto non scompare."},
 {id:"KL",panel:1,symbol:"KLᵤ",name:"Conoscenza locale",description:"Possibili evoluzioni della conoscenza prodotta localmente da U. L’autonomia non si chiude in T4.",band:true,dash:"3 4"},
 {id:"SC",panel:2,symbol:"SC",name:"Copertura corrente",description:"Copertura sensoriale effettiva disponibile a C. Il ripristino del presente non ricrea le osservazioni perdute.",band:true,dash:"7 4"},
 {id:"GC",panel:2,symbol:"GC",name:"Grado di controllo",description:"Inviluppo del controllo raggiunto sul quadro canonico rispetto allo standard operativo; non una probabilità.",band:true,dash:"7 4"},
 {id:"DF",panel:2,symbol:"Df",name:"Debito funzionale",description:"Lavoro informativo acquisito da C, in attesa o in corso di trattamento. Scostamento d_f(t) = D_f(t) − D_rif: sotto zero il carico è inferiore al riferimento fisiologico, non negativo in assoluto. A (tratteggio): lieve riduzione; B (continua): forte riduzione e possibile picco. Scenari, non limiti fissi né misure della qualità conoscitiva.",scenarios:["A","B"]}
];
const phases = [
 "T0 · Condizione precedente: collegamento attivo e riferimenti operativi raggiunti.",
 "T1 · Inizio isolamento: Iᵤ꜀ passa a 0; SC e GC possono raggiungere subito la criticità operativa.",
 "T2 · Isolamento in corso: limiti inferiori SC/GC orizzontali; nessuna nuova soglia o evento.",
 "T3 · Riconnessione: collegamento e copertura ripristinati; riconciliazione ancora da compiere.",
 "T4 · Riconciliazione pertinente: Df al riferimento fisiologico, GC allo standard; KLᵤ conserva autonomia."
];
const smooth=q=>q*q*(3-2*q);
function arc(t,kind) {
 if(t<=times[1]||t>=times[4])return 0;
 const rise=t<=times[3];
 let q=rise?(t-times[1])/(times[3]-times[1]):(times[4]-t)/(times[4]-times[3]);
 if(kind==='GC')return smooth(q)**1.27;
 if(kind==='KG')return smooth(q)**.92;
 return (1-Math.cos(Math.PI*q))/2;
}
function local(t) {const q=Math.max(0,(t-times[1])/(1-times[1]));return [1-Math.exp(-3.9*q),1-Math.exp(-3.05*q)];}
// SVG ordinates increase downwards. These offsets illustrate d_f, not D_f.
// No SC/GC input: the examples do not encode a causal or quantitative coupling.
function functionalDebt(t) {
 const [,t1,t2,t3,t4]=times;
 if(t<=t1||t>=t4)return [0,0];
 if(t<=t3){const q=smooth(Math.min(1,(t-t1)/(t2-t1)));return [24*q,108*q];}
 const q=(t-t3)/(t4-t3), peak=.6;
 return [24*(1-smooth(q)),q<=peak?108-196*smooth(q/peak):-88*(1-smooth((q-peak)/(1-peak)))];
}
function values(id,t,p) {
 const z=p.zero;
 if(id==='C')return [z];
 if(id==='U')return [z-100*arc(t,'U')];
 if(id==='GC')return [z,t<times[1]?z:t<=times[3]?z+57:z+57*arc(t,'GC')];
 if(id==='KG')return [z+83*arc(t,'KG')];
 if(id==='KL'){const [a,b]=local(t);return [z-88*a,z+99*b];}
 if(id==='SC')return [z,t<times[1]||t>=times[3]?z:z+86];
 if(id==='I')return [t<times[1]||t>=times[3]?z:z+111];
 if(id==='DF')return functionalDebt(t).map(offset=>z+offset);
 throw new Error(`Unknown M1 variable: ${id}`);
}
function makePoints(d,p,edge) {
 let ts=Array.from({length:401},(_,i)=>i/400);
 if(d.id==='SC'||d.id==='GC'||d.id==='I'){
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
 if(id==='SC')return (pre||!iso?'Fascia chiusa · copertura ripristinata':first?'Fascia aperta · salto alla criticità possibile':'Fascia aperta · criticità possibile persistente');
 if(id==='KL')return pre||first?'Fascia chiusa sul riferimento':'Fascia aperta sopra e sotto zero';
 if(id==='GC')return pre||end?'Fascia chiusa · standard operativo':first?'Fascia aperta · salto alla criticità possibile':reconn?'Fascia aperta · inizio recupero del controllo':iso?'Fascia aperta · criticità possibile persistente':'Fascia in chiusura verso lo standard';
 if(id==='KG')return pre||first||end?'Riferimento relativo di attualità':reconn?'Minimo di attualità':iso?'Attualità in diminuzione':'Recupero progressivo di attualità';
 if(id==='DF')return pre||first||end?'Riferimento fisiologico · carico anche positivo in assoluto':reconn?'Carico ridotto · ripresa delle acquisizioni informative':iso?'A: lieve riduzione · B: carico molto ridotto, possibile sottoalimentazione':'A: ritorno al riferimento · B: possibile picco e riassestamento';
 return pre||first||end?'0 · coerenza sintetica':reconn?'Massimo di divergenza':iso?'Divergenza crescente':'Riconvergenza progressiva';
}

const escape = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
function render(panel, width=560, height=150, event=3) {
 const originalHeight=[210,310,327][panel];
 const left=49, right=width-13, top=12, bottom=height-23;
 const p={zero:[143,137,151][panel],x:t=>left+t*(right-left)};
 const y = v => top+(v-26)/(originalHeight-51-26)*(bottom-top);
 const line=(x1,y1,x2,y2,cls="mr-axis")=>`<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
 const label=(x,y,text,anchor="end")=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${escape(text)}</text>`;
 const path=pts=>pts.map((v,i)=>(i?"L":"M")+v[0].toFixed(2)+","+y(v[1]).toFixed(2)).join(" ");
 let out=`<title>${escape(panels[panel].name)}</title><desc>${escape(panels[panel].description)} Scenari e fasce di possibilità, non probabilità. Ampiezze non confrontabili.</desc>`;
 times.forEach((t,i)=> {out+=line(p.x(t),top,p.x(t),bottom)+label(p.x(t),height-5,"T"+i,"middle");});
 out+=line(left,y(p.zero),right,y(p.zero),panel===2?"mr-baseline":"mr-axis");
 if(panel===2) {
  out+=label(left-7,y(p.zero)+4,"0");
  out+=label(left+7,top+12,"Df: A ┄  B ━","start");
 } else {
  out+=label(left-7,y(p.zero)+4,"0");
  if(panel===1) out+=label(left-7,y(p.zero)-8,"Iᵤ꜀ 1")+label(left-7,y(p.zero+111)+4,"Iᵤ꜀ 0")+label(left-7,y(p.zero-76),"+")+label(left-7,y(p.zero+87),"−");
 }
 const series=defs.filter(d=>d.panel===panel);
 const bands=[...series].sort((a,b)=>(a.id==="KL"?-1:0)-(b.id==="KL"?-1:0));
 bands.filter(d=>d.band).forEach(d=> {
  out+=`<path data-series="${d.id}" class="mr-band" d="${path([...makePoints(d,p,0),...makePoints(d,p,1).reverse()])}Z"/>`;
 });
 series.forEach(d=> {
  // A solid SC upper edge remains visible through GC's dashes on their shared zero.
  for(let edge=0;edge<(d.scenarios?.length||(d.band?2:1));edge++) {
   const scenario=d.scenarios?.[edge];
   const dash=scenario==="A"?"4 3":d.dash&&!(d.id==="SC"&&edge===0)?d.dash:null;
   out+=`<path data-series="${d.id}" ${scenario?`data-scenario="${scenario}"`:""} class="mr-curve" ${dash?`stroke-dasharray="${dash}"`:""} d="${path(makePoints(d,p,edge))}">${scenario?`<title>Df · Scenario ${scenario}: ${scenario==="A"?"riduzione limitata":"riduzione pronunciata e possibile picco"}</title>`:""}</path>`;
  }
 });
 out+=line(p.x(times[event]),top,p.x(times[event]),bottom,"mr-guide");
 return out;
}
return {times,panels,defs,phases,arc,local,functionalDebt,values,makePoints,state,render};
});
