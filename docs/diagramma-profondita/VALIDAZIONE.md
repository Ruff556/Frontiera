# Validazione e verifica del diagramma della profondità

Tre controlli distinti, tutti dentro `npm run build`, tutti senza dipendenze
esterne e senza browser.

| Quando | Che cosa | Dove |
|---|---|---|
| **prima** di Eleventy | vocabolario, sprite, motore | `scripts/verifica-diagramma-profondita.cjs` (`npm run verify:profondita`) |
| **durante** la build | contratto del front matter, scheda per scheda | collezione `schedeProfondita` in `.eleventy.js` |
| **dopo** la build | HTML realmente generato | `eleventy.after` in `.eleventy.js` |

---

## 1. Comandi

```bash
npm run verify:profondita
```

```bash
npm run build
```

`build` esegue, nell'ordine: `font` → `verify:cartina` → `verify:territori` →
`verify:profondita` → `eleventy` (che comprende le validazioni di collezione e
quelle post-build). Le verifiche della cartina **non** sono state rimosse né
aggirate.

---

## 2. Contratto del front matter (build fallita)

La build si interrompe con un messaggio leggibile, sempre preceduto dal percorso
del file sorgente, quando:

- `diagrammaProfondita` manca in una scheda P pubblicata;
- `versione` non è supportata;
- `dataAssetto` non è una data ISO valida (forma errata **o** data inesistente,
  per esempio `2022-02-30`);
- manca uno dei due profili `ucraina` o `russia`, o ne compare un terzo;
- manca una delle quattro fasce;
- compare una fascia o uno stato sconosciuto;
- `complesso` o `limite` sono assenti o vuoti;
- compare una **chiave ritirata**: `accesso.<fascia>.nota`, `mutamento`,
  `soglia` (rimosse dal contratto, quindi rifiutate come qualunque refuso);
- `nodi` non è un array;
- un nodo usa un `tipo` o una `fascia` sconosciuti;
- un nodo è collocato in una fascia `non-accessibile` per quell'attore;
- un nodo identico è duplicato;
- un attore supera i quattro nodi complessivi;
- una singola fascia supera i quattro nodi (quattro sono ammessi: è l'intero
  budget dell'attore concentrato su un solo strato di profondità);
- compare una chiave sconosciuta ai livelli strutturali del contratto (radice,
  profilo, fascia, nodo) — l'intercettazione dei refusi;
- una scheda P dichiara ancora un blocco `cartina:`.

Esempio reale:

```
[diagramma profondità] [./contenuti/profondita/3-esempio.md] profili.ucraina.nodi[1]:
nodo collocato nella fascia «profonda», dichiarata “non-accessibile” per «ucraina».
Una fascia non accessibile non può ospitare nodi.
```

### Ciò che NON fa fallire la build

Un **profilo non monotono** è valido: `intermedia: non-accessibile` seguita da
`profonda: episodico` è un assetto reale, non un errore di contratto. È verificato
esplicitamente sia nello script (`profilo NON monotono …`) sia sull'HTML di P2.

---

## 3. Verifica statica (`verify:profondita`)

86 controlli, raggruppati in cinque famiglie.

**Vocabolario** — le quattro fasce nell'ordine canonico; i quattro stati
nell'ordine canonico; nessuna fascia denominata tattica/operativa/strategica;
nessuno stato «protetto»; un solo stato non accessibile; unicità di chiavi,
etichette pubbliche, etichette brevi e grammatiche del vettore; due attori con
denominazioni pubbliche complete e distinte; tassonomia dei nodi completa, con
etichette e simboli non vuoti e unici; testi infrastrutturali presenti; limiti di
leggibilità dichiarati; **nota metodologica identica al testo canonico** e
assenza di residui delle etichette dei blocchi rimossi.

**Sprite** — esistenza del file; presenza del simbolo di **ogni** tipo dichiarato;
nessun simbolo duplicato; nessun simbolo orfano; nessuna risorsa remota; sprite
fuori dall'albero accessibile.

**Fixture valido** — accettazione; ordine di corsie e fasce; data italiana
derivata; legenda limitata agli stati presenti (verificata anche nel caso in cui
due stati non compaiano affatto); etichetta predefinita e simbolo del nodo
risolti dal vocabolario; riepilogo accessibile che contiene data, attori,
complessi, nodi, limiti e nota metodologica, e che **non** cita più i blocchi
rimossi; assenza nel modello di qualunque campo `nota` / `mutamento` / `soglia`.

**Contratti scorretti** — venticinque casi negativi, uno per ciascuna regola
dell'elenco §2 — comprese le tre chiavi ritirate — con controllo che il
messaggio d'errore nomini davvero la causa.

**Non monotonicità e segmentazione** — accettazione del profilo di P2;
interruzione reale del vettore nella fascia intermedia; nessuna punta di freccia
oltre l'ultima fascia accessibile del primo tratto; segmento autonomo con punta
nella fascia profonda; un nodo resta ammesso nella fascia profonda episodica.
Più il comportamento puro di `segmentaVettore` su tre profili limite (tutto
accessibile, nulla accessibile, con discontinuità).

---

## 4. Verifica post-build sull'HTML generato

In `eleventy.after`, sull'output reale in `_site`. Nessun elenco di slug scritto
a mano: si controllano **tutte** le cartelle presenti in `_site/profondita/`,
così la verifica cresce da sola con P3 e successive (minimo atteso: tre schede).

Per ciascuna scheda P:

- esattamente **una** figura `.depth-card`;
- **nessuna** occorrenza di `.phase-map-card`;
- presenza di kicker, titolo e riepilogo accessibile con id univoci, testate
  colonnari, watermark, legenda e nota metodologica;
- **assenza** di `Mutamento prodotto`, `Soglia della fase`, `depth-reading`,
  `depth-band-note` e del vecchio testo della nota metodologica;
- nota metodologica **identica** a quella del vocabolario (fonte unica);
- la data dell'assetto compare **una volta sola**, nel gruppo di testata;
- **due** corsie e **quattro** fasce per corsia, nell'ordine canonico;
- nessuna continuità fittizia: una fascia `non-accessibile` non può contenere un
  tratto, e una fascia accessibile non può esserne priva;
- il tratto che riappare dopo una discontinuità è marcato come autonomo.

Controlli mirati:

- **P2** — nella corsia ucraina la fascia intermedia è non accessibile e priva di
  vettore, la fascia profonda è episodica e rende un segmento autonomo;
- **schede F** — la cartina di fase è ancora resa in `fasi/manovra-fallita`
  (nessuna regressione del motore cartografico).

Restano attive e invariate le validazioni preesistenti: timeline «Il filo della
profondità» in home (nodi resi, nessun `href="#"`, nessun link verso pagine
inesistenti) e navigatore delle sezioni (id sugli h2, selettore comune, nessun
vincolo a `.fasebody`).

Esito atteso in console:

```
[profondita:verify] OK: 86 controlli — …
[verify:navigatore+timeline] OK — 4 pagine controllate.
[verify:profondita/html] OK — 3 schede P con diagramma coerente; cartina F integra.
```

---

## 5. Controllo visivo

Il componente è statico e privo di JavaScript: non esiste stato da riprodurre.
Il controllo visivo si esegue con `npm run serve` sulle tre schede P a 1440, 1024,
768, 500, 390 e 360 px, più almeno una scheda F per escludere regressioni.

Le schermate di confronto sono in [`confronti/`](confronti/):

| File | Vista |
|---|---|
| `p0-desktop-1440.png`, `p1-desktop-1440.png`, `p2-desktop-1440.png` | testata desktop, composizione a quattro colonne |
| `p0-tablet-768.png` | tablet, ancora a quattro colonne |
| `p0-mobile-500.png`, `p2-mobile-500.png` | corsia ricomposta in verticale |

Sono state prodotte con il Chrome **già installato sul sistema** in modalità
headless: nessun browser è stato aggiunto alle dipendenze del progetto, che
non ne richiede alcuna. Nota: Chrome headless non porta la viewport di layout
sotto ~500 px, quindi le schermate «mobile» sono a 500 px; le larghezze di 390 e
360 px sono state verificate dal vivo nel browser (nessun overflow orizzontale:
`scrollWidth` uguale a `innerWidth`, card larga 358 px a 390 px).
