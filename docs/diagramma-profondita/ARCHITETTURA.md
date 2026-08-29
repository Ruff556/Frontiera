# Il filo della profondità — architettura del diagramma (schede P)

Documentazione tecnica interna alla build v3.8. **Non pubblicata dal sito**: la
cartella `docs/**` è esclusa in `.eleventy.js` (`eleventyConfig.ignores`).

Il **diagramma funzionale della profondità** è il componente seriale della linea
P: occupa, nella testata di ogni scheda P, lo slot che nelle schede F ospita la
cartina. È l'equivalente infrastrutturale della cartina, non una sua variante:
non condivide dati, motore, CSS né vocabolario, e non dipende in alcun modo da
`cartina`, `cartinaLuoghi`, `cartinaLinee`, GeoJSON o conversioni
coordinate/pixel.

Vedi anche [`CONTRATTO-DATI.md`](CONTRATTO-DATI.md) (che cosa scrive l'autore) e
[`VALIDAZIONE.md`](VALIDAZIONE.md) (che cosa fa fallire la build).

---

## 1. Che cosa rappresenta

Il diagramma **non è una cartina semplificata** e non rappresenta controllo
territoriale. Mostra come una fase distribuisce **capacità di accesso, qualità
dell'accesso, vulnerabilità funzionali e conversione del colpo in mutamento**
lungo la profondità del conflitto.

Tre distinzioni sono strutturali e non vanno fuse:

| | |
|---|---|
| **distanza dal contatto** | le quattro fasce, spaziali e normalizzate |
| **funzione del bersaglio** | i nodi funzionali (tassonomia condivisa) |
| **qualità dell'accesso** | i quattro stati, propri della singola corsia |

Le fasce sono soltanto spaziali: la natura tattica, operativa o strategica
appartiene alle funzioni colpite e agli effetti prodotti, mai a una soglia
chilometrica. Per questo nessuna fascia si chiama «tattica», «operativa» o
«strategica» — e lo script di verifica lo controlla.

La capacità effettiva di accesso **non coincide con la gittata nominale**:
esprime la combinazione concreta di vettore, disponibilità, integrazione,
intelligence, libertà d'impiego, protezione avversaria e possibilità di
reiterazione. La nota metodologica, generata automaticamente, lo dichiara in ogni
scheda.

---

## 2. I quattro strati

Lo stesso metodo della cartina di fase: dati dichiarativi, logica separata,
rendering privo di calcolo, validazione che fa fallire la build.

| Strato | File | Responsabilità |
|---|---|---|
| **Dati di fase** | `contenuti/profondita/*.md` (front matter `diagrammaProfondita`) | soltanto chiavi e testi editoriali della singola fase |
| **Vocabolario** | [`src/_data/profonditaVocabolario.js`](../../src/_data/profonditaVocabolario.js) | ordini, etichette pubbliche, tassonomie, simboli, limiti, testi fissi |
| **Motore** | [`src/_lib/diagramma-profondita.js`](../../src/_lib/diagramma-profondita.js) | validazione, normalizzazione, derivazioni, riepilogo accessibile |
| **Renderer** | [`src/_includes/partials/diagramma-profondita.njk`](../../src/_includes/partials/diagramma-profondita.njk) | HTML semantico; nessun calcolo, nessun dato di fase |

Più due risorse di supporto:

- **Icone**: [`src/immagini/profondita/icone-profondita.svg`](../../src/immagini/profondita/icone-profondita.svg) — sprite locale, un `<symbol>` per tipo di nodo;
- **CSS**: `src/css/frontiera.css`, sezione **14.1**, namespace `.depth-*`.

La regola che tiene insieme il sistema: **un dato compare una volta sola**. Se un
valore riguarda la fase sta nel Markdown; se riguarda il linguaggio del
componente sta nel vocabolario; se riguarda la resa sta nel CSS. Nessuno dei tre
conosce gli altri due.

---

## 3. Vocabolario condiviso

`src/_data/profonditaVocabolario.js` è registrato in `src/_data/`, quindi è anche
un dato globale Eleventy, ed è richiesto direttamente dal motore e dallo script
di verifica. È la fonte canonica di:

- **fasce** — `contatto`, `prossima`, `intermedia`, `profonda`: ordine di lettura,
  etichetta pubblica, distanza orientativa (testo, mai una scala). Le quattro
  colonne hanno **uguale larghezza semantica**, non proporzionale ai chilometri:
  l'ultima fascia è aperta e una scala proporzionale produrrebbe una falsa
  precisione. È un principio dell'architettura, non un testo pubblico;
- **stati** — `reiterabile`, `limitato`, `episodico`, `non-accessibile`: etichetta
  pubblica, etichetta breve del badge, significato per la legenda, flag
  `accessibile` (governa la segmentazione del vettore), grammatica del tratto;
- **attori** — `ucraina`, `russia`: nome, profondità bersaglio, denominazione
  pubblica del destinatario;
- **nodi** — quattordici tipi, ciascuno con etichetta italiana predefinita e
  `simbolo` dello sprite;
- **limiti di leggibilità** — massimo quattro nodi per attore (il budget
  editoriale) e quattro per fascia: l'intero budget può concentrarsi su un solo
  strato di profondità senza che la figura diventi più densa;
- **testi infrastrutturali** — kicker `Profondità contesa`, separatore della
  testata, intestazioni, watermark e la **nota metodologica**, che è una sola
  frase e vive solo qui: cambiarla è un'operazione di vocabolario, mai di
  front matter (la verifica post-build confronta l'HTML reso con questa fonte);
- **mesi italiani** per la data dell'assetto.

Non esiste lo stato «protetto»: protezione e accessibilità non sono alternative,
un bersaglio può essere protetto e tuttavia accessibile.

---

## 4. Motore

Espone funzioni piccole e verificabili:

```js
validateDiagrammaProfondita(config, { file })   // vero, oppure Error parlante
normalizeDiagrammaProfondita(config, { id, file }) // modello di rendering
diagrammaProfonditaAria(modello)                // riepilogo testuale
segmentaVettore(["reiterabile", …])             // segmentazione pura
```

Il modello normalizzato **deriva automaticamente**: ordine delle corsie e delle
fasce, etichette pubbliche, classi semantiche degli stati, segmentazione e punto
di arresto dei vettori, discontinuità nei profili non monotoni, legenda limitata
agli stati realmente presenti, etichetta predefinita e simbolo di ciascun nodo,
data italiana dell'assetto, riepilogo accessibile, nota metodologica.

Il contratto è volutamente stretto: la fascia dichiara **solo** il proprio
stato, e le chiavi ritirate (`nota`, `mutamento`, `soglia`) non sono ignorate ma
rifiutate, così un front matter rimasto indietro fallisce invece di perdere dati
in silenzio.

### Segmentazione del vettore

Il vettore non è mai una freccia unica che attraversa tutte le fasce: sarebbe
falso nei profili non monotoni. Da ciascuna corsia si ricavano quattro voci con
soli flag booleani — nessuna lunghezza, nessuna coordinata:

| flag | significato | resa |
|---|---|---|
| `presente` | la fascia è accessibile | il tratto esiste |
| `continua` | anche la fascia successiva è accessibile | il tratto scavalca lo stacco della griglia |
| `punta` | il tratto finisce qui | punta di freccia |
| `autonomo` | l'accesso riappare dopo una discontinuità | segno d'origine, tratto separato |

Esempio (corsia ucraina di P2): `reiterabile · reiterabile · non-accessibile ·
episodico` produce un tratto continuo con punta al termine della fascia prossima,
**nessun** tratto nella fascia intermedia e un segmento episodico **autonomo**
nella fascia profonda.

### Sprite incorporato

Il motore incorpora lo sprite una sola volta per pagina. Un `<use>` verso un file
SVG esterno non eredita il colore del documento ospite: le icone risulterebbero
nere e illeggibili sul vetro scuro. Incorporandolo, `currentColor` risolve nel
colore della corsia. Lo sprite resta comunque un file autonomo del repository,
copiato dal passthrough di `src/immagini`.

---

## 5. Renderer

`partials/diagramma-profondita.njk` espone la macro
`diagrammaProfonditaFigura(config, idScheda, sorgente)`. Riceve la
configurazione, l'identificatore della scheda (lo `slug`, che genera gli id
univoci `depth-<slug>-titolo` e `depth-<slug>-descrizione`) e il percorso del
sorgente, usato nei messaggi d'errore.

Struttura resa, nell'ordine:

1. testata del componente: a sinistra un solo gruppo, `Profondità contesa · <data
   in italiano>`; a destra il watermark `Frontiera` (`aria-hidden`). Entrambi
   sono elementi di flusso della stessa riga flessibile — nessun posizionamento
   assoluto — e la data non compare in nessun altro punto della figura;
2. riepilogo accessibile (`.depth-a11y`, bersaglio di `aria-describedby`);
3. area grafica: testate colonnari delle quattro fasce, poi le due corsie
   (ciascuna: identità dell'attore + complesso, quattro fasce, limite dominante);
4. legenda dei soli stati presenti;
5. nota metodologica (`<figcaption>`), unica sezione dopo la legenda.

### Testate colonnari

Le quattro intestazioni usano la **stessa griglia** di `.depth-bands`
(`repeat(4, minmax(0,1fr))`, stesso `--depth-gap`): la coincidenza con la
colonna sottostante è strutturale, non ottenuta con misure codificate, e regge
a qualunque larghezza del componente. Sono ingabbiate a sinistra, sopra e a
destra e **aperte inferiormente**, con gli angoli superiori raggiati come la
metà superiore di uno slot: la colonna prosegue idealmente attraverso entrambe
le corsie senza che venga disegnata alcuna linea sopra le righe *Ucraina* e
*Russia*. Sotto la soglia mobile, dove le colonne non esistono più, la riga
scompare invece di simulare una griglia assente: ogni fascia porta già in
proprio etichetta e distanza.

### Che cosa il diagramma NON dice

Il componente rappresenta l'accesso effettivo alla profondità. La lettura
interpretativa della fase — che cosa è mutato, quale soglia è stata verificata
o negata — appartiene al corpo editoriale della scheda. I due blocchi
`Mutamento prodotto` e `Soglia della fase`, presenti nella prima versione, sono
stati rimossi dal componente e dal contratto dati; così le note discorsive
dentro le singole fasce.

HTML semantico e CSS Grid. L'SVG serve **soltanto** per le icone dei nodi:
nessun testo editoriale in coordinate assolute, nessuna immagine unica. Il
filtro `diagrammaProfonditaModello` è l'unico calcolo: il partial non contiene
logica, il CSS non contiene dati.

I testi editoriali passano dal normale escaping di Nunjucks; `safe` è usato
esclusivamente per lo sprite, markup infrastrutturale del repository. Il front
matter non può quindi iniettare HTML.

---

## 6. Layout P e integrazione Eleventy

`layouts/scheda-profondita.njk` non importa più `cartina-fase.njk` e non ha alcun
ramo di ripiego cartografico: la testata è sempre `testata--fase
testata--condiagramma` e chiama la macro. Restano invariati ritorno alla timeline
P, corpo, infobox, navigatore delle sezioni e navigazione P precedente/successiva.

In `.eleventy.js`:

- il motore è importato **una sola volta**;
- la collezione `schedeProfondita` valida `diagrammaProfondita` per ogni scheda P
  pubblicata e rifiuta un eventuale blocco `cartina:` residuo;
- è registrato **un solo** filtro, `diagrammaProfonditaModello`;
- le validazioni post-build (`eleventy.after`) sono estese, senza duplicare
  listener né logica;
- `collections.schedeProfondita` e `collections.profondita` restano
  completamente separate: il diagramma **non** entra in `nodi-profondita.json`,
  che resta la fonte sintetica della timeline.

---

## 7. Assenza intenzionale di JavaScript

Il componente è interamente statico: nessun file JS dedicato, nessuna dipendenza
frontend, nessun rendering client-side, nessun canvas, nessuna libreria grafica,
nessuna risorsa remota. Tutto il contenuto è disponibile con JavaScript
disattivato; nulla è raggiungibile solo in hover; non esistono controlli
focalizzabili, perché la figura è statica e non deve introdurre falsi comandi.

Il progetto non ha acquisito alcuna dipendenza per questo intervento.

---

## 8. Aggiungere un tipo di nodo

Due gesti, entrambi nell'infrastruttura condivisa:

1. una voce in `NODI` nel vocabolario (`etichetta` italiana + `simbolo`);
2. un `<symbol>` con lo stesso id nello sprite, sulla griglia 24×24, solo tratto,
   `stroke="currentColor"`.

`npm run verify:profondita` fallisce se il simbolo dichiarato non esiste nello
sprite, se un simbolo è duplicato o se resta orfano. Nessuna modifica al partial,
al CSS o al layout.
