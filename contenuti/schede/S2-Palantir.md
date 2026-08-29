---
titolo: "Palantir"
slug: palantir
categoria: Sistemi
ruolo: "Lo strato che traduce dati in azione"
aggiornata: 2026-08-10
in_evidenza: false

immagine:
  file: /immagini/sistemi/s-palantir.png
  alt: "Logo Palantir Technologies nero su sfondo bianco"
  credito: "Palantir / Wikimedia Commons"
  licenza: "Pubblico dominio, marchio registrato"
  fit: contain

infobox:
  tipo: 3
  titolo: "Architettura del sistema"
  gruppi:
    - titolo: "Piattaforme Palantir"
      voci:
        - nome: "Gotham"
          descrizione: "Integrazione e impiego di dati per missioni di difesa e intelligence"
        - nome: "Foundry"
          descrizione: "Gestione dati, pipeline, analisi, applicazioni e Ontology"
        - nome: "Apollo"
          descrizione: "Distribuzione e aggiornamento continuo del software in ambienti differenti"
        - nome: "AIP"
          descrizione: "Connessione governata di modelli AI/LLM a dati e operazioni"

    - titolo: "Sviluppi ucraini"
      voci:
        - nome: "MetaConstellation"
          descrizione: "Orchestrazione di fonti geospaziali e satellitari commerciali"
        - nome: "PRISMA"
          descrizione: "Applicazione di pianificazione e coordinamento degli attacchi UAV a lungo raggio"
        - nome: "Brave1 Dataroom"
          descrizione: "Ambiente protetto per addestrare, provare e validare modelli di imprese ucraine"

---


## Il sistema che non si lascia indicare

**Aggiornamento:** 10 agosto 2026  
**Sezione:** Sistemi

In un comando dell’intelligence militare ucraina, una schermata riunisce le rotte percorse dai droni a lungo raggio, i punti nei quali sono stati intercettati, l’attività dei radar russi e gli esiti delle missioni precedenti. Gli operatori confrontano le traiettorie, cercano varchi nella difesa e preparano l’ondata successiva. Il sistema si chiama *PRISMA* e le ricostruzioni pubbliche lo identificano come un’applicazione Palantir {% aff "plausibile" %}.

Quale parte della scena è Palantir?

Non i satelliti e i droni che hanno prodotto i dati. Non la rete che li ha trasportati. Non l’ufficiale che autorizza la missione, né il vettore che raggiungerà il bersaglio. Palantir occupa lo spazio meno visibile fra questi elementi: acquisisce informazioni nate in sistemi differenti, le rende confrontabili, conserva le relazioni fra fonti ed eventi e presenta il risultato dentro una procedura sulla quale gli operatori possono agire.

È anche il motivo per cui il nome viene usato con significati diversi. Palantir è anzitutto l’azienda statunitense che sviluppa e sostiene il software. *Gotham*, *Foundry*, *Apollo* e *AIP* sono invece piattaforme: la prima orientata alle missioni di difesa e intelligence; la seconda a dati, applicazioni e processi; la terza alla distribuzione del software in ambienti differenti; la quarta al collegamento di modelli di intelligenza artificiale con dati e azioni governate.

Su questa base vengono costruiti oggetti di ordine diverso. *MetaConstellation* è una capacità geospaziale che permette di interrogare più fonti satellitari; PRISMA è un’applicazione operativa osservata in un comando ucraino; il *Brave1 Dataroom* è un ambiente congiunto, realizzato da istituzioni ucraine e Palantir sul software dell’azienda, nel quale soggetti autorizzati possono addestrare e validare modelli. Le fonti pubbliche non consentono di stabilire quale combinazione di Gotham, Foundry, Apollo e AIP sostenga ciascuna applicazione ucraina.

Le denominazioni non sono dunque intercambiabili. AIP non coincide con ogni forma di AI; Gotham non è il nome di qualunque applicazione militare; MetaConstellation non possiede i satelliti dai quali riceve immagini. Intelligence alleata, sensori ucraini, Starlink, DELTA, artiglieria, missili e droni d’attacco rimangono sistemi esterni anche quando scambiano dati o azioni con un’applicazione Palantir.

Il sistema effettivamente impiegato è dunque più ampio di un programma e più ristretto della macchina militare che lo utilizza. È un’**architettura socio-tecnica**: piattaforme, dati, infrastruttura, modelli, ingegneri, operatori e autorità configurati per un compito. Il codice produce capacità soltanto dentro questa composizione.

## Quando l’abbondanza diventa un problema

Palantir nasce nel 2003 nell’ambiente dell’intelligence e della difesa statunitense. Il problema originario non era semplicemente raccogliere più informazioni, ma collegare archivi separati senza perdere del tutto provenienza, restrizioni d’accesso e possibilità di ricostruire il percorso dell’analisi. La guerra in Ucraina porta lo stesso problema dentro un ambiente più rapido, distruttivo e adattivo.

Dal 2022 il teatro produce un volume eccezionale di immagini satellitari, video dei droni, tracce radar, coordinate, segnalazioni civili, rapporti, telemetria e valutazioni del danno. La scarsità non coincide più sempre con l’assenza di dati. Può consistere nel tempo necessario per capire che due fonti stanno descrivendo lo stesso oggetto; verificare quando siano state raccolte; stabilire chi possa vederle; trasformarle in un’ipotesi utilizzabile; registrare l’esito e riportarlo nella missione successiva.

È qui che opera la parte meno spettacolare e più importante del sistema.

Una catena di acquisizione — indicata in informatica come *pipeline* — riceve dati strutturati e non, converte formati e coordinate, sincronizza tempi, elimina duplicati e associa metadati. Palantir può quindi **rappresentare i record come oggetti comprensibili all’organizzazione**: un radar, una traiettoria, un’unità, una missione, un’area contaminata, una prova. L’insieme di oggetti, relazioni, azioni e regole prende il nome di *Ontology*.

L’*Ontology* non è una fotografia neutrale del mondo. Stabilisce **quali oggetti esistano per il sistema**, quali relazioni contino, quale incertezza sia mostrata e quali azioni possano seguire. Un radar osservato da un satellite e da un drone può diventare un unico oggetto con posizione, ultimo aggiornamento, fonti, livello di affidabilità e legami con una batteria antiaerea. Un utente autorizzato può esaminarlo; un altro può ricevere soltanto una parte dell’informazione; un comandante può decidere se assegnarlo a una missione. **Il software organizza la possibilità dell’azione, ma non si sostituisce agli attori che la producono.**

Sopra questa rappresentazione possono operare strumenti differenti: filtri e regole deterministiche, analisi geospaziale, modelli statistici, ottimizzazione, visione artificiale o assistenti basati su modelli linguistici. L’interfaccia restituisce mappe, grafi, elenchi, avvisi o applicazioni costruite per un compito specifico. Permessi, compartimentazione e registri delle operazioni consentono in teoria di combinare fonti commerciali, ucraine e alleate senza renderle tutte accessibili a chiunque.

La scomposizione funzionale essenziale è questa:

> **fonte → acquisizione → normalizzazione → oggetto e relazioni → analisi → presentazione → decisione → azione → esito → aggiornamento**

Palantir occupa soprattutto il tratto nel quale il dato diventa oggetto operativo e costruisce ponti verso la decisione; dopo la missione, l’esito può rientrare nella rappresentazione. La capacità portante non è quindi «analizzare grandi quantità di dati», ma ridurre il costo necessario perché informazioni eterogenee diventino **reciprocamente leggibili e operativamente traducibili**.

{% from "partials/schema-palantir.njk" import schemaPalantirQuadro, schemaPalantirCollo %}
{{ schemaPalantirQuadro({ id: "schema-palantir-quadro" }) }}

## Entrare nella guerra senza inventarne la macchina digitale

Il 2 giugno 2022 Alex Karp incontra Volodymyr Zelenskyj a Kyiv. La [presidenza ucraina](https://www.president.gov.ua/en/news/prezident-ukrayini-ta-seo-palantir-obgovorili-spivpracyu-v-s-75541) comunica che Palantir è pronta ad aprire un ufficio e a sviluppare soluzioni insieme a specialisti locali {% aff "confermato" %}. È una scelta coerente con l’identità industriale dell’azienda: difesa e intelligence non costituiscono un impiego laterale o imprevisto del prodotto, ma appartengono alla sua genesi.

Questo distingue l’ingresso di Palantir da quello di Starlink. La rete di SpaceX era un’infrastruttura commerciale civile assorbita dal dispositivo militare ucraino e successivamente sottoposta a limiti d’impiego, gestione geografica e contratti statali. Palantir entra apertamente nel teatro per sostenere funzioni di **sicurezza e combattimento**. “Apertura” indica qui una postura politico-industriale favorevole all’impiego militare occidentale: non codice aperto, accesso indiscriminato o assenza di licenze.

Nell’estate del 2022 l’azienda avvia il lavoro con personale ucraino; entro dicembre ricostruzioni giornalistiche descrivono software Palantir e *MetaConstellation* inseriti in catene di acquisizione dei bersagli {% aff "plausibile" %}. Il servizio geospaziale permette di interrogare più fornitori satellitari, selezionare le immagini pertinenti e collegarle a dati provenienti da droni, sensori, rapporti o segnalazioni. Non crea il satellite e non genera ogni immagine: riduce il costo necessario per capire quale fonte possa osservare un’area e trasformare il risultato in un oggetto utilizzabile.

Nel febbraio 2023 Karp afferma che Palantir è responsabile della “maggior parte del targeting” in Ucraina. [Reuters](https://www.reuters.com/technology/ukraine-is-using-palantirs-software-targeting-ceo-says-2023-02-02/) conferma la dichiarazione; le fonti aperte non consentono di verificarne la quota {% aff "non-verificato" %}. *Targeting* può indicare la produzione di un’ipotesi, la validazione delle coordinate, l’assegnazione dell’effettore o l’intero ciclo. La formula dimostra quanto centrale l’azienda considerasse il proprio ruolo, non permette di attribuirle una percentuale misurata dell’attività ucraina.

Le prime applicazioni mostrano già il nucleo della funzione: integrare immagini commerciali e governative, geolocalizzare possibili mezzi russi, presentarli a operatori e comandi e sostenerne l’assegnazione. Kyiv disponeva però di sistemi propri, competenze, reti di intelligence e procedure di fuoco: il software straniero entra in questa macchina e ne **riduce alcuni passaggi manuali**, non la crea.

La prima fase non va neppure riletta attraverso l’AI oggi associata al marchio. AIP viene lanciata nel 2023; nel 2022 il valore documentato deriva soprattutto da fusione dei dati, ricerca, geolocalizzazione, visualizzazione e organizzazione del lavoro. Retrodatare la piattaforma cancellerebbe proprio la trasformazione successiva.

## Dall’oggetto osservato alla missione successiva

Fra il 2023 e il 2024 la stessa architettura viene configurata per istituzioni e oggetti differenti. Palantir stipula un accordo con l’Ufficio del Procuratore generale ucraino per **collegare episodi, prove e unità russe nelle indagini sui crimini di guerra** {% aff "confermato" %}. Nello **sminamento**, dati sulla contaminazione, la popolazione, l’agricoltura, le infrastrutture e la disponibilità di squadre vengono combinati per proporre priorità e metodi {% aff "confermato" %}.

Il passaggio non è una digressione civile. Mostra la **portabilità della grammatica tecnica**. Nel targeting l’oggetto può essere un radar; nell’indagine, un episodio collegato a una formazione militare; nello sminamento, un’area da restituire all’uso. Cambiano le fonti, l’autorità, lo standard della decisione e ciò che conta come esito valido. Una correlazione utile a orientare un attacco, per esempio, non acquisisce per questo valore di prova giudiziaria.

Nel 2026 l’espansione assume una forma più direttamente legata alla nuova profondità ucraina. Il 12 maggio il ministro della Difesa Mykhailo Fedorov dichiara che la cooperazione con Palantir ha prodotto strumenti per l’analisi dettagliata degli attacchi aerei, il trattamento di grandi volumi d’intelligence e l’integrazione di tecnologie nella pianificazione degli attacchi in profondità {% aff "confermato" %}. Nelle settimane successive PRISMA viene osservata in un comando dell’intelligence militare dedicato agli attacchi con droni a lungo raggio {% aff "plausibile" %}.

La funzione mostrata è iterativa:

> **missioni precedenti → raccolta degli esiti → rappresentazione della difesa → alternative di rotta → nuova pianificazione**

Rotte, emissioni radar, punti d’intercettazione e valutazione del danno possono essere confrontati per cercare accessi differenti e comporre missioni successive. È una funzione particolarmente adatta alla campagna della [Fase 5](/fasi/macchina-prima-delluomo/), nella quale l’Ucraina tenta di collegare attacco intermedio, soppressione delle difese e pressione profonda dentro un ciclo più continuo. PRISMA può rendere più economico cercare e aggiornare una rotta e conservare la memoria delle missioni; la disponibilità dei vettori, la qualità dell’intelligence e la risposta della difesa russa continuano a determinare ciò che quella memoria permette di ottenere. Una finestra osservata in un comando, inoltre, non rivela quanti reparti usino l’applicazione, quali funzioni operino durante il volo o quanto essa pesi sul successo di uno specifico attacco.

## L’intelligenza artificiale, dentro il sistema

In una [recente intervista con Mathias Döpfner](https://www.youtube.com/watch?v=xm0rGvvxVOM), Karp ha condensato la propria dottrina tecnologica in una tesi radicale: **“Without AI systems, Russia would have won.”** La frase enuncia una tesi causale forte; le fonti aperte non consentono di misurare separatamente il peso dell’AI dal dispositivo di dati, reti, intelligence, ingegneri, comandi, sensori ed effettori nel quale opera.

L’intelligenza artificiale non occupa un solo punto della catena. Un modello di visione artificiale può classificare un’immagine; un sistema statistico può correlare eventi; un algoritmo di ottimizzazione può confrontare rotte o priorità; un modello linguistico collegato attraverso AIP può interrogare dati e assistere un operatore. Queste funzioni non sono equivalenti e nessuna coincide da sola con Palantir.

Il valore del modello compare quando viene inserito in un’applicazione con dati pertinenti, obiettivi, vincoli, permessi e possibilità d’azione. Nell’intervista a [UNITED24 Media](https://united24media.com/interview/palantirs-ai-vision-meets-its-strongest-test-in-ukraine-interview-with-ceo-alex-karp-18727), Karp insiste proprio su questa composizione: un modello non può essere semplicemente sovrapposto a un ambiente complesso; deve sapere chi vede che cosa, ricevere feedback e lasciare agli esseri umani la possibilità di interrompere l’azione fino all’ultimo momento. Nella stessa intervista attribuisce a Palantir una parte rilevante, ma parziale, del sistema ucraino: una quota ampia sarebbe stata costruita dagli stessi ucraini {% aff "confermato" %}.

Il *Brave1 Dataroom* rende visibile il passaggio più recente. Il 21 gennaio 2026 il Ministero della Difesa, il Ministero della Trasformazione digitale, le Forze armate, un istituto di ricerca dell’intelligence militare e Palantir lanciano un **ambiente protetto per addestrare, provare e validare modelli militari {% aff "confermato" %}**. Costruito su software Palantir, il Dataroom contiene dataset visivi e termici strutturati di bersagli aerei — compresi gli Shahed — ricavati da materiali raccolti in condizioni reali. Le imprese ucraine autorizzate possono sviluppare modelli per rilevamento, classificazione, tracciamento e intercettazione autonoma. Nel giugno 2026 il [Ministero della Difesa ucraino](https://mod.gov.ua/news/ponad-100-ukrainskykh-kompanii-uzhe-trenuiut-shi-na-danykh-brave1-dataroom) dichiarava che più di cento aziende avevano già ottenuto accesso {% aff "confermato" %}.

Il Dataroom non è un’arma autonoma e non prova che ogni modello addestrato venga schierato. È l’**infrastruttura intermedia fra esperienza grezza e capacità candidata**: raccoglie i dati, ne governa l’accesso, rende possibili test comuni e permette a soggetti ucraini di costruire strumenti propri. L’Ucraina produce il dato, seleziona gli sviluppatori, definisce il bisogno e decide l’eventuale integrazione; Palantir fornisce e sviluppa con i partner l’ambiente nel quale questo lavoro può avvenire.

PRISMA e Dataroom descrivono due versi dello stesso ciclo.
- La prima riporta i risultati delle missioni dentro la pianificazione
- Il secondo trasforma il patrimonio prodotto dalla guerra in materiale per addestrare e verificare nuovi modelli. 

L’AI diventa operativamente significativa non quando elimina l’organizzazione, ma quando l’organizzazione riesce a costruirle attorno dati, feedback e autorità.

## Starlink rende raggiungibile, Palantir rende traducibile

Starlink e Palantir sono entrambe infrastrutture abilitanti, ma appartengono a strati differenti.

- Starlink trasporta video, coordinate, mappe e ordini fra attori fisicamente separati. Riduce il **costo informativo della distanza** ([Starlink](/schede/starlink/#schema-starlink)) e permette a osservatore, decisore ed effettore di operare dispersi. 
- Palantir affronta un problema distinto, spesso collocato a valle della connettività: riduce il **costo organizzativo della traduzione** fra dati, utenti e procedure. La rete può funzionare perfettamente mentre il quadro operativo è errato; la piattaforma può essere disponibile mentre il collegamento necessario a ricevere un dato tempestivo viene meno.

Come scomposizione funzionale — non come percorso obbligatorio di ogni missione — la distinzione può essere resa in forma essenziale:

> **Starlink rende raggiungibile → Palantir rende integrabile e azionabile → i sistemi ucraini distribuiscono e comandano → le unità eseguono**

Alcuni dati possono passare da DELTA, altri da applicazioni Palantir, altri ancora da catene separate. DELTA resta un sistema ucraino di consapevolezza situazionale e gestione operativa, non una componente o un’interfaccia posseduta da Palantir. Kropyva e altri strumenti vicini all’unità di fuoco traducono coordinate e richieste in procedure d’ingaggio. La topologia effettiva delle integrazioni non è pubblica.

Anche la **dipendenza dal fornitore** assume forme diverse. Nel caso Starlink sono documentati geofencing, mancata attivazione, condizioni d’accesso e whitelist: il terminale può restare intatto mentre il servizio non è autorizzato. Palantir dichiara invece di poter distribuire le proprie piattaforme in cloud del cliente, reti isolate e nodi periferici. Non esiste documentazione pubblica di un veto di missione o di un “interruttore” usato contro l’Ucraina.

Questo non rende la seconda architettura indipendente. Licenze, componenti proprietarie, aggiornamenti di sicurezza, personale specializzato e conoscenza incorporata nelle integrazioni possono diventare forme di dipendenza anche quando i server sono controllati dal cliente. Karp sostiene che gran parte del codice operativo sia scritto e governato dagli ucraini e che Palantir non acceda ai dati; configurazione, accessi amministrativi, condizioni contrattuali e portabilità completa non sono pubblicamente verificabili {% aff "non-verificato" %}.

La sovranità non è quindi una proprietà binaria. Può essere maggiore sui dati e minore sugli aggiornamenti; forte sul codice applicativo e più debole sui componenti di base; sufficiente a continuare una missione e insufficiente a sostituire rapidamente l’intera composizione. Palantir non appare insostituibile in ogni funzione. Può diventare difficile da rimuovere come insieme già operativo di pipeline, permessi, applicazioni, addestramento e memoria organizzativa.

## Negare la traduzione senza spegnere il software

**Una piattaforma di fusione non conferisce qualità agli input.** Un’immagine vecchia, una coordinata errata o un rapporto manipolato possono diventare un oggetto molto leggibile e ugualmente falso. **Quando Palantir riduce il costo della ricerca, il collo di bottiglia si sposta**: trovare più bersagli o correlazioni aumenta il bisogno di validatori, autorità, munizioni, intercettori, squadre e capacità di verificare gli esiti.

{{ schemaPalantirCollo({ id: "schema-palantir-collo" }) }}

La Russia può degradare la funzione senza attaccare direttamente Palantir. La distruzione o il disturbo dei droni che producono il dato, la disciplina delle emissioni, la mobilità di radar e comandi, l’impiego di esche e il camuffamento sono pratiche osservate nel teatro. Lo stesso vale per gli attacchi contro reti, energia e nodi umani. Non occorre che siano diretti contro un’installazione Palantir: basta che impoveriscano o ritardino ciò che la piattaforma riceve.

Altri rischi appartengono all’architettura ma non sono documentati come attacchi riusciti contro le installazioni ucraine di Palantir. Credenziali rubate, endpoint compromessi, alterazione delle pipeline, dati avvelenati, aggiornamenti corrotti o la saturazione delle fonti con segnali contraddittori potrebbero esporre missioni e fonti oppure costruire oggetti falsi. Un’*Ontology* non aggiornata può continuare a descrivere correttamente la guerra precedente mentre l’avversario ha già cambiato nomi, procedure e mezzi. Un modello accurato in media può fallire nella condizione nuova; un’interfaccia troppo persuasiva può indurre l’operatore ad accettare una raccomandazione soltanto perché appare coerente.

La difesa richiede dunque provenienza visibile, livelli di confidenza, accesso alle fonti, registrazione degli errori, test su dati recenti e possibilità effettiva di contestare o arrestare la procedura. Richiede anche ingegneri ed esperti di dominio capaci di modificare connettori, categorie e permessi alla velocità con cui cambia il campo. Se l’avversario si adatta più rapidamente della rappresentazione, il sistema non perde necessariamente disponibilità: perde aderenza.

È il modo caratteristico del suo guasto. Starlink può smettere di collegare due nodi mentre entrambi conservano dati e applicazioni. Palantir può continuare a presentare mappe e flussi di lavoro mentre la relazione fra rappresentazione e realtà è già degradata.

## Uno strato di sistema di sistemi

La traiettoria ucraina di Palantir non consiste in una crescita lineare della quantità di AI. Nel 2022 il software entra per rendere utilizzabili fonti già disponibili e sostenere il targeting; nel 2026 PRISMA e Brave1 Dataroom mostrano due sviluppi ulteriori: un’applicazione che conserva la memoria delle missioni e un ambiente nel quale quella prodotta dalla guerra può addestrare nuovi modelli.

Palantir opera come **strato di un sistema di sistemi**: non perché possieda i sensori, prenda la decisione o produca l’effetto, ma perché rende più economico e rapido far parlare fra loro gli elementi che li producono. Starlink separa nello spazio osservatore, decisore ed effettore senza interromperne il collegamento; Palantir tenta di riunire logicamente dati, oggetti e procedure senza assorbirne la proprietà.

---

## Fonti essenziali

- [Presidenza ucraina — primo incontro Zelenskyj–Karp e cooperazione nel settore difesa, 2 giugno 2022](https://www.president.gov.ua/en/news/prezident-ukrayini-ta-seo-palantir-obgovorili-spivpracyu-v-s-75541)
- [Reuters — dichiarazione di Karp sul ruolo di Palantir nel targeting, 1 febbraio 2023](https://www.reuters.com/technology/ukraine-is-using-palantirs-software-targeting-ceo-says-2023-02-02/)
- [TIME — implementazione di Palantir e delle altre imprese tecnologiche in Ucraina, 8 febbraio 2024](https://time.com/6691662/ai-ukraine-war-palantir/)
- [Ministero dell’Economia ucraino — accordo Palantir per lo sminamento, 3 marzo 2024](https://me.gov.ua/News/Detail/2e35612d-f83a-43af-bcd7-185b90c695c0?lang=en-GB&showMenuTree=true&title=AutomationOfDeminingProcessesAndTheUseOfAi-TheMinistryOfEconomySignsAPartnershipAgreementWithPalantir)
- [Carnegie Endowment — imprese tecnologiche private, Stato e sovranità nell’esperienza ucraina, 1 dicembre 2025](https://carnegieendowment.org/research/2025/12/ukraine-war-tech-companies)
- [Ministero della Difesa ucraino — lancio di Brave1 Dataroom, 21 gennaio 2026](https://mod.gov.ua/en/news/ministry-of-defence-launches-brave1-dataroom-a-secure-environment-for-training-military-ai-solutions)
- [Presidenza ucraina — incontro Zelenskyj–Karp, 12 maggio 2026](https://www.president.gov.ua/en/news/prezident-zustrivsya-iz-ceo-kompaniyi-palantir-104349)
- [Reuters — ampliamento della cooperazione su AI, intelligence e deep strike, 12 maggio 2026](https://www.reuters.com/world/europe/zelenskiy-meets-palantir-ceo-ukraine-expands-use-ai-war-2026-05-12/)
- [UNITED24 Media — intervista ad Alex Karp su integrazione, feedback e ruolo ucraino, 12 maggio 2026](https://united24media.com/interview/palantirs-ai-vision-meets-its-strongest-test-in-ukraine-interview-with-ceo-alex-karp-18727)
- [MD Meets — intervista di Mathias Döpfner ad Alex Karp sulla dottrina tecnologica di Palantir](https://www.youtube.com/watch?v=xm0rGvvxVOM)
- [UNITED24 Media — ricostruzione del servizio CNN su PRISMA, 1 giugno 2026](https://united24media.com/war-in-ukraine/inside-ukraines-palantir-powered-ai-war-room-guiding-drone-strikes-deep-into-russia-19356)
- [Ministero della Difesa ucraino — oltre cento imprese nel Brave1 Dataroom, 11 giugno 2026](https://mod.gov.ua/news/ponad-100-ukrainskykh-kompanii-uzhe-trenuiut-shi-na-danykh-brave1-dataroom)
- [Palantir Technologies — Form 10-K 2025, piattaforme e architettura dichiarata](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm)
