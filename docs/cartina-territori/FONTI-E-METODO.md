# Fonti e metodo dei master territoriali

## Criterio cartografico

“Controllo” indica una presenza territoriale continua e ragionevolmente consolidata. Sono escluse le sole direttrici d'avanzata, le sortite isolate e le massime estensioni rivendicate senza continuità. Non è stata costruita una fascia contesa uniforme e non sono state chiuse le precedenti linee di contatto.

I master sono in WGS84. I perimetri sono stati dissolti e ritagliati sui confini internazionalmente riconosciuti dell'Ucraina quando appartengono alla categoria russa; Kursk resta invece nel territorio della Federazione Russa.

## Fase 0 — 24 marzo 2022

Fonte principale: ricostruzione storica Frontiera dalle geometrie visuali DeepStateMap presenti nella prima revisione pubblica del 3 aprile 2022. Lo stato al 24 marzo è stato ricostruito sommando alle aree ancora occupate le aree dichiarate liberate dopo il 24 marzo ed escludendo quelle liberate entro quella data.

Verifiche visuali:

- ISW/CTP, *Russian Offensive Campaign Assessment*, 24 marzo 2022;
- ISW/CTP, carta nazionale del 25 marzo 2022, usata a distanza di un giorno per salienti, discontinuità e fronte meridionale;
- VIINA 2.0, stato giornaliero dei centri abitati, come controllo indipendente e non come superficie primaria.

Il margine d'incertezza maggiore riguarda i salienti settentrionali in ripiegamento. F0 non pubblica percentuali territoriali: il master è quindi valutato per fonti, data, topologia e coerenza visuale, senza confrontarlo con riferimenti numerici non presenti nella scheda.

## Fase 3 — 14 agosto 2024

Fonte principale: ridigitalizzazione Frontiera della revisione visuale DeepStateMap del 14 agosto 2024, con distinzione fra Crimea/Donbas pre-2022 e controllo acquisito dopo il 24 febbraio 2022.

Il perimetro ucraino a Kursk è conservativo ed è stato controllato sulla carta ISW/CTP delle 15:00 ET del 14 agosto. Le propaggini mostrate da ISW soltanto come limite rivendicato dell'avanzata non sono incluse.

## Condizioni d'uso e attribuzione

| Fonte | Ruolo | Condizione annotata |
|---|---|---|
| DeepStateMap | perimetri visuali principali | materiali visuali riutilizzabili con riferimento/logo/link; esportazioni API originarie non distribuite |
| ISW / CTP | verifica visuale e Kursk | attribuzione secondo la policy di fair use ISW |
| VIINA 2.0 | verifica indipendente giornaliera | ODbL 1.0 |
| geoBoundaries UKR ADM1 | intersezione spaziale per oblast | ODbL 1.0, come indicato nei metadati allegati |
| Decentralization in Ukraine | superfici amministrative terrestri usate come denominatore percentuale | CC BY 4.0, come indicato dal portale |

Collegamenti:

- https://deepstatemap.live/en
- https://understandingwar.org/map/assessed-control-of-terrain-in-ukraine-and-main-russian-maneuver-axes-as-of-march-24-2022-300-pm-et/
- https://understandingwar.org/map/ukrainian-incursion-into-kursk-oblast-as-of-august-14-2024-300-pm-et/
- https://github.com/zhukovyuri/VIINA
- https://www.geoboundaries.org/
- https://decentralization.gov.ua/state

## Fasi 1, 2, 4 e 5 — fonte vettoriale

Le quattro istantanee usano revisioni pubbliche dell'archivio storico
DeepStateMap, identificate da ID e timestamp UTC. Il dataset distribuito nella
build non è una copia integrale della revisione: contiene soltanto le geometrie
territoriali selezionate, separate per categoria, normalizzate e ritagliate
secondo il criterio Frontiera.

| Fase | Revisione | Timestamp UTC | URL |
|---|---:|---|---|
| F1 | `1668381004` | 2022-11-13 23:10:04 | <https://deepstatemap.live/api/history/1668381004/geojson> |
| F2 | `1696066231` | 2023-09-30 09:30:31 | <https://deepstatemap.live/api/history/1696066231/geojson> |
| F4 | `1741873398` | 2025-03-13 13:43:18 | <https://deepstatemap.live/api/history/1741873398/geojson> |
| F5 | `1784114834` | 2026-07-15 11:27:14 | <https://deepstatemap.live/api/history/1784114834/geojson> |

Verifiche coeve:

- F1: ISW, *Russian Offensive Campaign Assessment*, 13 novembre 2022;
- F2: ISW, *Assessed Control of Terrain in Ukraine*, 30 settembre 2023;
- F4: ISW/CTP, assessment nazionale e carta della direzione Kursk,
  13 marzo 2025;
- F5: ISW, *Assessed Control of Terrain in the Russo-Ukrainian War*,
  15 luglio 2026;
- tutte le fasi: VIINA 2.0 come controllo indipendente giornaliero dei centri
  abitati; NZZ/Liveuamap come riscontro secondario per F1/F2.

## Percentuali editoriali e controllo geometrico

Le percentuali mostrate nelle schede F1/F2 sono stime editoriali arrotondate,
indipendenti dai master territoriali. Il validatore non le usa per costruire,
correggere o deformare i poligoni.

Quando il report trova riferimenti editoriali verificati, il riepilogo
pubblicato usa il testo `datiTerritoriali` della scheda. Il valore calcolato
dalla geometria rimane disponibile nel report di QA e non scavalca la scelta
editoriale. F0, priva di riferimenti pubblicati, continua invece a mostrare un
riepilogo geometrico automatico.

Il controllo quantitativo distingue due funzioni:

1. i confini ADM1 geoBoundaries delimitano l'intersezione spaziale;
2. le superfici amministrative terrestri pubblicate dal portale
   Decentralization in Ukraine costituiscono il denominatore percentuale.

La distinzione è necessaria perché il dataset ADM1 incorpora estensioni
marittime in diversi oblast costieri. Usarne direttamente l'area totale
produceva falsi scarti, soprattutto per Donetsk, Zaporizhia e Kherson.

Per F2 esiste inoltre un riscontro pubblico di fine autunno 2023: il colonnello
Jevhen Sas'ko, capo dell'ufficio comunicazioni strategiche dell'apparato del
comandante in capo ucraino, indicava Luhansk 98%, Zaporizhia 73%, Kherson 72%,
Donetsk 57% e Kharkiv 2%, con 20.500 km² occupati nella regione di Kherson.
Fonte: <https://glavcom.ua/country/incidents/skilki-teritoriji-okupuvala-rosija-a-skilki-zvilnili-zsu-dani-stanom-na-pochatok-zimi-2023-roku-972101.html>.

La tolleranza ordinaria del controllo è ±2 punti percentuali. Per Kherson è
±5 punti, perché la stima pubblica include un criterio territoriale più ampio,
mentre Frontiera conta soltanto il controllo continuo consolidato e conserva
separatamente lo stato conteso.

## Limiti da sottoporre al direttore scientifico

- F0: forma e ampiezza delle sacche di Kyiv/Černihiv/Sumy durante il ripiegamento;
- F0: distinzione fra controllo consolidato e avanzata lungo gli assi stradali di Kharkiv e Mykolaiv;
- F3: ampiezza del saliente di Kursk (perimetro consolidato, non massima rivendicazione);
- F3: micro-salienti di Kharkiv e Donetsk alla scala della carta generale.
- F1/F2: differenza di criterio residua per Kherson fra stima pubblica e master
  conservativo; la geometria non è stata deformata per inseguire la stima;
- F4: rapida contrazione del saliente di Kursk il 12–13 marzo; i 150,26 km²
  rappresentano il residuo consolidato, non l'estensione massima della
  campagna;
- F5: fase aperta e numero elevato di piccole zone grigie; il residuo ucraino
  in Russia è 11,19 km² e richiede nuova revisione nelle build future.

Le percentuali editoriali di F1/F2 restano un **controllo a valle**, mai un
bersaglio geometrico. Differenze, tolleranze e fonti sono conservate nel report
e nella documentazione invece di essere corrette alterando i master.
