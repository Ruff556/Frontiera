# Architettura editoriale v2 — Attualità · Strategia · Sistemi

Documentazione tecnica interna alla build v3.8. **Non pubblicata dal sito**:
`docs/**` è escluso in `.eleventy.js` (`eleventyConfig.ignores`).

Questa nota descrive la riorganizzazione dell'architettura pubblica di Frontiera
attorno a tre nuclei editoriali. Le due linee temporali della home
(*Le fasi del conflitto* F0–F5 e *Il filo della profondità* P0–P6) **restano
invariate**: sono periodizzazioni, non categorie editoriali, e non compaiono nel
carosello. La loro architettura è documentata in
[`filo-profondita-architettura.md`](filo-profondita-architettura.md).

---

## 1. I tre nuclei editoriali

| Nucleo | Natura | Tipo tecnico | Indice pubblico |
|---|---|---|---|
| **Attualità** | Articoli analitici che partono da un evento recente (dichiarazioni, nomine, riforme, operazioni, decisioni). Il nucleo indica il *punto d'ingresso*, non limita la profondità. | analisi (`sezione: Attualità`) | `/archivio/attualita/` |
| **Strategia** | Articoli teorici / interpretativi / di lungo periodo su problemi generali. | analisi (`sezione: Strategia`) | `/archivio/strategia/` |
| **Sistemi** | Schede di riferimento permanenti: piattaforme, sistemi d'arma, infrastrutture, reti, software, ISR, C2 e famiglie tecnologiche. | schede (`categoria: Sistemi`) | `/#sistemi` |

**Articoli vs schede.** Gli articoli (analisi) sono contenuti datati, legati alla
cronaca o al ragionamento; vivono in `contenuti/analisi/`, layout
`layouts/analisi.njk`, permalink `/analisi/<slug>/`. Le schede (Sistemi) sono
riferimenti permanenti; vivono in `contenuti/schede/`, layout
`layouts/scheda.njk`, permalink `/schede/<slug>/`, con data d'aggiornamento
`aggiornata`.

La navigazione pubblica (desktop, menu mobile, footer) è: **Attualità ·
Strategia · Sistemi · Il progetto Frontiera**. È generata da un'unica fonte, `src/_data/site.js`
(`site.nav`), quindi le tre viste restano automaticamente coerenti.

---

## 2. Archivi e indice Sistemi

Gli archivi sono generati per paginazione su `src/_data/sezioni.js`
(`src/archivio.njk`, `permalink: /archivio/<slug>/`). Restano soltanto
`attualita` e `strategia`, entrambe di tipo `analisi` e con filtri per dominio.
Il template generico e il JavaScript dei filtri restano in uso per queste pagine.

`archivioUrl` in `.eleventy.js` mappa nomi e categorie alle rispettive
destinazioni: per `Sistemi` restituisce `/#sistemi`, anche nel link di ritorno
delle pagine di dettaglio.

### Sistemi in homepage

La homepage è l'indice principale e sufficiente della sezione. Consuma
`collections.sistemi`, derivata da `collections.schede` mediante il filtro
`item.data.categoria === "Sistemi"`, e mostra tutte le schede senza limite.
`/archivio/sistemi/` non viene generato; una pulizia mirata in `.eleventy.js`
rimuove l'eventuale output residuo delle build precedenti. A collezione vuota la
home mostra un breve stato editoriale, senza creare schede fittizie.

`card-sistema.njk` rende pannelli autonomi 16:9 con immagine a tutta superficie,
titolo integrato e un solo link. La griglia `.sistemi-grid` usa una colonna su
mobile, due su tablet e tre su desktop: non supera mai tre colonne e non riusa
la grammatica `.lf` delle linee F/P.

### Prima futura scheda Sistemi

Per pubblicare la prima scheda reale è sufficiente aggiungere un file
`contenuti/schede/<slug>.md` con front matter minimo:

```yaml
titolo: <nome del sistema>
slug: <slug>
categoria: Sistemi
ruolo: <riga di sintesi>       # usata come sommario di card/slide se manca `sommario`
aggiornata: 2026-07-29
in_evidenza: true              # opzionale: candida la scheda allo slot Sistemi del carosello
immagine: { file: …, alt: …, credito: …, licenza: … }
```

Per un logo o una grafica che non deve essere ritagliata, il blocco può dichiarare
`fit: contain`; il default resta `cover` per le fotografie. Il contenitore usa un
fondo nero senza padding, sia nelle anteprime sia nella testata del dettaglio.
Credito, fonte e licenza sono omessi nelle anteprime della home e restano visibili
nella pagina completa. Il layout `scheda` riusa la struttura editoriale e responsive
di Attualità, conservando metadati, specifiche e collegamenti bidirezionali.

---

## 3. Il carosello della home

Il carosello rappresenta **famiglie di contenuto** (i tre nuclei), **non**
periodizzazioni. Mostra al massimo un elemento per nucleo, in ordine fisso:

```
Attualità → Strategia → Sistemi
```

### Selezione — `collections.inEvidenza` (`.eleventy.js`)

Per ciascun nucleo:

1. si considerano gli item del nucleo ordinati per **data editoriale** decrescente;
2. si sceglie il più recente marcato `in_evidenza: true`;
3. se nessuno è marcato, si usa come fallback il più recente in assoluto;
4. se il nucleo non ha contenuti, **non** si genera alcuna slide.

Fonti: Attualità e Strategia dalle **analisi** (per `sezione`); Sistemi dalle
**schede** (per `categoria`). La collezione restituisce
`[attualità, strategia, sistemi].filter(Boolean)`: da 0 a 3 slide, mai segnaposto
«Prossimamente». La selezione è deterministica e **non** tocca `collections.fasi`
né la fonte dati P0–P6.

> **Nota tecnica sull'ordinamento.** L'ordinamento usa la data del front matter
> (`data` per le analisi, `aggiornata` per le schede), **non** il `page.date` di
> Eleventy. `eleventyComputed.date` popola `data.date` ma non il `page.date`
> usato nel confronto, che ripiegherebbe sul timestamp del file — fragile e non
> deterministico (p. es. azzerato da una copia della cartella). Per lo stesso
> motivo anche `collections.analisi` è stata portata a ordinare per `data`.

### Template (`src/index.njk`)

Un unico markup di slide gestisce analisi e schede senza duplicazione:

- etichetta editoriale: `{% set ambito = item.data.sezione or item.data.categoria %}`;
- testo introduttivo: `item.data.sommario` con fallback su `item.data.ruolo`;
- `affidabilita`/`teatro` compaiono solo se presenti (analisi); alle schede si
  aggiunge un tag «Scheda». Stessa estetica per tutti e tre i nuclei: nessuna
  palette distinta.

### JavaScript (`src/js/carosello.js`)

Comportamento per numero di slide:

- **≥ 2**: dot, frecce e avanzamento automatico attivi (fermo con
  `prefers-reduced-motion`);
- **1**: nessuna rotazione, controlli precedente/successivo e dot **nascosti**;
- **0**: la home resta funzionante, nessun errore in console, nessun timer,
  nessun controllo inerte.

Con i contenuti attuali il carosello ha **2 slide** (Attualità, Strategia): la
slide Sistemi comparirà automaticamente appena esisterà una scheda Sistemi.

---

## 4. Rimozione delle vecchie categorie segnaposto

Le categorie **Mezzi aerei**, **Mezzi terrestri**, **Droni** erano segnaposti
dell'architettura precedente e sono state rimosse **come categorie pubbliche** da
navigazione, footer, dati delle sezioni, home, archivi, filtri, collegamenti
interni e carosello.

- Gli archivi `/archivio/mezzi-aerei/`, `/archivio/mezzi-terrestri/`,
  `/archivio/droni/` **non vengono più generati**.
- **Gestione dei vecchi URL:** la build non dispone di un sistema di redirect
  (nessun `_redirects`/plugin), e si trattava di segnaposti: si è quindi scelto
  di **cessarne la generazione** senza introdurre redirect. Se in futuro si
  aggiungerà un meccanismo di redirect, i tre URL potranno puntare a `/#sistemi`.
- Le tre schede dimostrative sono state eliminate (§5).

**La rimozione riguarda solo le categorie editoriali.** La parola «droni» (e la
terminologia militare in genere) resta invariata nei testi, nelle analisi e nelle
schede-fase. Il dominio di filtro non era coinvolto (i domini sono
Aria/Terra/Mare/Spazio/Cyber·EW/Industria, non le vecchie categorie).

---

## 5. Schede dimostrative rimosse

Erano contenuti dimostrativi, non schede editoriali definitive; i file sorgente
sono stati eliminati:

- `contenuti/schede/tu-22m3.md` (era `categoria: Mezzi aerei`)
- `contenuti/schede/veicolo-ruotato.md` (era `categoria: Mezzi terrestri`)
- `contenuti/schede/munizione-circuitante.md` (era `categoria: Droni`)

Sono stati ripuliti i campi `schede_collegate` che rimandavano **esclusivamente**
a questi slug (in `capacita-residua-bombardamento.md`,
`difesa-aerea-fronte-orientale.md`, `tu-22m3-caduto.md`): ora vuoti, così non
restano rimandi a pagine inesistenti.

**Conservati** (nessuna scheda reale ancora esistente): la directory
`contenuti/schede/`, il data cascade `schede.11tydata.js`, il layout
`layouts/scheda.njk`, i partial `card-scheda.njk` e `card-sistema.njk`, le
collezioni `schede` e `sistemi`, i
filtri `schedeBySlug`/`analisiPerScheda` e i permalink `/schede/<slug>/`.

---

## 6. Riclassificazione Fedorov–Syrs'kyj

L'articolo `contenuti/analisi/articolo-attualita-fedorov-syrskyj.md` è passato da
`sezione: Strategia` a `sezione: Attualità`. Nessun altro dato editoriale
modificato (titolo, slug/permalink, data, sommario, corpo, immagine). Essendo il
più recente e marcato `in_evidenza: true`, occupa lo slot Attualità del carosello
e apre l'archivio Attualità.

---

## 7. Rapporto con le due periodizzazioni

Le due linee temporali **non** sono categorie editoriali. In particolare
**P0–P6 non costituiscono attualmente una classificazione degli articoli**: non
esiste (e non è stato introdotto) alcun campo `fase_profondita` /
`fasi_profondita` / `filo` / `periodizzazione` nel front matter. Il carosello non
ospita nodi F0–F5 o P0–P6. L'eventuale relazione futura fra articoli e nodi
P0–P6 sarà valutata separatamente (vedi la nota nell'altro documento).

> **Aggiornamento v3.8.** Le **schede P** sono ora una famiglia editoriale
> pubblicabile e autonoma (`/profondita/<slug>/`, tag `schede-profondita`, layout
> `scheda-profondita.njk`), distinta da `collections.fasi` e dalla Linea F.
> La prima scheda pubblicata è P0. Ciò riguarda le **pagine** delle schede P, non
> una classificazione degli articoli, che resta rinviata. Dettagli in
> [`filo-profondita-architettura.md`](filo-profondita-architettura.md). Il
> navigatore interno è ora un componente comune: vedi
> [`navigatore-sezioni.md`](navigatore-sezioni.md).

Struttura finale della home (invariata nell'ordine delle timeline):

```
Carosello
 ├── Attualità
 ├── Strategia
 └── Sistemi
Le fasi del conflitto        (F0–F5)
Il filo della profondità     (P0–P6)
Sistemi                      (schede)
```

---

## 8. Decisioni deliberatamente rinviate

- Guida definitiva dei front matter e guida per i produttori (README/brief
  storici lasciati invariati; vedi nota sui riferimenti conservati nella
  consegna).
- Eventuali sottocategorie interne di Sistemi (non introdotte in questa fase).
- Eventuale relazione futura fra articoli e nodi P0–P6.
- Redirect dei tre vecchi URL d'archivio (attualmente semplice cessazione).
