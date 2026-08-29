# Frontiera — rapporto di bonifica pre-pubblicazione

Data: 21 agosto 2026  
Baseline: `Frontiera - BUILD v3.9 Levels`

## Interventi effettuati

- Esclusi dal pacchetto destinato al repository `node_modules/`, `_site/` e `reports/`. Le prime due directory sono ricostruibili tramite installazione e build ed erano già ignorate; `reports/` contiene output di verifica e schermate di sviluppo, non sorgenti pubbliche. Il verificatore territoriale ricrea automaticamente il proprio report quando viene eseguito.
- Eliminati sei log locali `frontiera-s1-*-serve.*.log`, già coperti da `*.log` e privi di funzione nella pipeline.
- Eliminati `frontiera_prototipo.html` e `brief_cowork_frontiera_v2.md`: erano materiali di consegna antecedenti alla build, esclusi esplicitamente da Eleventy e senza dipendenze in README, sorgenti, script o documentazione corrente.
- Eliminati i raster `s1-starlink-circuito-concept.png` e `s1-starlink-scena-concept.png`: non erano richiamati da contenuti, template, CSS o JavaScript. Lo schema S1 usa gli asset definitivi `s1-starlink-scena-labels-clean.png`, `s1-starlink-osservazione.png`, `s1-starlink-decisione.png` e `s1-starlink-azione.png`.
- Eliminato `src/_includes/partials/infobox-editoriale.njk`: nessun layout o contenuto lo importava; il formato editoriale è reso dal dispatcher corrente tramite `infobox-tipo-2.njk`, inclusa la compatibilità con il vecchio payload.
- Aggiornata `.eleventy.js` per escludere sempre `reports/**` dalla scansione pubblica. Questo impedisce che un eventuale Markdown di QA venga trasformato accidentalmente in pagina; sono stati rimossi gli ignore riferiti ai due file obsoleti eliminati.
- Rafforzato `.gitignore` con `reports/`, `Thumbs.db` e file `.env`, preservando la possibilità di versionare `.env.example`.
- Nessuna dipendenza, versione, regola CSS, funzione JavaScript, contenuto editoriale, URL o componente visuale è stata modificata.

## Elementi analizzati ma conservati

- `docs/`, incluse schermate e confronti cartografici: costituisce documentazione tecnica collegata da README o dai documenti di architettura e conserva prove di validazione utili alla manutenzione.
- `data-sources/`: alimenta gli script di generazione e importazione dei territori ed è richiamata dalla documentazione cartografica.
- `src/fonts/` e i tre pacchetti Fontsource: tutti gli undici WOFF2 sono dichiarati nel CSS e la pipeline li ricopia dai pacchetti per il self-hosting.
- Le tre varianti del watermark: i nomi degli asset sono composti dinamicamente dal macro `watermark.njk`, quindi una ricerca letterale del percorso può produrre falsi positivi.
- `card-scheda.njk`, la collezione generica `schede` e il ramo non-analisi di `archivio.njk`: oggi l'indice Sistemi vive in homepage, ma l'architettura corrente documenta esplicitamente la conservazione del percorso generico e delle schede permanenti.
- CSS e JavaScript caricati globalmente: i runtime effettuano controlli sul DOM e si arrestano sulle pagine non pertinenti. Una separazione per pagina sarebbe un intervento prestazionale e architetturale, non una rimozione di codice dimostrabilmente morto.
- `src/_data/site.js` mantiene `https://frontiera.example`: il dominio definitivo non era disponibile e il prompt esclude modifiche speculative a URL e SEO.

## Verifiche effettuate

- Eseguita una build iniziale pulita e registrato l'output di riferimento.
- Eseguita dopo la bonifica l'intera pipeline equivalente a `npm run build`: copia degli undici font, verifiche Schema Kit, infobox desktop/mobile, cartina, territori e diagramma della profondità, seguite da Eleventy 3.1.6. Tutti i comandi sono terminati con codice `0`.
- La build finale ha prodotto 23 pagine HTML più il feed RSS, copiando 71 file statici e scrivendo 24 output generati.
- Confronto ricorsivo con la baseline: tutti i file pubblici comuni sono byte-per-byte identici. Le sole differenze sono le rimozioni intenzionali dei due raster-concept non referenziati e della directory pubblica `reports/`.
- Verificati automaticamente 981 riferimenti locali e 155 ancore nelle 23 pagine HTML: nessun target e nessuna ancora mancanti.
- Verificati i sei pacchetti di primo livello: le versioni installate coincidono esattamente con `package-lock.json`. Nessuna dipendenza è stata aggiunta, rimossa o aggiornata.
- Verificata l'assenza di credenziali e percorsi locali nei sorgenti testuali. Le occorrenze di `localhost` e `127.0.0.1` sono limitate alla documentazione di sviluppo e alla classificazione dei link interni.
- La cartella `_site/` inclusa nel pacchetto iniziale conteneva nove residui di build precedenti, fra vecchie pagine, asset e directory sorgente. Una build da directory vuota non li genera; l'output non viene quindi incluso nel repository.
- I 14 avvisi territoriali originari sono stati risolti nella revisione dedicata del 25 agosto 2026: F0 non pubblica percentuali ed è stato rimosso dal confronto editoriale; F1/F2 usano ora superfici amministrative terrestri come denominatore e nelle didascalie torna a prevalere il testo editoriale già approvato. Le geometrie non sono state modificate. La differenza metodologica di Kherson è documentata e verificata entro una tolleranza esplicita.

## Possibili interventi futuri

- Impostare il dominio pubblico definitivo in `src/_data/site.js` prima del deploy finale, così il feed RSS usa l'origine corretta.
- Valutare una pipeline per immagini responsive e formati moderni, già indicata nel README; richiede un cambiamento strutturale del caricamento degli asset.
- Valutare il caricamento selettivo dei runtime JavaScript per tipologia di pagina. Il beneficio va misurato prima di modificare il layout base.
- Aggiungere, quando sarà scelta la piattaforma di pubblicazione, una CI che esegua installazione da lockfile, build completa e controllo automatico di link e ancore.

## Esito

La build pubblica conserva integralmente HTML, CSS, JavaScript, contenuti e asset utilizzati. La bonifica riduce il pacchetto del repository a circa 43 MiB e 201 file, contro i 3.211 elementi e circa 109 MiB non compressi dell'archivio iniziale, senza introdurre differenze nei file pubblici condivisi.
