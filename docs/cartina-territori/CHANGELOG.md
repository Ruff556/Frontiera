# Bonifica del confronto percentuale F0–F2

Data: 25 agosto 2026.

- mantenute inalterate tutte le percentuali pubblicate in F1/F2 e tutte le
  geometrie territoriali;
- rimossi dal validatore i riferimenti percentuali F0, assenti dalla scheda e
  quindi privi di un corrispettivo editoriale pubblicato;
- separate intersezione spaziale e denominatore: i confini geoBoundaries ADM1
  delimitano l'intersezione, mentre il calcolo percentuale usa superfici
  amministrative terrestri documentate in un file dati dedicato;
- aggiunti al report l'area del confine ADM1 e il relativo scarto rispetto alla
  superficie amministrativa, così le estensioni marittime rimangono visibili
  senza generare falsi avvisi editoriali;
- definita una tolleranza ordinaria di ±2 punti percentuali e una tolleranza
  documentata di ±5 punti per Kherson, dove la stima pubblica ≈72% adotta un
  criterio più ampio del master conservativo Frontiera;
- ripristinata per F1/F2 la precedenza del testo `datiTerritoriali` già
  approvato: il riepilogo geometrico rimane un controllo di QA e non sostituisce
  le percentuali editoriali;
- aggiornati report, metodo, validazione e rapporto pre-pubblicazione.

---

# Changelog — prototipi territoriali F0/F3

Data: 20 luglio 2026.

## Motore

- introdotto archivio GeoJSON territoriale separato da `cartinaLinee.json`;
- aggiunto rendering build-time di `Polygon`/`MultiPolygon` nello stesso SVG di base e hotspot;
- aggiunti pattern distinti rosso-mattone, azzurro-grigio e grigio conteso;
- aggiunte legenda e descrizione accessibile ricavate automaticamente dalle categorie presenti;
- isolato il fallback legacy alle sole Fasi 1, 2, 4 e 5;
- aggiunta modalità `CARTINA_DEBUG=1` senza JavaScript lato client.

## Dati

- aggiunti master F0 (24-03-2022) e F3 (14-08-2024);
- aggiunti confini geoBoundaries UKR ADM1 e metadati per il calcolo per oblast;
- mantenute inalterate la proiezione, `cartinaLuoghi.json` e le coordinate dei luoghi;
- nessun poligono è derivato dalle precedenti linee di contatto.

## Verifica

- aggiunto `npm run verify:territori` con errori bloccanti per struttura/topologia;
- corretta la formula geodetica degli anelli: il precedente indice del vertice inferiore dimezzava approssimativamente l'area;
- prodotti `reports/territori-report.json` e `docs/cartina-territori/report-percentuali.md`;
- gli scarti editoriali restano avvisi espliciti e non modificano automaticamente le geometrie.

## Ambito non modificato

Nessun dataset definitivo è stato creato per Fasi 1, 2, 4 e 5. Contenuti editoriali, base amministrativa, coordinate degli hotspot e responsive design generale non sono stati ridisegnati.

---

# Estensione alle Fasi 1, 2, 4 e 5

Data: 20 luglio 2026.

## Motore

- aggiunto `scripts/importa-territori.mjs`: import di digitalizzazioni GIS con riparazione topologica (chiusura, deduplica, rimozione delle degenerazioni e delle punte a larghezza nulla, orientamento degli anelli), dissoluzione, separazione delle categorie per precedenza e ritaglio opzionale sul confine nazionale;
- aggiunta la categoria d'ingresso `conteso` accanto a `pre-2022`, `post-2022` e `ucraino-in-russia`;
- aggiunto il comando `npm run import:territori`;
- confermato per l'import il vincolo dei master F0/F3: nessun arrotondamento delle coordinate a valle delle operazioni booleane. In collaudo l'arrotondamento a otto decimali ha fatto collassare vertici quasi coincidenti fino a interrompere il validatore nella sweepline di `polygon-clipping`.

## Dati

- nessuna geometria è stata creata, dedotta o interpolata: le quattro istantanee restano da digitalizzare su cartografia datata;
- `metadata.json` dichiara le quattro istantanee previste con stato esplicito, generatore e fallback attivo;
- il fallback della linea di contatto è ora dichiarato come stato transitorio, non come scelta per fase.

## Verifica

- `verify:territori` confronta le istantanee presenti con quelle previste ed emette un avviso `MANCANTE` per ciascuna fase ancora priva di master;
- aggiunti i riferimenti editoriali per oblast di F1 e F2, ricavati dal front matter e usati **solo** come controllo a valle;
- estesa la coerenza front matter/dataset alle sei fasi;
- pipeline d'import collaudata end-to-end su una fixture sintetica, poi rimossa: nessun dato di collaudo è entrato nei master.

## Contenuti

- la Fase 5, che non aveva cartina, ha ora un blocco `cartina` completo con data di riferimento, quattro hotspot e linea di contatto;
- le Fasi 1, 2, 4 e 5 contengono il blocco `territori` già scritto come commento, pronto a sostituire `lineaContatto`.

## Blocco dichiarato

Le geometrie di F1, F2, F4 e F5 non sono state prodotte: le esportazioni storiche autorizzate non sono nel repository e l'ambiente di build non ha accesso di rete verso archivi cartografici. Fonti, criteri e punti critici per ciascuna data sono in `DIGITALIZZAZIONE-F1-F2-F4-F5.md`.

---

# Completamento cartografico F1/F2/F4/F5

Data: 20 luglio 2026.

## Dati

- aggiunte le revisioni territoriali del 13-11-2022, 30-09-2023,
  13-03-2025 e 15-07-2026 da revisioni GeoJSON storiche DeepStateMap precise e
  datate, controllate su ISW/CTP e VIINA 2.0;
- separati controllo russo pre-2022, controllo russo post-2022, stato conteso e
  controllo ucraino in Russia;
- esclusi raid, infiltrazioni, presenze discontinue e massime rivendicate;
- conservato senza modifiche il perimetro pre-2022 già approvato in F3;
- aggiunte le digitalizzazioni riproducibili in
  `data-sources/cartina-territori/digitalizzazioni/`.

## Integrazione

- importati i quattro master con `scripts/importa-territori.mjs`;
- attivati i blocchi `territori` e rimossi i fallback `lineaContatto` soltanto
  dopo importazione e validazione;
- rimossi da `cartinaLinee.json` i dataset legacy F1/F2/F4/F5 e la fixture
  provvisoria `fase-4-test-locale`, conservando le voci F0/F3;
- aggiornato `metadata.json` a sei master presenti;
- nessuna modifica a motore, proiezione, renderer, CSS, hotspot,
  `cartinaLuoghi.json`, F0 o F3.

## Verifica

- `verify:cartina`: OK;
- `verify:territori`: OK, 6/6 istantanee;
- `npm run build`: OK;
- prodotti report per oblast, note d'incertezza e screenshot desktop/mobile
  delle quattro nuove cartine.

---

# Rifiniture percentuali e watermark

Data: 21 luglio 2026.

- esteso a F0–F5 il riepilogo percentuale degli oblast rilevanti;
- il testo è ora generato automaticamente da `reports/territori-report.json`,
  aggiornato da `verify:territori`, senza valori duplicati nel front matter;
- aggiunto dentro l'SVG un watermark vettoriale testuale `Frontiera`, privo di
  sfondo, con gli stessi Archivo 800, spaziatura e colori del marchio originale;
- applicata opacità uniforme moderata al solo gruppo di lettere;
- nessuna modifica a geometrie, proiezione, hotspot o resa territoriale.
