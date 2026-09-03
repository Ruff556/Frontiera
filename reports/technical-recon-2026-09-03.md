# Ricognizione tecnica Frontiera — 3 settembre 2026

## 1. Executive summary

Frontiera ha una base tecnica solida: sito statico, componenti progressivi, immagini editoriali responsive, font locali, asset specialistici condizionali e una build con controlli sostanziali. **Non è giustificata una riscrittura, né una frammentazione generale del CSS o del JavaScript.**

La build completa riesce, ma il suo esito positivo non copre alcuni difetti osservabili nel browser: focus nei link del menù chiuso, perdita del focus durante la rotazione del carosello, un richiamo infobox che può non comparire dopo un salto di scroll e una semantica ARIA incoerente nel navigatore. Inoltre, **`npm start` fallisce su una copia pulita** perché manca un file generato da un verificatore che quel comando non esegue.

Il beneficio prestazionale più concreto riguarda alcuni PNG caricati nelle pagine specialistiche. Una ricodifica lossless della scena Starlink risparmia **781.361 byte / 763,0 KiB**, con identità RGBA verificata; quella della base cartografica risparmia **314.597 byte / 307,2 KiB**. Sono misure su buffer in memoria, non modifiche al sito.

La homepage dichiara un universo di 12,40 MiB, ma la visita locale misurata trasferisce circa **325 KiB a 390 px/DPR1**, oppure **983 KiB a DPR2**. Il CSS globale occupa **34,6 KiB gzip**, non i 144,0 KiB del sorgente. Queste distinzioni cambiano le priorità.

**Nessuna implementazione eseguita.** Questo rapporto è l'unico file aggiunto al repository.

### Perimetro e sicurezza

- Branch: `audit/technical-recon-2026-09-03`.
- Base verificata con `git fetch origin main`: `1c842805fa440ad9a8964c1624ea626d6a090e51`.
- Il checkout iniziale era detached su `a4ca279`; non è stato usato come base dell'audit.
- `main` locale e `origin/main` coincidevano con la base. Nessun checkout, commit, merge o rebase su `main`.
- Build, installazione dipendenze, browser e artefatti di misura sono stati confinati in export temporanei esterni al repository.
- I sorgenti degli export non sono stati corretti per far passare le prove. Sono stati eseguiti gli script esistenti; le trasformazioni di compressione sono rimaste in memoria.
- Il rapporto è volutamente tracciato anche se `reports/` è ignorata da Git. Nessuna modifica a `.gitignore`.
- Nessun push e nessuna PR.

**Legenda delle evidenze:** **M** = misura o riproduzione eseguita; **S** = fatto verificato nel codice/configurazione; **I** = inferenza da sottoporre a conferma prima di intervenire. Le proposte non equivalgono a risultati già ottenuti in produzione.

## 2. Architettura osservata

Eleventy 3.1.6 genera Nunjucks e Markdown a partire da `src/`, `contenuti/` e dai dati strutturati. `.eleventy.js` concentra collezioni, backlink, validazioni, shortcode, immagini responsive e verifiche successive al rendering.

Il layout `src/_includes/layouts/base.njk` individua i componenti nel contenuto già renderizzato e carica i relativi CSS/JS. Tutti gli script esterni del sito sono `defer`; rimangono il breve bootstrap inline della classe `js` e, nella pagina progetto, lo script inline di copia email dell'infobox tipo 4.

Le cartine F sono SVG generati in build; i diagrammi P sono HTML/CSS con descrizione accessibile e sprite incorporato. Non richiedono un motore cartografico nel browser. I diagrammi Starlink e Palantir hanno runtime autonomi; STR1 adotta lo Schema Kit.

Le immagini editoriali passano per `@11ty/eleventy-img` 7.0.0: 19 originali, profili per componente, WebP e fallback originale, dimensioni intrinseche, `sizes`, `srcset`, `decoding=async`. Le immagini interne agli schemi e la base cartografica hanno invece riferimenti diretti. Il lightbox richiede l'originale soltanto all'apertura.

Gli indicatori di affidabilità V1 risolvono marker editoriali contro sidecar validate, incorporano i dati nel trigger e condividono un pannello per pagina. Questo sistema non deve essere confuso con il badge legacy `aff`.

La build completa contiene 16 fasi seriali. `verify:territori` è anche un generatore di dati consumati da Eleventy: questa dipendenza è importante per l'avvio e impedisce di parallelizzare liberamente l'intera catena.

## 3. Cosa è già fatto bene

- **Caricamento condizionale reale.** Home, archivi, pagine F/P e schede specialistiche ricevono insiemi diversi di asset. Il kit non viene caricato inutilmente su Starlink e Palantir.
- **Nessun framework frontend o dipendenza runtime esterna generalizzata.** Le funzioni interattive sono locali e circoscritte.
- **Immagini editoriali già trattate correttamente.** Candidate calibrate, rapporto intrinseco, scelta WebP, caricamento differito e priorità esplicita della prima slide.
- **Originali del lightbox fuori dal caricamento iniziale.** La prova F0 conferma la richiesta solo dopo Enter sul trigger; se l'originale fallisce resta la derivata.
- **Architettura statica della cartografia e della profondità.** Dati, validazione e resa sono separati. Il vocabolario P evita divergenze di legenda e semantica.
- **Controlli negativi utili.** Infobox, dati di profondità e sidecar non sono verificati soltanto con esempi validi: esistono fixture che devono essere rifiutate.
- **Gestione delle animazioni già consapevole.** Schemi con token di cancellazione, timer gestiti, sospensione per visibilità e supporto reduced motion; nessun motivo per uniformare immediatamente tutti i motori.
- **Overlay più complessi già curati.** Lightbox e normale apertura infobox mobile gestiscono focus, sfondo inert, Escape e ripristino dello scroll.
- **Focus CSS e skip link presenti.** Outline differenziati sui fondi, fallback senza blur, rappresentazione P anche in forced colors.
- **Font locali e swap.** Nessuna richiesta a un provider esterno per i font; non sostituire questa strategia con una CDN.
- **Controllo output significativo.** Riferimenti, ancore, formati effettivi delle immagini, canonical, sitemap e discovery RSS sono già verificati.

Questi aspetti sono da preservare nei futuri prima/dopo.

## 4. Risultati A — opportunità forti

### A1 — Escludere il menù chiuso dalla navigazione e restituire il focus

- **File/componente:** `src/js/menu-mobile.js:10–30`, `src/css/frontiera.css:273–285`, `src/_includes/layouts/base.njk`; menù principale.
- **Attuale ed evidenza:** **S** la chiusura applica solo una trasformazione CSS e aggiorna classi/`aria-expanded`. **M** a 390 px, Tab dal burger entra in “Attualità” nel menù chiuso, con bordo sinistro a **430,99 px**. A 1366 px, Tab dall'ultimo link della nav desktop raggiunge lo stesso menù a **1407,5 px**. Escape da un link aperto lo lascia focalizzato fuori schermo.
- **Problema:** focus invisibile e quattro tappe estranee nella sequenza. Riguarda anche il desktop, non soltanto il layout mobile.
- **Beneficio teorico:** percorso di tastiera coerente con la visibilità. **Realistico:** eliminazione immediata dei quattro link fuori schermo e ritorno prevedibile al comando.
- **Rischio/complessità:** basso; intervento localizzato, da coordinare con la transizione di chiusura. La decisione di rendere il menù pienamente modale è distinta e richiede UX.
- **Prima/dopo e regressioni:** Tab/Shift+Tab a 390 e 1366 px, apertura con Enter/Space, Escape, click sullo scrim, cambio breakpoint e navigazione a un link. Verificare il nome accessibile del burger anche da aperto: oggi resta “Apri menù”.
- **Raccomandazione:** prima priorità di accessibilità. Aggiungere una prova browser di stato chiuso e ritorno del focus; non basta cercare `aria-expanded` nel sorgente.

### A2 — Rendere espliciti i prerequisiti dell'avvio e il runtime Node

- **File/componente:** `package.json:10–12`, `README.md:168–191`, `src/_lib/cartina.js:397–401`, `scripts/verifica-territori.cjs:375–381`; bootstrap locale/build.
- **Attuale ed evidenza:** **M** build completa riuscita. **M** `npm start` su export senza `reports/territori-report.json` termina con exit 1: “report territoriale assente; eseguire verify:territori prima della build”. **S** `start`/`serve` eseguono font e sfondi, ma omettono il generatore richiesto. **S** Eleventy Image 7.0.0 dichiara Node `>=22`; README e esempio Actions suggeriscono ancora Node 18/20. Il package applicativo non dichiara `engines`.
- **Problema:** l'avvio dipende dall'esecuzione precedente di un altro comando; le istruzioni documentano anche un runtime fuori dal requisito della dipendenza.
- **Beneficio teorico:** bootstrap riproducibile. **Realistico:** un nuovo checkout può avviarsi senza conoscenze implicite; diagnosi chiara dell'ambiente non supportato. Non è stato provato il runtime Node 20: il requisito `>=22` è un fatto di metadata, non una misura di crash su quella versione.
- **Rischio/complessità:** basso, circoscritto alla preparazione e alla documentazione; considerare il costo di circa 5,9 s del passaggio territoriale.
- **Prima/dopo e regressioni:** `npm ci`, `npm start` e `npm run build` da export pulito sul runtime scelto. Verificare anche che dati territoriali aggiornati non lascino un report vecchio durante il lavoro.
- **Raccomandazione:** rendere esplicita e condivisa la preparazione richiesta; allineare runtime documentato, configurazione di esecuzione e dipendenze senza cambiarne arbitrariamente le versioni.

### A3 — Ricodifica lossless mirata dei PNG realmente scaricati

- **File/componente:** `src/immagini/sistemi/s1-starlink-scena-labels-clean.png`, `src/_includes/partials/schema-starlink.njk:7`; `src/immagini/cartografia/ukraine-administrative-base.png` e renderer `src/_lib/cartina.js`.
- **Attuale ed evidenza:** **M** scena Starlink richiesta all'apertura della scheda, 2.047.557 byte; base cartografica 495.127 byte. Ricodifica WebP lossless, sharp 0.35.4, effort 6, senza resize: rispettivamente **1.266.196** e **180.530** byte. Decodifica e confronto RGBA: identici per entrambi.
- **Opportunità:** ridurre dati di rete senza cambiare disegno, dimensioni o contenuto. Sono risorse effettivamente caricate, non soltanto file presenti nel repository.
- **Beneficio teorico:** -38,2% sulla scena e -63,5% sulla base. **Realistico:** 763,0 KiB in meno sulla prima visita Starlink; 307,2 KiB in meno su una prima visita F. La base condivisa non va conteggiata sei volte in una sessione con cache.
- **Rischio/complessità:** basso, ma occorre aggiornare i riferimenti e verificare resa, colore e fallback sui browser supportati. Gli originali restano master. Nessun risparmio di decode a dimensioni invariate.
- **Prima/dopo e regressioni:** byte delle risposte, identità dei pixel, screenshot agli stessi DPR, posizionamento delle sovrapposizioni SVG, cache e immagini mancanti. Per gli altri PNG trasparenti il confronto va distinto: alcuni RGB sotto alpha zero cambiano, pur con pixel visibili identici.
- **Raccomandazione:** primo intervento prestazionale candidato. Estendere eventualmente a STR1/Palantir solo dopo la stessa verifica; non avviare una conversione indiscriminata di tutti gli asset.

### A4 — Aggiornare il richiamo infobox anche quando lo scroll salta il sentinel

- **File/componente:** `src/js/infobox-mobile.js:148–170`; disponibilità del pulsante fisso.
- **Attuale ed evidenza:** **S** in presenza di IntersectionObserver non è attivo il fallback sullo scroll. Un sentinel può passare da sotto a sopra la viewport restando non intersecante in entrambi gli stati. **M** F0, 390×844, reduced motion: End da inizio pagina porta a scrollY **18.512**, sentinel a **-16.740,56 px**, controller ancora `hidden`, trigger `tabindex=-1`. Facendolo prima attraversare la viewport, il controller diventa correttamente `available`.
- **Problema:** assenza del richiamo dopo un salto legittimo; non è un difetto del dialog una volta aperto.
- **Beneficio teorico:** stato derivato dalla posizione reale, anche per salti. **Realistico:** richiamo disponibile dopo End e salti equivalenti.
- **Rischio/complessità:** basso-medio; localizzato, ma evitare un nuovo ciclo pesante per ogni evento di scroll.
- **Prima/dopo e regressioni:** End/Home, salto programmatico, hash, ripristino di scroll, scroll normale, reduced motion, resize e apertura/chiusura in corso. Usare un controllo browser sullo stato effettivo, non la sola “visibilità” del box: un pulsante con opacity zero può avere ancora dimensioni.
- **Raccomandazione:** integrare un aggiornamento economico per i salti preservando observer e macchina a stati.

### A5 — Allineare ARIA alle funzioni già esistenti

- **File/componente:** `src/js/nav-sezioni.js:444–449,553,633`; `src/js/filtro-archivio.js:24–28`, `src/archivio.njk:25–27`.
- **Attuale ed evidenza:** **M** axe segnala `aria-valuenow` non ammesso su `role=button` della `.secroll-capsule` in tutte le sei pagine editoriali/progetto del campione mobile. **S** il navigatore è presente in 20 pagine. **M** il filtro “Spazio” cambia la classe `on`, ma nessun pulsante espone `aria-pressed` o altro stato selezionato. Il carosello ha un problema di semantica separato in B1.
- **Problema:** ruolo/stato del rullino incoerenti; selezione dell'archivio comunicata solo visivamente.
- **Beneficio teorico:** stato comprensibile alle tecnologie assistive. **Realistico:** rimozione dell'errore ARIA e selezione interrogabile, senza modifiche grafiche.
- **Rischio/complessità:** basso, poche assegnazioni. Non promuovere automaticamente il rullino a slider: apre un indice, quindi il ruolo deve rispettarne la funzione.
- **Prima/dopo e regressioni:** snapshot accessibile, axe, Enter/Space, frecce, Escape, lettura dello stato dei filtri e risultato vuoto. Rivedere anche `aria-haspopup=true`, che dichiara un popup menu mentre il pannello contiene link ordinari.
- **Raccomandazione:** correzione tecnica mirata in una successiva sessione; il livello “critical” di axe non va tradotto automaticamente in priorità critica di prodotto.

## 5. Risultati B — opportunità plausibili e decisioni necessarie

### B1 — Carosello: rotazione, conservazione del focus e scelta del controllo pausa

- **File/componente:** `src/js/carosello.js:30–60`, `src/index.njk:14,39`, CSS slide in `frontiera.css:421–435`.
- **Attuale/evidenza:** **M** dopo il focus sul titolo della prima slide, trascorsi 7,2 s appare la seconda e `document.activeElement` diventa BODY. **S** timer ogni 6,5 s, nessuna pausa per focus/hover/visibilità documento e nessun comando pausa. I dot dichiarano `role=tab` senza selezione, associazione a tabpanel o navigazione a frecce.
- **Problema:** la rotazione sottrae il bersaglio mentre l'utente lo sta usando. Il pattern WAI raccomanda sospensione su focus/hover e comando esplicito di arresto/ripresa. [WAI-ARIA APG, Carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)
- **Beneficio teorico/realistico:** controllo della lettura e conservazione del focus; impatto prestazionale trascurabile rispetto a quello di accessibilità.
- **Rischio/complessità:** medio; la pausa esplicita o una politica diversa di autoplay richiedono una scelta UX, fuori dal vincolo di invarianza percepita di questa sessione.
- **Prima/dopo/regressioni:** focus mantenuto oltre due intervalli, hover, ritorno da scheda nascosta, riduzione movimento, swipe, link attivabili, 0/1/3 slide, stato e semantica dei dot.
- **Raccomandazione:** decisione UX prioritaria e poi correzione. Non limitarsi ad aggiungere un attributo ARIA al timer esistente.

### B2 — Affidabilità V1 e fallback: definire il comportamento ai bordi e senza JS

- **File/componente:** `src/js/affidabilita-v1.js:110–168,202–220`, `src/css/affidabilita-v1.css`, partial del panel, `src/_lib/affidabilita-v1.js`; controlli di Starlink/STR1 e bootstrap `base.njk`.
- **Attuale/evidenza:** **M** trigger F0 a circa 100 px dall'alto: panel a **y=-288**, altezza **380**, bordo inferiore 92 px; il focus da tastiera entra nel pannello parzialmente fuori viewport. **S** la posizione ABOVE-only è voluta e verificata dai test. **M** senza JS il testo editoriale rimane leggibile, ma i trigger V1 restano pulsanti attivi e motivazioni/fonti rimangono nel dato codificato, senza panel leggibile. Starlink/STR1 espongono anche comandi non funzionanti; Palantir nasconde i suoi. Con soli script esterni bloccati resta visibile anche il burger, perché il bootstrap inline ha già aggiunto `js`.
- **Problema:** progressività incompleta degli apparati, diversa dalla leggibilità del corpo principale. Il problema del panel non autorizza a contraddire un contratto progettuale.
- **Beneficio teorico/realistico:** accesso più affidabile alle motivazioni e assenza di comandi ingannevoli; destinatari soprattutto tastiera, rete parzialmente fallita o JS disabilitato.
- **Rischio/complessità:** medio; fallback visibile, scroll di accomodamento o revisione del posizionamento richiedono UX e coordinamento dei test.
- **Prima/dopo/regressioni:** trigger vicino a header/bordi, contenuti lunghi, zoom e visualViewport, apertura con mouse/tastiera, Escape, scroll, blocco del singolo modulo, disabilitazione completa JS. Verificare che il panel resti non modale se questo è il contratto scelto.
- **Raccomandazione:** chiarire il comportamento desiderato prima di intervenire. Non “correggere” ABOVE-only di nascosto.

### B3 — Pipeline: cache sicura e verifiche riproducibili, senza tagliare i controlli

- **File/componente:** `.eleventy.js:79–96,251–285`, `scripts/genera-sfondi.cjs:15`, `scripts/verifica-performance.cjs:41–45,180`, `scripts/verifica-output.cjs:102–130`, `scripts/calcola-performance-browser.cjs`, `package.json`.
- **Attuale/evidenza:** **M** seconda catena completa 48,51 s; Eleventy 18,60 s, performance 9,23 s, territori 5,89 s. **S** l'output responsive viene cancellato a ogni nuovo processo; ogni originale riceve l'unione delle larghezze di tutti i profili. Gli sfondi disabilitano la cache. Performance ricomprime a Brotli 11 e rilegge metadata di risorse ripetute tra pagine.
- **Problema:** lavoro ripetibile potenzialmente evitabile; in parallelo mancano gate browser e budget. Il confronto degli URL con `reports/performance-baseline.json` è opzionale e il file non è versionato nella base: quel ramo è silenziosamente inattivo in un checkout pulito.
- **Beneficio teorico:** risparmiare parte dei circa 28 s di immagini/performance e impedire regressioni oggi invisibili. **Realistico:** da misurare; non è stato realizzato un prototipo di cache, quindi nessuna percentuale di accelerazione è dimostrata.
- **Rischio/complessità:** medio. Chiave di cache su contenuto originale, opzioni, profilo, orientamento e versioni sharp/encoder; cancellazioni e rinomine devono invalidare correttamente. Cache metadata limitata al processo è meno rischiosa di cache persistente.
- **Prima/dopo/regressioni:** fresh build e warm build, confronto output per hash e URL, modifica/rimozione originale e variazione di profilo; stessi errori sui dati invalidi. Misurare ogni fase.
- **Raccomandazione:** preservare una verifica completa; progettare un eventuale controllo rapido esplicito. Non parallelizzare territori con Eleventy. Budget proposti al §10, non implementati.

### B4 — Immagini: caricamento specialistico, DPR e dimensionamento vanno misurati separatamente

- **File/componente:** partial Starlink, Palantir e STR1; `frontiera.css:171–200`; profili di `.eleventy.js:30–60`.
- **Attuale/evidenza:** **M** PNG Starlink/STR1 e raster SVG Palantir sono richiesti prima dello scroll verso gli schemi. Lo sfondo mobile passa da **81,3 a 497,5 KiB** tra 1x e 2x; desktop da **254,9 a 1.079,3 KiB**. Per F/P desktop l'immagine inline è circa 318 px, con minima candidata 640 px; a DPR1 e DPR2 è stata selezionata la stessa 640.
- **Opportunità:** dopo A3, valutare rinvio delle scene lontane, candidate inline più piccole o ulteriori profili per sfondi. Un `<image>` SVG non acquisisce automaticamente la strategia dei `picture` editoriali.
- **Beneficio teorico:** riduzione del costo iniziale e, ridimensionando, del decode. **Realistico:** il lazy rinvia il trasferimento, non lo elimina quando si legge tutto; il risparmio dello sfondo interessa soprattutto visite senza cache. Non è stata provata una qualità equivalente di sfondi più piccoli.
- **Rischio/complessità:** medio-alto per reticoli, testo raster e sovrapposizioni; caricamento differito deve anticipare l'ingresso senza flash e conservare fallback senza JS.
- **Prima/dopo/regressioni:** rete lenta, entrata rapida nello schema, DPR1/2, landscape, crop/cover, testo nei raster e memoria; distinguere visita iniziale, lettura e lightbox.
- **Raccomandazione:** secondario rispetto al lossless; non ridurre risoluzione o qualità alla cieca.

### B5 — Font e stabilità P0: indagine mirata, non nuovo precaricamento generale

- **File/componente:** `base.njk` preload, `frontiera.css:18–30`, testata P0 e navigazione.
- **Attuale/evidenza:** **M** 6–7 font in home, 10 nell'articolo A2, 11 in F0/P0; 91,6–188,2 KiB di WOFF2. Archivo 700 è precaricato anche in archivio, 404 e ringraziamento, pur non risultando fra le facce effettivamente usate nei relativi snapshot; costa **14.508 byte**. **M** P0 desktop ha mostrato shift senza input pari a **0,07998** in tre visite fresche ripetute, con spostamenti di testata, foglio e nav; una prova separata non ha osservato shift.
- **Problema/opportunità:** preload non sempre necessario e sensibilità al caricamento dei font. **I** il font swap è un candidato alla causa di P0, coerente con lo spostamento anche della nav; non è una diagnosi esclusiva dimostrata.
- **Beneficio teorico:** meno competizione sul critical path e layout più stabile. **Realistico:** al più circa 14,2 KiB per le pagine senza uso del peso 700; beneficio CLS da confermare con trace e distribuzione dei casi.
- **Rischio/complessità:** medio; cambiare preload, metriche del fallback o famiglie può peggiorare il paint iniziale o alterare la tipografia.
- **Prima/dopo/regressioni:** avvii freddi ripetuti, font rallentati/negati, viewport P0, rete mobile, misure di shift con attribution. Controllare FOIT/FOUT, titoli, interruzioni di riga e caratteri italiani.
- **Raccomandazione:** conservare self-hosting e swap; non precaricare tutte le 11 facce. Solo intervento circoscritto dopo conferma.

### B6 — Minificazione in output, distinta dalla suddivisione del CSS

- **File/componente:** `src/css/frontiera.css` e futura pipeline asset.
- **Attuale/evidenza:** **M** 147.439 byte raw, 35.390 gzip9, 29.347 Brotli11. Rigenerando in memoria l'AST CSS senza commenti/spazi ridondanti: 108.340 raw e **20.817 gzip9**, circa **14,2 KiB** gzip in meno. **S** 29.466 byte sorgente sono commenti.
- **Opportunità:** ridurre payload mantenendo il sorgente leggibile e un solo foglio. La misura non prova ancora equivalenza visiva di un sistema di minificazione integrato.
- **Beneficio teorico/realistico:** circa -41% del gzip del foglio; vantaggio assoluto modesto rispetto ai raster specialistici e limitato dal riuso in cache.
- **Rischio/complessità:** basso-medio; nuovo passo e strumento da mantenere, eventuali trasformazioni CSS da delimitare.
- **Prima/dopo/regressioni:** compressione identica, visual diff per breakpoint/stato, forced colors, reduced motion e contratti che oggi leggono CSS come testo. Lasciare quei contratti sul sorgente se dipendono dalla sua forma.
- **Raccomandazione:** opportunità successiva, senza dividere il foglio e senza rimuovere la documentazione dal sorgente.

## 6. Risultati C — debito tecnico da registrare

### C1 — Documentazione operativa e natura dei verificatori

- **File/componente:** `README.md:28,275,357–359,427–446`, `scripts/verifica-territori.cjs:375–381`.
- **Attuale/evidenza:** **S/M** README descrive timeline come solo CSS e territori F1/F2/F4/F5 mancanti, ma ci sono controller mobile e sei master validati. La descrizione “nessuno stile aggiuntivo” del debito è superata dal CSS specialistico. **M** `verify:territori` riscrive anche `docs/cartina-territori/report-percentuali.md`; nell'export è l'unico file tracciato risultato diverso dopo la build.
- **Problema:** istruzioni fuorvianti e nome “verify” che nasconde scritture e generazione di input.
- **Beneficio teorico/realistico:** manutenzione più prevedibile; nessuna accelerazione o beneficio frontend immediato.
- **Rischio/complessità:** basso per documentare; medio se si separano generazione e verifica, perché il report alimenta le cartine.
- **Prima/dopo/regressioni:** walkthrough da checkout pulito e diff dopo i comandi. Conservare valori, attribuzioni e dipendenze dei dati.
- **Raccomandazione:** aggiornare istruzioni insieme ad A2; non eliminare il report territoriale perché sembra solo documentazione.

### C2 — Asset distribuiti senza riferimenti correnti

- **File/componente:** `src/immagini/meta/frontiera-og-home.png` (845.176 byte), `src/immagini/open-graph/frontiera-og-default.png` (818.203 byte), output responsive e passthrough.
- **Attuale/evidenza:** **M/S** i due PNG OG non hanno riferimenti nell'output o nei sorgenti attuali esaminati; il fallback corrente è il JPEG. Inoltre **60 derivate responsive / 6.709.442 byte** non sono referenziate dall'output testuale HTML/CSS/JS/XML/SVG/manifest. I profili generano più varianti di quelle emesse.
- **Problema/opportunità:** spazio di distribuzione e lavoro di generazione, non traffico di una visita ordinaria.
- **Beneficio teorico:** circa 1,59 MiB di copie OG e 6,40 MiB di derivate in meno nell'output. **Realistico:** spazio/trasferimento di deploy; zero risparmio diretto per il lettore che già non le richiede.
- **Rischio/complessità:** medio per eventuali URL pubblici già condivisi o usi futuri. Assenza di riferimenti interni non prova assenza di link esterni.
- **Prima/dopo/regressioni:** inventario raggiungibile, riferimenti social, generazione di nuove pagine/profili e richieste 404. Verificare eventuali log prima di ritirare URL pubblici.
- **Raccomandazione:** non cancellare automaticamente i master. Non includere nello stesso elenco lo sprite P: è letto e incorporato a build-time. La variante watermark dark è supportata dalla macro pur non comparendo nelle pagine correnti.

### C3 — Duplicazioni limitate, contratti testuali e piccole dipendenze dell'infobox contatti

- **File/componente:** `schema-kit.js`, `schema-palantir.js`, `schema-starlink.js`, `image-lightbox.js`, `infobox-mobile.js`, `base.njk`, verificatori output/schema, `infobox-tipo-4.njk:35,45–81`.
- **Attuale/evidenza:** **S** helper di timer/animazioni, inert e scroll lock sono parzialmente duplicati; la documentazione del kit conserva intenzionalmente i motori storici. Inclusioni e verificatori mantengono mappe di hook separate, alcune basate su classi letterali. **M** la pagina progetto richiede l'icona da `abs.twimg.com`; il collegamento testuale rimane indipendente dall'immagine. **S** un rifiuto della Clipboard API termina nel catch che aggiorna solo `title`, senza provare il fallback già disponibile per assenza dell'API.
- **Problema/opportunità:** rischio di divergenza futura e piccoli casi di errore; nessun guasto generalizzato misurato per questi helper.
- **Beneficio teorico/realistico:** minore manutenzione duplicata; beneficio immediato ridotto. L'icona esterna non è stata conteggiata come zero byte: i timing cross-origin ne nascondono le dimensioni.
- **Rischio/complessità:** medio-alto per estrarre un motore comune dagli overlay; basso per documentare dipendenza/errore. Un asset X locale richiederebbe una scelta esplicita di gestione del branding.
- **Prima/dopo/regressioni:** cancellazioni, chiusure durante animazioni, orientamento, errore clipboard, icona irraggiungibile e hook nelle nuove pagine.
- **Raccomandazione:** nessun refactoring trasversale ora. Migliorare questi punti quando si interviene sul componente interessato; non usare il numero di righe duplicate come criterio sufficiente.

## 7. Aree N — nessun intervento consigliato

### N1 — Non dividere automaticamente il CSS globale né applicare un purge generale

- **File/componente:** `frontiera.css`, fogli specialistici e layout base.
- **Attuale/evidenza:** **M** 828 regole e 3.447 dichiarazioni; nessuna dichiarazione identica ripetuta nella medesima regola nel controllo AST eseguito. Il globale comprende effettivamente home, mappe, profondità, navigazione e infobox. Le sezioni campionate sono quantificate al §8.
- **Opportunità esclusa:** estrazione per principio. Le media query sovrapposte implementano anche fallback, reduced motion, interazione touch e override; il solo ripetersi di un selettore non prova una duplicazione eliminabile.
- **Beneficio teorico/realistico:** qualche KiB per pagina; guadagno netto non dimostrato e richieste/cache più frammentate.
- **Rischio/complessità:** medio-alto, cascata e regole di fallback condivise.
- **Prima/dopo/regressioni:** eventuale futura estrazione deve dimostrare byte compressi netti e equivalenza di tutti gli stati. Non usare una coverage del primo viewport come prova di codice morto.
- **Raccomandazione:** mantenere la struttura; valutare separatamente B6. Candidati legacy come `.specs`, `.leadmedia`, `.schedabody` e `.nodo-*` meritano solo verifica contestuale. Le classi `aff--*` e `depth-*` generate dinamicamente non sono eliminabili tramite semplice ricerca testuale. Nessuna duplicazione significativa dei motori Starlink/Palantir/STR1 è stata individuata dentro il globale: i residui condivisi sono cornice e primitive.

### N2 — Conservare il caricamento dei moduli per presenza del componente

- **File/componente:** `base.njk:1–17`, tutti i 15 file JS e gli 8 CSS.
- **Attuale/evidenza:** **M/S** matrice al §8; nessun doppio caricamento esterno nei campioni, nessun errore JS nelle 36 visite di misura. I moduli più grandi hanno funzioni concrete; infobox mobile su desktop esce dal setup operativo dopo il controllo del breakpoint.
- **Opportunità esclusa:** bundler o code splitting interno generalizzato.
- **Beneficio teorico/realistico:** risparmi marginali; nessun vantaggio runtime dimostrato rispetto alla nuova gestione di dipendenze.
- **Rischio/complessità:** medio per ordinamento, fallback e lifecycle.
- **Prima/dopo/regressioni:** conteggio richieste e listener, assenza componente, resize, inizio/fine pagina e caricamento parziale.
- **Raccomandazione:** mantenere; estendere i controlli di corrispondenza agli hook ancora non coperti quando cambiano, senza centralizzazione opportunistica.

### N3 — Preservare lightbox e normale ciclo del dialog infobox

- **File/componente:** `image-lightbox.js/.css`, `infobox-mobile.js`, CSS infobox.
- **Attuale/evidenza:** **M** F0: Enter apre lightbox, focus sul comando chiusura, background inert, Tab resta nel dialog, Escape riporta al trigger con **delta scroll 0**. Originale richiesto solo all'apertura; errore dell'originale mantiene la 640 WebP valida. **M** infobox dopo attraversamento normale: apertura con Enter, focus sul pannello, Tab sulla chiusura, Escape riporta al trigger e a scrollY **2071**.
- **Opportunità esclusa:** semplificare eliminando gestione di stato, geometria o ripristino.
- **Beneficio teorico/realistico:** minori righe, nessun vantaggio per l'utente provato.
- **Rischio/complessità:** alto per gesti, tastiera, orientamento e scroll anchoring.
- **Prima/dopo/regressioni:** mantenere le prove reali di apertura/chiusura; pinch e VoiceOver/TalkBack richiedono dispositivi reali, non sono certificati da questo audit.
- **Raccomandazione:** nessun refactoring; correggere solo il caso di disponibilità A4. Le letture di geometria dopo scritture durante l'apertura non sono, da sole, prova di un costo dannoso durante lo scroll.

### N4 — Conservare cartografia e diagramma P a build-time

- **File/componente:** `src/_lib/cartina.js`, `diagramma-profondita.js`, dati e partial F/P.
- **Attuale/evidenza:** **M** sei istantanee territoriali validate; 23 luoghi e 116 coordinate del registro lineare; 86 controlli del motore P, 14 simboli, sette pagine P coerenti. I master territoriali arrivano a 10.739 vertici nella singola istantanea.
- **Opportunità esclusa:** motore client, semplificazione indiscriminata delle geometrie o rasterizzazione del diagramma P.
- **Beneficio teorico/realistico:** HTML potenzialmente minore, ma perdita di semantica o precisione; nessun bisogno dimostrato.
- **Rischio/complessità:** alto su dati editoriali, confini e significato.
- **Prima/dopo/regressioni:** contratti, percentuali, discontinuità dei vettori, etichette, descrizione accessibile e resa responsive.
- **Raccomandazione:** mantenere. A3 riguarda la sola immagine base, non altera alcuna geometria territoriale.

### N5 — Non ottimizzare micro-operazioni DOM senza un costo osservato

- **File/componente:** navigatore sezioni, timeline, cluster sistemi, debito, runtime schemi.
- **Attuale/evidenza:** **S** query iniziali prevalentemente memorizzate, guardie di presenza, rAF/debounce, observer e timer limitati alla funzione. La timeline alterna lettura del rect e scrittura di proprietà per card; il panel V1 misura dopo aver impostato larghezza. **M** nelle prove sintetiche di scroll del §8 il tempo script cumulativo è basso.
- **Opportunità esclusa:** sostituire automaticamente tutte le query, riunire tutti i listener o aggiungere cache geometriche.
- **Beneficio teorico/realistico:** ridurre possibili flush di stile; beneficio percepibile non dimostrato nel campione.
- **Rischio/complessità:** medio, cache obsolete dopo font/resize e cambiamenti alla fluidità.
- **Prima/dopo/regressioni:** trace attribuite al codice, scroll e interazioni su dispositivo lento, sospensione fuori viewport, animazioni in corso.
- **Raccomandazione:** registrare i punti sensibili, non refactor. Il piccolo callback rAF del V1 a panel chiuso esce prima delle letture di layout: non è una priorità.

## 8. Performance — misure e significato

### Metodo e limiti

Ambiente: Windows 10.0.26200, Intel i5-8250U, 8 processori logici, circa 7,89 GiB RAM; Node **24.16.0**, npm **11.13.0**, Eleventy **3.1.6**, Image **7.0.0**, sharp **0.35.4**. Browser: Chromium **151.0.7922.34**, Playwright **1.62.1** e axe-core **4.13.0**, verificati nell'ambiente di misura. Nessuna misura su smartphone fisico.

La skill web-perf richiedeva Chrome DevTools MCP, non disponibile. È stato quindi usato un harness temporaneo con Playwright, Resource Timing e CDP; nessun punteggio Lighthouse o trace della skill viene dichiarato.

**36 visite** con contesti nuovi: 11 URL a 390×844 e 1366×900/DPR1, più i sette URL principali a DPR2 su entrambe le viewport. Campionamento iniziale dopo load, font pronti e 1,5 s; **28 letture verticali** fino al fondo, a incrementi di una viewport, senza aprire overlay. La lettura verticale non forza tutti i pannelli orizzontali della home né tutte le slide; i relativi asset non richiesti restano fuori dal totale.

Server temporaneo su loopback con gzip6 per testo e cache max-age 3600: è un modello di laboratorio, **non** la configurazione del deployment. I totali qui sotto sono corpi delle risposte locali (`encodedBodySize`), includono HTML, CSS, JS, font e immagini; non includono header, TLS o costi della connessione. La prima visita è senza cache browser, ma non è una misura di cold disk/server.

`transferSize` e `encodedBodySize` non sono intercambiabili; zero su risorse cross-origin può derivare dalle restrizioni di osservazione, non da assenza di traffico. Nella pagina progetto il favicon X esterno non ha dimensioni osservabili. [MDN, PerformanceResourceTiming.transferSize](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize)

Il “decode” è **somma width × height × 4 dei raster richiesti**, deduplicati per URL: un ordine di grandezza delle superfici RGBA, non misura della memoria effettivamente residente, del picco RAM/GPU o del tempo di decodifica.

### Trasferimento iniziale osservato

| Pagina | 390 DPR1, KiB | 390 DPR2, KiB | 1366 DPR1, KiB | 1366 DPR2, KiB |
|---|---:|---:|---:|---:|
| Home | 325 | 983 | 1055 | 2443 |
| A2 Storm Shadow | 343 | 772 | 530 | 1354 |
| F0 Manovra fallita | 999 | 1498 | 1173 | 1997 |
| P0 Asimmetria iniziale | 368 | 793 | 541 | 1366 |
| STR1 Bombardamento | 1906 | 2327 | 2084 | 2908 |
| Starlink | 2379 | 2798 | 2555 | 3380 |
| Palantir | 1118 | 1537 | 1294 | 2124 |

In questi campioni lo scroll verticale non ha aggiunto risorse rispetto alla fotografia iniziale: le immagini prossime erano già richieste per la soglia di lazy loading e gli asset specialistici erano eager. **Non significa che ogni immagine del sito sia sempre scaricata**, né che lightbox, swipe e rotazione successiva siano gratuiti.

| Pagina | RGBA richiesti 390 DPR1, MiB | 390 DPR2 | 1366 DPR1 | 1366 DPR2 |
|---|---:|---:|---:|---:|
| Home | 7,06 | 32,76 | 29,00 | 73,54 |
| A2 | 4,38 | 16,01 | 9,86 | 33,59 |
| F0 | 14,01 | 25,85 | 18,40 | 42,13 |
| P0 | 4,39 | 16,04 | 8,79 | 32,52 |
| STR1 | 10,36 | 22,00 | 15,85 | 39,58 |
| Starlink | 10,87 | 22,41 | 16,25 | 39,98 |
| Palantir | 6,51 | 18,16 | 12,01 | 39,25 |

L'output complessivo è **350 file / 64.986.904 byte, circa 61,98 MiB**. È spazio distribuito, non visita. Lo snapshot statico home conta **12,40 MiB e 189,6 MiB di RGBA teorici**, sommando tutte le candidate: usarlo come budget di traffico produrrebbe una diagnosi errata.

### CSS e JS: costo compresso e matrice

Compressione per file in memoria: gzip livello 9 e Brotli qualità 11. Non sono tempi né rapporti garantiti del server.

| Asset | Raw KiB | gzip KiB | Brotli KiB |
|---|---:|---:|---:|
| frontiera.css | 143,98 | 34,56 | 28,66 |
| schema-starlink.css | 23,04 | 4,44 | 3,86 |
| schema-palantir.css | 10,59 | 2,56 | 2,19 |
| schema-kit.css | 6,04 | 1,72 | 1,46 |
| schema-str1.css | 8,83 | 2,23 | 1,87 |
| debito-integrazione.css | 19,12 | 4,92 | 4,31 |
| image-lightbox.css | 8,94 | 2,59 | 2,20 |
| affidabilita-v1.css | 7,90 | 2,15 | 1,79 |

Ripartizione descrittiva del globale: home circa **32,7 KiB raw / 8,4 gzip**, F e layout circa **15,8 / 4,6**, profondità P **15,8 / 4,9**, navigatore **14,4 / 4,3**. Le compressioni delle sezioni isolate **non sono sommabili** e non costituiscono il risparmio netto di una separazione. Alcuni intervalli includono primitive condivise.

| Modulo JS | gzip KiB | Funzione e giudizio |
|---|---:|---|
| menu-mobile | 0,46 | piccolo; problema di focus A1, non di peso |
| carosello | 1,46 | home; timer e semantica B1 |
| linea-temporale-mobile | 2,22 | due track home, rAF e guardia desktop; mantenere |
| sistemi-cluster-mobile | 2,48 | raggruppa nodi originali, debounce e cambio breakpoint; mantenere |
| filtro-archivio | 0,54 | scansione di poche card su click; A5 sullo stato |
| nav-sezioni | 8,82 | indice, focus, observer e rullino; A5, nessuno splitting ora |
| infobox-scroll | 1,91 | wheel non passive necessario a preventDefault, tastiera e bordi; mantenere |
| infobox-mobile | 4,53 | dialog solo mobile; A4 sul sentinel |
| image-lightbox | 9,01 | geometria, animazioni, gesti, fallback e focus; dimensione giustificata |
| affidabilita-v1 | 2,57 | event delegation, panel e geometria; B2 |
| schema-kit | 3,21 | primitive senza autoinizializzazione; solo STR1 attuale |
| schema-str1 | 6,03 | regia propria, rAF e cancellazione kit; mantenere |
| schema-starlink | 3,98 | observer distinti per i due sottoinsiemi; mantenere |
| schema-palantir | 6,63 | due schemi, WAAPI, cache locale profili del collo; mantenere |
| debito-integrazione | 0,93 | radio/CSS autonomi, reveal una volta e disconnect; non caricato nei campioni senza componente |

Abbreviazioni della matrice: M menù, C carosello, T timeline, S cluster Sistemi, F filtro, N navigatore, I scroll+mobile infobox, L lightbox, A affidabilità, K kit.

| Tipo pagina | CSS oltre al globale | JS esterno osservato | Totale JS gzip6 KiB |
|---|---|---|---:|
| Home | nessuno | M+C+T+S | 6,63 |
| Archivio | nessuno | M+F | 1,01 |
| Articolo A2 | A | M+N+I+A | 18,36 |
| F0/P0 | L+A | M+N+I+L+A | 27,39 |
| STR1 | K+STR1+A | M+N+K+STR1+I+A | 27,61 |
| Starlink | Starlink+A | M+N+Starlink+I+A | 22,34 |
| Palantir | Palantir+A | M+N+Palantir+I+A | 25,00 |
| Progetto | nessuno | M+N+I | 15,78 |
| 404 | nessuno | M | 0,46 |
| Ringraziamento sostegno | nessuno | nessuno | 0 |

La colonna JS esclude gli inline, che sono già inclusi nell'HTML trasferito. Sono stati osservati circa 370 elementi DOM in A2, fino a 719 in Palantir mobile; la home ne ha 405. Non emerge un DOM di dimensioni tale da giustificare una riscrittura.

### Paint, shift e lavoro runtime

La matrice loopback non rallentata ha LCP osservati nell'intervallo **72–732 ms**: non sono promesse di prestazione per lettori reali.

Prova aggiuntiva 390×844/DPR2, CPU rallentata 4×, latenza 150 ms, download 200.000 B/s, upload 93.750 B/s:

| Caso | Ripetizioni | LCP osservato | Shift senza input |
|---|---:|---|---:|
| Home | 3 | 1792 / 1804 / 1956 ms | circa 0,000065 |
| Starlink | 3 | 2600 / 2384 / 2560 ms | circa 0,001497 |
| P0 desktop, senza rallentamento | 3 | 336 / 320 / 340 ms | 0,079976 in tutti e tre |

Le prime due visite home si sono svolte mentre era attivo anche il calcolatore di compressione: sono riportate per trasparenza, **non usate per confronti fini o per una soglia automatica**. Starlink e P0 sono stati misurati successivamente. Il rapporto non presenta un INP di campo né un TBT Lighthouse. Gli shift sono somma degli eventi osservati senza input nel breve campione; non costituiscono una distribuzione CLS sul ciclo completo delle visite.

Core Web Vitals richiede una distinzione tra laboratorio e dati reali e valuta LCP, INP e CLS; questo audit non certifica il 75° percentile dei lettori. [Web.dev, Web Vitals](https://web.dev/articles/vitals)

Prove sintetiche di 120 passi sincronizzati a rAF, 390 px/reduced motion:

| Interazione | Script cumulativo | Layout cumulativo | Recalc style cumulativo |
|---|---:|---:|---:|
| Scorrimento track F della home | 1,96 ms | 2,84 ms | 17,91 ms |
| Scroll verticale F0, panel V1 chiuso | 4,89 ms | 1,13 ms | 8,83 ms |

Questi numeri CDP riguardano quei gesti sintetici: non certificano frame rate, GPU, pinch o inerzia touch. Non sostengono un refactoring urgente per layout thrashing.

### Compressione delle immagini, qualità e cache

| Gruppo PNG ricodificato in memoria | Prima byte | WebP lossless byte | Risparmio byte |
|---|---:|---:|---:|
| Scena principale Starlink | 2.047.557 | 1.266.196 | 781.361 |
| Tutti i 4 raster interni Starlink | 2.090.557 | 1.290.862 | 799.695 |
| 4 raster STR1 | 1.601.798 | 1.202.258 | 399.540 |
| 16 raster Palantir | 800.609 | 356.114 | 444.495 |
| Base cartografica | 495.127 | 180.530 | 314.597 |

La prima riga è inclusa nella seconda. Tutti i pixel visibili e alpha confrontati sono identici; per diversi file trasparenti differiscono solo valori RGB di pixel con alpha zero. Non sono state provate versioni ridimensionate o lossy e non è stata integrata alcuna derivata.

Controllo read-only del deployment: CSS e JS campionati sono serviti con **Brotli**, ETag e `Cache-Control: public, max-age=0, must-revalidate`. Il loro contenuto coincide con la base audit normalizzando CRLF/LF. Questo verifica due risorse, non identifica il commit dell'intero deployment. Il browser può riusare il corpo dopo rivalidazione; non è corretto assumere un download completo a ogni pagina né una cache immutable. **Non aumentare indiscriminatamente max-age dei file non versionati nel nome.**

## 9. Pipeline e verificatori

### Esiti

| Fase | Esito | Copertura significativa |
|---|---|---|
| npm ci | PASS | lockfile installato, 155 pacchetti; nessun aggiornamento del lock |
| font / assets:performance | PASS | 11 WOFF2 e due sfondi derivati |
| verify:schemi | PASS | sequenze, cancellazione, fixture e contratti kit/STR1 |
| verify:infobox | PASS | normalizzazione tipi 1–4, validi e invalidi |
| verify:infobox-mobile | PASS | funzioni pure e contratti testuali |
| verify:image-lightbox | PASS | geometria, pan, doppio tap, stati, scope F/P |
| verify:cartina | PASS | registro luoghi e coordinate |
| verify:territori | PASS | 6/6 master, report generati |
| verify:profondita | PASS | 86 controlli e 14 simboli |
| verify:affidabilita-v1:source | PASS | sidecar, scope, fixture, marker, contratti client |
| Eleventy e hook after | PASS | 28 file generati, di cui 25 HTML; sette P |
| verify:affidabilita-v1 | PASS | sorgenti nuovamente + output V1 e non V1 |
| verify:seo | PASS | nove famiglie, 23 canonical, sitemap/robots/404 |
| verify:favicon | PASS | 11 asset fondamentali e policy RSS |
| verify:output | PASS | 23 URL indicizzabili, 1227 riferimenti, 41 immagini responsive |
| verify:performance | PASS | 25 HTML, 350 file, nessun riferimento mancante |
| report:performance-browser | PASS con input fornito | 14 record DPR1; stima, non misuratore autonomo |
| npm start su export pulito | **FAIL riprodotto** | manca territori-report.json, A2 |

Nessun test esistente è stato alterato. Le verifiche browser aggiuntive hanno rilevato difetti pur con tutti i gate della build verdi.

### Tempi e dipendenze

Prima `npm run build`: **59,24 s** complessivi; Eleventy dichiara 19,11 s. Seconda esecuzione delle stesse 16 fasi, cronometrate singolarmente: **48,51 s** complessivi.

| Fase del secondo passaggio | Secondi |
|---|---:|
| font | 1,02 |
| sfondi | 1,95 |
| territori | 5,89 |
| Eleventy | 18,60 |
| output | 3,13 |
| performance | 9,23 |
| altre dieci fasi | 8,68 |

Sono due osservazioni, non medie statistiche né benchmark CI. Non usare la differenza tra le due come risparmio ottenuto.

- Font e sfondi precedono il passthrough; territori precede il rendering delle cartine. I verificatori sull'output devono attendere Eleventy.
- La doppia verifica V1 sorgenti è reale ma costa poco rispetto a immagini/performance e tutela due confini diversi.
- Output e performance visitano entrambi HTML e immagini; la sovrapposizione non rende inutile nessuno dei due.
- Le funzioni di normalizzazione P sono richiamate in validazione e rendering; il dato è piccolo e non emerge un collo di bottiglia.
- `serve` e `start` sono identici. La modalità di sviluppo non esegue la verifica completa; oltre al bootstrap A2, serve considerare la freschezza del report territoriale quando cambiano le geometrie.
- Non sono presenti workflow Actions versionati nella base esaminata; il README contiene un esempio, non una prova dell'esistenza di CI. Il collegamento esterno di Pages non è stato modificato o ispezionato via account.

### Lacune effettive

1. **Nessuna prova browser automatizzata nella build** per focus, tastiera, scroll saltato, stato realmente nascosto e guasti parziali. Molti assert cercano le parole `inert`, `ResizeObserver` o `aria-modal`: non ne dimostrano l'efficacia.
2. **Budget assenti:** performance fallisce sui mancanti, non su crescita di byte/decode/CPU.
3. **Baseline facoltativa assente da Git:** URL persi possono sfuggire al confronto storico se tutte le referenze verso di essi vengono rimosse.
4. **Mappe di asset incomplete:** output copre sette corrispondenze JS e quattro CSS; altri componenti sono coperti altrove o solo implicitamente. Includere un foglio non dimostra che ogni selettore sia corretto.
5. **Controlli HTML tramite regex:** IDs raccolti in Set non rilevano duplicati generici; riferimenti ARIA e stati non sono verificati globalmente. L'audit ha aggiunto un controllo sul DOM di 25 pagine × 2 larghezze: zero ID duplicati e zero riferimenti ARIA mancanti nei 50 snapshot.
6. **Browser report non autonomo:** richiede un JSON preliminare e stima DPR2 moltiplicando la candidata corrente. F0 desktop viene stimata con 1280 px, ma Chromium DPR2 richiede 640 px; mobile stima 1280 contro 960 reali. Differenza dell'universo immagini stimato F0 desktop: **1.893.013 contro 1.688.457 byte** osservati. In home il risultato dipende anche da quali immagini il collector include: nel test 1,68 MiB stimati mobile DPR2 contro circa 0,81 MiB di immagini effettivamente richieste. Non usarlo direttamente come gate di visita.
7. **Fonte degli originali responsive fragile per futuro markup:** `findEditorialImageUrls` cerca righe `file: /immagini/...` con regex, pur visitando anche JSON/JS. Non è un parser universale dei dati; varianti di sintassi possono non essere raccolte. Nessun caso corrente mancava.
8. **Contratti SEO campionati e alcune date hardcoded:** guardrail utili, ma una normale revisione editoriale può richiedere aggiornamento del test; non trasformare ogni variazione intenzionale in regressione tecnica.

## 10. Regression budget — valutazione, senza implementazione

**Utile, se piccolo e distinto per tipo di misura.** Un unico tetto “MiB della pagina” sarebbe ambiguo.

| Livello futuro | Metrica affidabile | Forma consigliata | Falsi positivi / limiti |
|---|---|---|---|
| Output deterministico | byte gzip/Brotli di CSS, JS esterno e HTML; asset presenti | snapshot versionato, encoder/versioni fissi, delta assoluto e relativo per famiglia | CRLF, cambio encoder, crescita editoriale legittima |
| Matrice componenti | hook ↔ script/CSS, unicità caricamento, defer | invarianti automatiche per tutte le pagine | ricerca di sottostringhe in commenti o contenuto |
| Browser rete | URL realmente richiesti, encodedBodySize, viewport/DPR fissi | contesto nuovo, fase iniziale/scroll/overlay separata | soglie lazy e scelta srcset possono cambiare col browser |
| Immagini/decode | dimensioni della candidata richiesta e RGBA teorici per URL unico | home, A2, F0, P0, STR1, Starlink, Palantir | RGBA non è RAM residente; asset a cache non sono nuovi byte |
| Interazione/accessibilità | focus, Escape, stato del trigger, ARIA, JS error/404 | pochi percorsi deterministici obbligatori | axe non prova UX, screen reader o tutti i contrasti |
| Tempi lab | mediane ripetute di LCP e attribution degli shift | segnalazione iniziale, hard gate solo dopo stabilizzazione del runner | rumore CPU, cache, browser e rete; non è INP di campo |

Metriche base già disponibili: globale 34,56 KiB gzip9; JS home 6,63 KiB gzip6; schede specialistiche 22–28 KiB circa di JS esterno gzip6. La differenza di impostazioni va eliminata prima di fissare una soglia unica.

Un futuro budget potrebbe versionare poche famiglie e relativi scenari, permettere un aggiornamento motivato della baseline, segnalare sia crescita in byte sia percentuale, e bloccare direttamente soltanto errori deterministici: duplicazioni, asset estranei, riferimenti rotti, focus perso, regressioni di stato. **Non sono proposti numeri di soglia arbitrari** prima di stabilire variabilità e intenzioni editoriali.

Il confronto degli URL deve avere una policy esplicita per nuove pagine, ritiri e redirect; se la baseline è obbligatoria, l'assenza non deve disabilitare il controllo in silenzio. I report operativi effimeri e le baseline versionate non dovrebbero condividere un significato indistinto.

## 11. Accessibilità e robustezza

**Eseguiti:** 50 snapshot DOM, 16 scansioni axe (otto pagine a due larghezze), prove di tastiera, reduced motion, no-JS, script esterni bloccati e fallimento dell'immagine lightbox. Nessuna modifica dei sorgenti per queste simulazioni.

- **Focus:** problemi confermati nel menù chiuso e nel carosello; outline CSS presenti. La presenza dell'outline non rende visibile un elemento traslato fuori viewport.
- **Menu aperto:** Tab dopo l'ultimo link entra nella pagina sottostante; sfondo non inert e scroll non bloccato. Non lo si classifica automaticamente come errore di dialog: il markup attuale è un aside. Se si vuole una modalità modale, occorre una scelta UX e un contratto completo.
- **Lightbox:** normale ciclo e fallback verificati; ritorno focus e scroll riusciti. Non sono stati simulati come prova conclusiva pinch e scroll su Safari mobile reale.
- **Infobox:** dialog normale adeguato; difetto distinto nel trigger dopo salto di scroll, A4.
- **Schemi:** Enter su AVANZA in Starlink, Palantir e STR1 aggiorna la lettura annunciabile; nel campione reduced motion zero animazioni attive nello schema. Le frecce dei tab sono presenti nel codice. Nessuna certificazione di tutti gli stati o dispositivi.
- **Affidabilità:** Escape restituisce il focus al trigger e richiude lo stato; bordi e fallback richiedono B2.
- **ARIA:** sei violazioni automatiche identiche sul rullino mobile, A5. Zero violazioni restituite nei campioni desktop non equivale ad accessibilità completa: axe ha lasciato numerosi contrasti “incomplete”, soprattutto su superfici complesse.
- **Contrasto:** il verificatore V1 controlla matematicamente quattro colori su due fondi, non tutti i pixel composti di blur/gradienti/immagini. Non sono dichiarati conformi tutti i contrasti del sito.
- **No-JS:** contenuto, link editoriali e navigazione footer rimangono disponibili; apparati interattivi non uniformemente degradati, B2.
- **Parziale fallimento JS:** la prima slide rimane visibile anche con script esterni bloccati; il lightbox non crea trigger senza il suo controller. Il burger e alcuni comandi invece rimangono presentati pur non operando.
- **Robustezza dati:** nessun riferimento mancante o dato invalido emerso nella build. Restano assunti futuri sulla forma dei marker/classi, freschezza delle cache in serve e report territoriali.
- **Fuori perimetro della prova:** screen reader reali, Safari/Firefox, contrasto visuale esaustivo, INP dei lettori, intero deployment e suoi header, errori di clipboard in dispositivi diversi.

L'unico test iniziale del dialog infobox che aveva tentato il focus dopo un salto diretto non è stato trattato come prova di dialog rotto: il successivo controllo dello stato ha isolato il difetto del sentinel e confermato il ciclo normale. Questa distinzione evita una diagnosi falsa.

## 12. Priorità consigliate — massimo cinque interventi futuri

| Ordine | Intervento | Valore | Difficoltà | Rischio | Misurabilità | Dipendenze |
|---|---|---|---|---|---|---|
| 1 | Menù: stato chiuso e ritorno focus (A1) | alto, accesso da tastiera su mobile e desktop | bassa | basso | percorso Tab/Escape ripetibile | chiarire solo eventuale modalità modale, separata |
| 2 | Bootstrap pulito e contratto Node (A2) | alto per nuovi checkout e manutenzione | bassa | basso | npm start/build da export pulito | generazione report territori, ambiente scelto |
| 3 | Due raster lossless prioritari (A3) | alto sui byte delle visite interessate | bassa-media | basso con pixel/visual QA | byte e identità pixel già misurati | riferimenti asset, browser supportati |
| 4 | Carosello: politica di pausa e focus (B1) | alto per lettura e tastiera | media | medio | focus oltre due rotazioni, test stati | decisione UX sul comando pausa |
| 5 | Richiamo infobox dopo salti (A4) | medio, affidabilità della funzione | bassa-media | basso-medio | End/Home/hash e macchina a stati | preservare observer, breakpoint e overlay |

A5 resta una correzione circoscritta candidata alla sessione di accessibilità. Cache, minificazione e budget sono opportunità documentate, **non un invito ad ampliare automaticamente il primo intervento**. Ogni intervento scelto dovrebbe aggiungere il controllo che avrebbe intercettato il problema.

## 13. Cose che NON consiglio di fare

1. Dividere `frontiera.css` solo perché il file sorgente supera 140 KiB.
2. Aggiungere un bundler/framework o rendere dinamico il sito per risparmiare pochi KiB.
3. Usare i 12,40 MiB statici della homepage come download di una visita o come budget di rete.
4. Usare l'attuale stima DPR2 del report browser come misura reale senza un collector e un contesto DPR2 effettivo.
5. Precaricare tutti i font o tutte le immagini; sostituire `swap` per nascondere il FOUT.
6. Abbassare DPR/qualità degli sfondi o rasterizzare/snellire le geometrie cartografiche senza prove di equivalenza.
7. Caricare gli originali del lightbox in anticipo o unificare i suoi stati con l'infobox per eliminare duplicazioni.
8. Rimuovere classi in base a un solo viewport, o cancellare lo sprite P perché non compare come URL di rete.
9. Eliminare controlli o eseguire in parallelo fasi con dipendenze reali per inseguire una build più breve.
10. Dare cache lunga immutable a URL CSS/JS che non cambiano nome col contenuto.
11. Riscrivere i motori Starlink e Palantir sul kit soltanto per uniformità.
12. Cambiare ABOVE-only, autoplay o fallback visibili senza una decisione UX esplicita.
13. Interpretare build verde, assenza di errori console o axe senza violazioni come garanzia di regressione zero.

**Conclusione operativa:** preservare l'architettura, intervenire su pochi comportamenti dimostrati e su byte realmente trasferiti. Tutte le correzioni rimangono da decidere e implementare in una sessione successiva.
