# Il filo della profondità — architettura (P0–P6)

Documentazione tecnica interna alla build v3.8. **Non pubblicata dal sito**: la
cartella `docs/**` è esclusa in `.eleventy.js` (`eleventyConfig.ignores`).

Questa nota descrive la seconda linea temporale della home, *Il filo della
profondità* (P0–P6), e la famiglia editoriale delle **schede P** ora
pubblicabili. La timeline della home e le schede-fase F0–F5 restano applicazioni
dello **stesso** componente editoriale (vedi anche
[`navigatore-sezioni.md`](navigatore-sezioni.md)).

---

## 1. Il componente unico di timeline

File: [`src/_includes/partials/linea-temporale.njk`](../src/_includes/partials/linea-temporale.njk)

La timeline della home è una macro Nunjucks riutilizzabile `linea(...)`, condivisa
fra *Le fasi del conflitto* (F0–F5) e *Il filo della profondità* (P0–P6). Rende lo
**stesso HTML e le stesse classi** (`.linea`, `.lf`, `.lf-link`, …): nessuna nuova
estetica, nessun secondo linguaggio grafico. Il partial **non è stato modificato**
in questo intervento.

### Stato dei collegamenti (link vs contenitore non interattivo)

Per ogni nodo la macro calcola `href = it.url or d.url`:

- **Con URL** → `<a class="lf-link" href="…">` (card cliccabile);
- **Senza URL** → `<div class="lf-link">` con le stesse classi visuali: non
  interattivo, non focalizzabile, **non** annunciato come link, senza `href`
  inesistente.

La novità di v3.8: per i nodi P l'URL **non è più assente né scritto a mano nel
JSON**, ma derivato in build dalla scheda P corrispondente (vedi §4).

---

## 2. Due fonti dati distinte, non confondibili

| Nome | Che cos'è | File / registrazione |
|---|---|---|
| **`collections.profondita`** | I **nodi sintetici** P0–P6 della timeline in home. Non generano pagine. | array `contenuti/profondita/nodi-profondita.json` → collezione in `.eleventy.js` |
| **`collections.schedeProfondita`** | Le **pagine Markdown** delle schede P realmente pubblicate. | `contenuti/profondita/*.md` + data cascade `profondita.11tydata.js` |

> **Rinominato.** L'array sintetico era `contenuti/profondita/profondita.json`. È
> stato rinominato in **`nodi-profondita.json`** per non collidere con la
> convenzione Eleventy dei *directory data file* (`profondita.11tydata.js`), che
> ora fornisce layout/tag/permalink alla cartella. Il `require` in `.eleventy.js`
> è aggiornato di conseguenza.

Le schede P **non** confluiscono in `collections.fasi` e **non** fanno parte della
Linea F: sono una famiglia editoriale autonoma, come `analisi` o `schede`.

---

## 3. La famiglia editoriale delle schede P

### 3.1 Data cascade

File: [`contenuti/profondita/profondita.11tydata.js`](../contenuti/profondita/profondita.11tydata.js)

```js
module.exports = {
  tags: "schede-profondita",
  layout: "layouts/scheda-profondita.njk",
  eleventyComputed: {
    permalink: (d) => `/profondita/${d.slug}/index.html`,
    titoloPagina: (d) => d.titolo,
    descrizionePagina: (d) => d.anteprima,
  },
};
```

Il permalink è determinato dallo **`slug` editoriale** del front matter (stabile e
indipendente dal nome fisico del file), non da `page.fileSlug`.

### 3.2 Layout

File: [`src/_includes/layouts/scheda-profondita.njk`](../src/_includes/layouts/scheda-profondita.njk)

Riusa l'impaginazione delle schede F (testata, colonna sinistra con immagine +
infobox, foglio di lettura, navigatore delle sezioni), ma:

- il ritorno in testata porta a **`/#filo-profondita-titolo`** (l'id stabile
  dell'`<h2>` della seconda timeline in home), **non** alla Linea F; dicitura
  «Il filo della profondità»;
- la navigazione sequenziale usa `collections.schedeProfondita` (mai
  `collections.fasi`), con etichette «Passaggio precedente / successivo»;
- il navigatore è attivato dal contratto `data-section-navigation` sul `.fasebody`;
- **le schede P non riusano più la cartina delle schede F.** Lo slot destro della
  testata ospita il **diagramma funzionale della profondità**, componente proprio
  della linea P (vedi §3.4).

> **Superato dalla v3.8.** La cartina nelle testate di P0 e P1 era un segnaposto
> temporaneo. Il layout P non importa più `partials/cartina-fase.njk`, non ha più
> alcun ramo `if cartina` e non conserva alcun ripiego cartografico. I blocchi
> `cartina:` sono stati rimossi dal front matter di P0 e P1; dichiararne uno in
> una scheda P è ora un errore di build. Il motore cartografico
> (`src/_lib/cartina.js`, `partials/cartina-fase.njk`, dataset e script) resta
> invariato e continua a servire le sole schede F.

### 3.3 Campi obbligatori (validati in build)

Ogni scheda P deve dichiarare: `slug`, `idFase`, `numero`, `numeroEtichetta`,
`ordine`, `linea: profondita`, `datazione`, `titolo`, `titoloBreve`, `anteprima`,
`dialettica` e il blocco `diagrammaProfondita`. La collezione `schedeProfondita`
fa **fallire la build** con un messaggio chiaro in caso di campo mancante, `linea`
diversa da `profondita`, duplicati di `slug` / `idFase` / `numero` / permalink,
blocco `cartina:` residuo, o contratto del diagramma violato.

### 3.4 Il diagramma della profondità

Componente seriale della linea P, obbligatorio in ogni scheda P pubblicata e
interamente governato dal front matter. Sostituisce la cartina nello slot della
testata e non ne condivide dati, motore, CSS né vocabolario.

| | |
|---|---|
| vocabolario | [`src/_data/profonditaVocabolario.js`](../src/_data/profonditaVocabolario.js) |
| motore | [`src/_lib/diagramma-profondita.js`](../src/_lib/diagramma-profondita.js) |
| renderer | [`src/_includes/partials/diagramma-profondita.njk`](../src/_includes/partials/diagramma-profondita.njk) |
| icone | [`src/immagini/profondita/icone-profondita.svg`](../src/immagini/profondita/icone-profondita.svg) |
| CSS | `src/css/frontiera.css`, sezione 14.1, namespace `.depth-*` |
| verifica | `npm run verify:profondita` |

Documentazione dedicata:
[`diagramma-profondita/ARCHITETTURA.md`](diagramma-profondita/ARCHITETTURA.md) ·
[`diagramma-profondita/CONTRATTO-DATI.md`](diagramma-profondita/CONTRATTO-DATI.md) ·
[`diagramma-profondita/VALIDAZIONE.md`](diagramma-profondita/VALIDAZIONE.md).

---

## 4. Legame automatico timeline ↔ pagine P

L'associazione fra nodo sintetico e pagina usa un identificatore esplicito e non
ambiguo, `idFase`:

- nel Markdown: `idFase: p0`
- nel JSON: `"idFase": "p0"`

In `.eleventy.js`, `collections.profondita` costruisce una mappa `idFase → url`
dalle pagine `schede-profondita` e restituisce, per ogni nodo,
`{ ...nodo, url: paginaCorrispondente ? paginaCorrispondente.url : null }`.

Conseguenze:

- **P0** diventa cliccabile perché la pagina esiste
  (`/profondita/asimmetria-iniziale-decisione-mancata/`);
- **P1–P6** restano pannelli non interattivi finché le pagine non esistono;
- l'URL **non** è duplicato nel JSON e non può divergere dal permalink reale;
- pubblicando una nuova scheda P la timeline la collega **automaticamente**.

### Validazioni (§9 del brief)

- ogni scheda P pubblicata deve corrispondere a uno dei nodi P0–P6 (idFase noto);
- nessuna associazione ambigua (stesso idFase su due pagine);
- controllo post-build sull'HTML di `_site` (`eleventy.after`): la card P0 è un
  `<a>` verso la pagina reale, P1–P6 sono sei `<div>`, nessun `href="#"`, nessun
  link verso pagine inesistenti.

---

## 5. Come pubblicare P1 (e successive) senza toccare il template

1. creare `contenuti/profondita/1-<slug>.md` con il front matter completo
   (§3.3), in particolare `slug`, `idFase: p1`, `ordine: 1`, `linea: profondita`;
2. compilare il blocco `diagrammaProfondita`
   ([contratto](diagramma-profondita/CONTRATTO-DATI.md));
3. non serve altro: la pagina eredita layout, tag e permalink dal data cascade;
4. la card P1 in home diventa **automaticamente** cliccabile (mappa `idFase`);
5. la P0 riceve **automaticamente** il collegamento «Passaggio successivo» verso
   la P1, e la P1 il «Passaggio precedente» verso la P0. Nessuna modifica manuale
   al layout o al JSON.

Il nodo sintetico P1 in `nodi-profondita.json` resta come pannello di timeline;
il suo URL si popola da solo quando la pagina esiste.

---

## 6. Invarianti conservati

- P0–P6 **non** compaiono nella Linea F né in `collections.fasi`;
- le schede-fase F0–F5 restano invariate (timeline, navigazione, id di sezione,
  cartina e motore cartografico);
- nessun URL fittizio, nessun `href="#"`, nessuna pagina segnaposto per P1–P6;
- nessuna modifica editoriale ai testi;
- `collections.schedeProfondita` e `collections.profondita` restano separate: il
  diagramma vive nel Markdown della scheda e **non** entra in
  `nodi-profondita.json`, che resta la sola fonte sintetica della timeline.
