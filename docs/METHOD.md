# METHOD.md — metodologia di sviluppo (principi stabili)

> **Versione: v0.5.** Questo file è il **metodo completo** (il "perché"):
> principi di ingegneria **stabili** e **agnostici rispetto alla piattaforma**.
> È il riferimento di [`CLAUDE.md`](../CLAUDE.md), che ne contiene la sintesi
> operativa caricata in ogni sessione. **Leggi questo file on demand** — su
> decisioni architetturali o di sicurezza importanti, o quando serve il razionale
> di una regola.
>
> **STABILE — non modificare senza approvazione manuale ed esplicita dell'utente.**
> Ogni modifica è un cambiamento deliberato e versionato; le note di lavoro vanno
> in `WORK_LOG`.
>
> Le **direttive specifiche di questo progetto** (contesto, stack, comandi,
> profilo di piattaforma) vivono in [`CLAUDE.md`](../CLAUDE.md) nella root —
> caricato automaticamente a ogni sessione. Motivo dello split: la guida ufficiale
> sul formato CLAUDE.md raccomanda di tenerlo sotto le ~200 righe e di riservarlo a
> contenuto specifico del progetto — la metodologia generica (questo file) non va
> ripetuta a ogni sessione. Vedi `docs/prompt-engineering-best-practices.md` per le
> fonti.

Regola d'oro: **progettare prima, sviluppare dopo.** I pilastri da definire
*prima* di scrivere codice sono la **comprensione del problema**,
l'**architettura**, i **test**, la **sicurezza by design** e l'**igiene/standard**.

## Indice

1. [Punti di partenza](#1-punti-di-partenza-prima-di-scrivere-codice)
   - [1.0 Capire il problema](#10-capire-il-problema-requisiti-scope-utenti)
   - [1.1 Architettura a blocchi](#11-architettura-a-blocchi)
   - [1.2 Strategia di test](#12-strategia-di-test-definita-da-subito)
   - [1.3 Struttura del repository e strumenti](#13-struttura-del-repository-e-strumenti)
   - [1.4 Sicurezza e privacy by design](#14-sicurezza-e-privacy-by-design-fin-dallinizio)
   - [1.5 Scelta consapevole dello stack tecnologico](#15-scelta-consapevole-dello-stack-tecnologico)
2. [Standard del linguaggio e igiene del codice](#2-standard-del-linguaggio-e-igiene-del-codice)
3. [Best practice del/dei linguaggio/i](#3-best-practice-deldei-linguaggioi)
4. [Legale: licenze e riconoscimenti](#4-legale-licenze-e-riconoscimenti)
5. [Sicurezza e dati — pratiche concrete](#5-sicurezza-e-dati--pratiche-concrete)
6. [Controllo di versione e workflow](#6-controllo-di-versione-e-workflow)
7. [Documentazione e tracciabilità](#7-documentazione-e-tracciabilità)
8. [Esperienza utente, portabilità, prestazioni](#8-esperienza-utente-portabilità-prestazioni)
9. [Metodologie di processo](#9-metodologie-di-processo-un-asse-complementare-non-alternativo)
10. [Il nostro workflow AI-assistito](#10-il-nostro-workflow-ai-assistito-concreto-e-ripetibile)
11. [Repository, Git e CI/CD](#11-repository-git-e-integrazione-continua-cicd)
12. [Requisiti non-funzionali e obiettivi misurabili](#12-requisiti-non-funzionali-e-obiettivi-misurabili)
13. [Distribuzione e rilascio](#13-distribuzione-e-rilascio)
14. [Affidabilità, logging e diagnostica](#14-affidabilità-logging-e-diagnostica)
15. [Compatibilità e migrazione dei dati](#15-compatibilità-e-migrazione-dei-dati)
16. [Onboarding, accessibilità e identità](#16-onboarding-accessibilità-e-identità)
17. [Collaborazione e governance del repo](#17-collaborazione-e-governance-del-repo)
18. [Configurazione e ambienti](#18-configurazione-e-ambienti)

---

## 1. Punti di partenza (prima di scrivere codice)

### 1.0 Capire il problema (requisiti, scope, utenti)
Prima di progettare, definire **cosa** e **perché**:
- **Obiettivo** e **utenti** (chi lo usa e per fare cosa).
- **Requisiti** essenziali e **vincoli** (tecnici, legali, di tempo).
- **Piattaforma/e target**: scelta deliberata, non lasciata implicita (→ §1.5 e
  Profilo in CLAUDE.md). Se è ancora **incognita**, scioglierla è il **primo nodo**
  (requisiti/spike); fino ad allora si lavora sul **core agnostico** (§1.1) e si
  rimandano le scelte accoppiate alla piattaforma.
- **Scope**: cosa rientra e — esplicitamente — **cosa NON fare** (evita lo
  *scope creep*).
- **Confronto coi riferimenti/competitor**: usarlo per **consapevolezza**, non per
  imporre la parità — una feature si aggiunge solo se rientra nello **scope**
  deciso; annotare le mancanze rilevanti senza trasformarle in obblighi.
- **Criteri di successo / "done"** del progetto, misurabili dove possibile (→ §12).

Meglio poche righe chiare condivise prima, che riscritture dopo.

### 1.1 Architettura a blocchi
- Disegnare il sistema come **diagramma a blocchi**: ogni blocco è un modulo con
  una **responsabilità unica** e un'**interfaccia** chiara; nasconde i dettagli
  interni (*information hiding*).
- Scegliere la **granularità per coesione**, non per comando: si raggruppa ciò
  che cambia per lo stesso motivo (*Single Responsibility*). Evitare sia i
  "god module" sia l'eccesso opposto (mille micro-moduli, *over-engineering*).
- **Gestire le frecce** (dipendenze/flusso dati), non solo i blocchi: poche
  dipendenze, in una direzione controllata, verso le parti stabili (es. il
  modello di dominio). Niente cicli quando evitabili. Preferire un **flusso dati
  prevedibile** (es. lo stato cambia → notifica → la UI si aggiorna), invece di
  far chiamare a mano rendering/pannelli da ogni azione.
- Distinguere **alto accoppiamento** (cattivo) da **alta coesione** (buona).
- Decomporre **per layer** (UI/logica/dati) e/o **per feature**: per app grandi,
  preferire *package by feature*.
- **Isolare il core dalla piattaforma**: la logica di dominio non deve dipendere
  da UI, OS o framework — è ciò che rende l'app testabile e un eventuale cambio di
  piattaforma un intervento contenuto (non un rewrite).

### 1.2 Strategia di test (definita da subito)
- Avere una **suite di test riutilizzabile** come *gate di regressione*, eseguita
  **prima** (baseline verde) e **dopo** ogni modifica. A regime, il "dopo" basta.
  La **baseline verde** è definita dal **comando di Gate** del progetto (→ CLAUDE.md),
  non interpretata: un linter con exit code 0 **non** equivale a test passati.
- Coprire i livelli giusti: **unit** (logica pura), **integration** (rotte/IO),
  **smoke / end-to-end** (l'app si avvia e le funzioni chiave non lanciano
  errori). Automatizzarli in **CI**.
- **Testa ciò che fa male se si rompe**, non la copertura totale: hanno bisogno di
  test la **logica vera** (parsing, calcoli, trasformazioni), i **casi limite**
  (input vuoto, valori estremi, formati inattesi) e tutto ciò che tocca **file,
  dati o denaro**; non l'interfaccia né il codice banale. *Esempio:* una funzione
  di parsing non coperta va testata prima di toccarla; il colore di un pulsante o
  il testo di un'etichetta no (semmai una verifica visiva). Poche cose testate,
  testate sempre.
- **Evita i test tautologici.** Se l'AI scrive insieme codice e test, rischia di
  verificare che "il codice fa quello che fa", non "ciò che si voleva":
  l'**intento lo definisce la persona** fornendo esempi di comportamento atteso
  (input → output), che il test deve codificare — non specchiare il codice.
- **Separa la logica dall'ambiente**: la logica pura dà lo stesso risultato
  ovunque, quindi i suoi test non dipendono dall'ambiente; solo le parti che
  toccano il sistema (percorsi, comandi esterni, API di piattaforma) sono
  sensibili. Isolando bene il core, la maggior parte dei test diventa
  ambiente-indipendente e resta lo **smoke test su ambiente/dispositivo pulito**
  (→ §11 e Profilo di piattaforma).
- I test sono parte della *Definition of Done*, non un'aggiunta finale.

### 1.3 Struttura del repository e strumenti
- Layout chiaro e dichiarato (sorgenti, test, asset, infra).
- Ambiente isolato e riproducibile: gestore di ambiente/dipendenze + **lockfile**
  dello stack scelto (→ Profilo di piattaforma).
- Strumenti di qualità configurati da subito: **formatter + linter**.

### 1.4 Sicurezza e privacy *by design* (fin dall'inizio)
La sicurezza si **progetta dall'inizio**, non si aggiunge alla fine (*shift-left*).
È un punto di partenza al pari di architettura e test.
- **Threat modeling leggero**: chiedersi presto *cosa può andare storto*, *chi
  potrebbe abusarne*, *quali dati/risorse proteggo*.
- **Default sicuri** (*secure by default*) e **minimo privilegio** a livello di
  architettura, non come patch successiva.
- **Difesa in profondità**: più livelli di protezione, mai un solo controllo.
- **Minimizzare la superficie d'attacco**: meno input non fidati, meno
  dipendenze, meno permessi, meno codice esposto.
- **Validare/encodare ai confini**: input esterno sempre validato; output sempre
  codificato per il contesto (HTML/SQL/shell…), per prevenire injection.
- **Fail securely**: in caso di errore, *negare* l'accesso, non concederlo.
- **Privacy by design**: raccogliere il minimo dato necessario, trasparenza,
  niente raccolta nascosta.
- **Supply-chain**: trattare ogni dipendenza come superficie di rischio (origine,
  integrità, aggiornamenti, licenza).

### 1.5 Scelta consapevole dello stack tecnologico
Scegliere in modo **deliberato** (non per abitudine) la **piattaforma target** e
gli assi dello stack — linguaggio, **framework/interfaccia**, **persistenza/IO**,
**stack di test** e **packaging/distribuzione** — e le dipendenze:
- **Idoneità** al problema e alla taglia; la soluzione **più semplice** che funziona.
- **Mono- vs multi-piattaforma**: se prevedi più target, valuta uno stack
  **cross-platform da subito** invece di "costruisci e porta dopo".
- **Se la scelta è incerta**, risolverla con uno **spike/prototipo leggero**
  (valutando i criteri di questa sezione) prima di impegnarsi, anziché deciderla
  per inerzia.
- **Maturità e manutenzione** (progetto vivo, community, sicurezza).
- **Licenza** compatibile (→ §4) e **peso/footprint** ragionevole.
- **Competenze** disponibili e **longevità** attesa.
- **Minimizzare le dipendenze** (ognuna è anche superficie di rischio, §1.4).

---

## 2. Standard del linguaggio e igiene del codice

- **Naming convention** dello specifico linguaggio (es. `snake_case` in Python,
  `camelCase` in JS/Kotlin, `PascalCase` per i tipi) applicata in modo coerente.
- **Lingua del codice**: identificatori e commenti in **inglese**; le stringhe
  rivolte all'utente seguono la policy del progetto (es. lingua dell'utente o
  i18n). Coerenza prima di tutto.
- **Commenti che spiegano il "perché"**, non il "cosa" ovvio; aggiornarli col
  codice. Niente commenti morti o fuorvianti.
- **Igiene e pulizia continua**:
  - niente **codice morto** o "refusi" non più usati: funzioni/variabili/import
    inutilizzati, **file orfani** (inclusi **script temporanei** e **configurazioni
    obsolete** rimasti dagli spike), codice commentato "per sicurezza", esperimenti
    lasciati a metà, **dipendenze** non più necessarie → si **rimuovono** (la
    storia è in git, non serve commentare-e-tenere);
  - niente `TODO`/placeholder o logica omessa nel codice consegnato;
  - niente funzioni-mostro né duplicazione inutile (DRY), ma **senza astrazioni
    premature** (YAGNI);
  - **regola dello scout**: lasciare il codice toccato un po' più pulito di come
    lo si è trovato; il linter segnala gli elementi inutilizzati.
- **Formatter + linter** del linguaggio come standard, idealmente in CI
  (es. Black/Ruff, Prettier/ESLint, ktlint/detekt): la formattazione non è
  un'opinione, è automatizzata.

## 3. Best practice del/dei linguaggio/i
- Seguire le convenzioni idiomatiche e le linee guida ufficiali del linguaggio
  (es. PEP 8 per Python; Kotlin coding conventions; modern JS).
- Principi **SOLID** dove applicabili; preferire funzioni pure e stato esplicito.
- **Gestione errori esplicita**: fallire in modo chiaro con messaggi utili;
  niente errori inghiottiti in silenzio; validare gli input ai confini.
- Coerenza dello stile in tutto il codebase (uno stile, non cinque).

---

## 4. Legale: licenze e riconoscimenti
- **Rispettare le licenze** di ogni dipendenza/asset usato; verificarle *prima*
  di aggiungere una dipendenza (compatibilità con la licenza del progetto).
- Mantenere un file di **licenze di terze parti** (`THIRD-PARTY-LICENSES`).
- Includere **sempre** una sezione/finestra **Credits / Ringraziamenti** che
  attribuisca autori, librerie e fonti; tenerla **versionata** e aggiornata a
  ogni release.
- Dichiarare la **licenza del progetto** (file `LICENSE`).
- Non includere mai materiale di cui non si hanno i diritti.

## 5. Sicurezza e dati — pratiche concrete
Attuazione concreta dei principi di [§1.4 *Sicurezza by design*](#14-sicurezza-e-privacy-by-design-fin-dallinizio).
- **Nessun segreto nel repository** (token, chiavi, password), nemmeno nella
  cronologia git: usare variabili d'ambiente/secret store; non stampare mai i
  segreti nei log.
- **Validare gli input** ai confini; **minimo privilegio**; **fail securely**.
- **Dipendenze** aggiornate e con vulnerabilità sorvegliate (es. pip-audit,
  Dependabot/Renovate, Trivy, Snyk — solo a titolo d'esempio); numero minimo
  (valutare peso, manutenzione, licenza e integrità prima di aggiungerne).
- **Controlli automatici**: **scansione dei segreti** prima di pubblicare e
  **analisi statica del codice (SAST)** dove sensato; per app **web/servizi**
  aggiungere la verifica dell'app in esecuzione (**DAST**). Come consapevolezza di
  base, leggere una volta una checklist delle vulnerabilità comuni (es. *OWASP Top
  10* per web, *OWASP Mobile Top 10* per mobile). Strumenti solo a titolo
  d'esempio: gitleaks/trufflehog, Bandit/Semgrep/detekt, OWASP ZAP/MobSF.
- **Privacy**: dato minimo necessario, niente telemetria nascosta,
  salvataggi/recupero trasparenti.

## 6. Controllo di versione e workflow
- Lavorare su **branch di feature**, mai direttamente su `main`.
- **Commit atomici** con messaggi chiari (cosa + perché); committare solo quando
  i test sono verdi.
- **Versioning**: **SemVer** come schema; su alcune piattaforme serve un
  identificatore di build aggiuntivo (es. build number / `versionCode`) →
  Profilo di piattaforma. **CHANGELOG** aggiornato a ogni release.
- **Code review** / self-review con checklist prima del merge.
- **Definition of Done** esplicita: test verdi + lint/format + documentazione
  aggiornata + (se serve) credits/CHANGELOG aggiornati — **eseguibile come comando
  di Gate** (→ CLAUDE.md).

## 7. Documentazione e tracciabilità

La documentazione **vive col codice**, organizzata in tre gruppi (prodotto,
sviluppo, stato/avanzamento), con una **regola di sincronizzazione obbligatoria**.

**Documentazione di prodotto (cosa fa e come si usa):**
- `README` — cos'è, a cosa serve, come si avvia/usa.
- **Guida utente / help** (in-app o file `USER_GUIDE`) quando l'app ha utenti
  finali.

**Documentazione di sviluppo (com'è fatto e perché):**
- `ARCHITECTURE` — struttura dell'app **con il diagramma a blocchi** (moduli +
  frecce/dipendenze) e il modello dati.
- `CLAUDE.md` — direttive specifiche di progetto; la metodologia stabile vive in `docs/METHOD.md` (questo documento).
- **ADR** (*Architecture Decision Records*) — le **decisioni** importanti e il
  loro perché (alternative valutate, motivo della scelta).
- `CONTRIBUTING` — come contribuire: setup, test/lint, stile commit/PR (→ §17).
- `THIRD-PARTY-LICENSES`, credits/`ACKNOWLEDGMENTS`.

**Stato e avanzamento (cosa è stato fatto):**
- `WORK_LOG` — registro cronologico di modifiche e stato corrente.
- `CHANGELOG` — cosa è cambiato per versione (per chi usa/aggiorna).

**Set canonico dei file di documentazione (da mantenere aggiornati):**
- `README` (uso del prodotto) · **Guida utente / help** (per utenti finali:
  in-app o file `USER_GUIDE`) · `ARCHITECTURE` (struttura + **diagramma a
  blocchi** + modello dati).
- `CLAUDE.md` (direttive di progetto) + `docs/METHOD.md` (metodologia stabile).
- `CHANGELOG` (modifiche per versione) · `WORK_LOG` (registro/stato corrente).
- `THIRD-PARTY-LICENSES` + `ACKNOWLEDGMENTS` (licenze e crediti).
- `ADR/` (registri delle decisioni, quando servono).
- `CONTRIBUTING` (come contribuire: setup, test/lint, stile commit/PR; → §17).

**Regola di sincronizzazione (obbligatoria):**
- Ogni **modifica strutturale** (nuovi moduli, dipendenze, flussi, formato dati,
  comandi) aggiorna **nello stesso commit/PR** i documenti e i diagrammi
  interessati — in primis `ARCHITECTURE` e il **diagramma a blocchi**.
- Una **documentazione disallineata è un bug**: aggiornarla fa parte della
  *Definition of Done* (§6).
- Tenere i diagrammi **versionati** come testo/ASCII (o file sorgente), non solo
  immagini, così si aggiornano e si "diffano" insieme al codice.

## 8. Esperienza utente, portabilità, prestazioni
- **UX**: interfaccia chiara e adattiva (responsive) quando c'è (accessibilità
  *a11y* e internazionalizzazione *i18n* → §16).
- **Uniformità dell'interfaccia**: stessi pattern visivi e comportamentali — tema,
  palette e formatter centralizzati, layout coerente tra le sezioni, e ogni nuova
  sezione replica i pattern esistenti. Testi/etichette coerenti per tono e lingua
  **all'interno di ciascun locale** (così la coerenza non confligge con l'i18n).
- **Portabilità**: target (OS/browser/dispositivi) dichiarati (→ Profilo);
  degradazione elegante.
- **Prestazioni**: misurare prima di ottimizzare; attenzione a memoria/CPU/batteria
  nei cicli caldi (es. loop di rendering / ricomposizioni). Niente ottimizzazioni
  premature.
- **Build riproducibili** e istruzioni di setup verificate.

---

## 9. Metodologie di processo (un asse complementare, non alternativo)

Distinzione fondamentale, da tenere a mente:
- **Principi di ingegneria** (gran parte di questo documento): *come costruire
  bene il software* — architettura, test, igiene, sicurezza. Stabili e durevoli.
- **Metodologie di processo**: *come si organizza il lavoro* (iterazioni, ruoli,
  pianificazione, consegna). Si scelgono per team/progetto ed evolvono nel tempo.

I due assi sono **complementari**: Agile non sostituisce i principi tecnici —
li *organizza*. (Es. **XP** coincide in gran parte coi principi tecnici:
architettura, test, igiene.)

Panorama, dal predittivo all'adattivo:
- **Plan-driven / predittivo**: *Waterfall*, *V-Model* — requisiti fissati a
  monte. Adatto a contesti stabili/regolati; rigido al cambiamento.
- **Iterativo & incrementale**: si costruisce a piccoli passi rilasciabili.
- **Agile** (Manifesto, 2001) — ombrello adattivo:
  - **Scrum** (sprint, ruoli, cerimonie);
  - **Kanban** (flusso continuo, limiti WIP — ideale per team piccoli/manutenzione);
  - **XP / Extreme Programming** (TDD, pair programming, CI, refactoring, simple
    design — *molto* vicino ai nostri principi tecnici);
  - **Lean** (eliminare gli sprechi).
- **Framework scalati**: *SAFe*, *LeSS* (grandi organizzazioni).
- **Alternative recenti**: *Shape Up* (cicli a tempo fisso, scope variabile).

In divenire (stanno evolvendo proprio ora):
- **DevOps / DevSecOps**: cultura che unisce sviluppo, sicurezza e operations;
  automazione, **CI/CD**, *shift-left* (la sicurezza *by design* della §1.4 vive qui).
- **Continuous Delivery/Deployment**, **GitOps**, **Trunk-based development**.
- **Platform engineering** (piattaforme interne self-service).
- **Sviluppo assistito da AI / agentico** (LLM e agenti — *è ciò che stiamo
  facendo ora*): metodologia emergente, ancora in formazione; cardini: revisione
  umana, test come *gate*, contesto/prompt trattati come artefatti versionati.
- **MLOps / LLMOps** per sistemi basati su machine learning.

Pratiche trasversali (indipendenti dal framework scelto): **TDD/BDD**, **CI/CD**,
**code review**, **branching strategy** (Git Flow vs trunk-based).

Per progetti piccoli/solisti il mix naturale è **Kanban leggero + pratiche XP
(test-first/test-gate, refactoring continuo, CI) + workflow AI-assistito**;
Scrum/SAFe sarebbero sovradimensionati.

## 10. Il nostro workflow AI-assistito (concreto e ripetibile)

Istanza concreta dello sviluppo *agentico* (§9). Sono **direttive operative** da
riusare nei progetti futuri (e nei loro `CLAUDE.md`).

**Perché i test sono centrali (sviluppo "vibe coding").** Gran parte del codice è
scritta dall'AI senza che ogni riga venga letta a mano: **i test sono il modo con
cui ci si fida di codice che non si è letto** — verificano che l'AI abbia fatto
*ciò che si voleva* senza dover capire *come*, e impediscono a una sessione futura
di rompere ciò che una precedente aveva costruito. La verifica si sposta da "io
controllo" a "il sistema verifica al posto mio".

**Ruoli.** L'**utente** decide su prodotto, design, scope e priorità. L'**agente**
propone, esegue, verifica e **dice la verità tecnica** (anche scomoda); raccomanda
ma non forza le scelte di prodotto.

**Il ciclo, un passo per volta:**
1. **Capire & pianificare** — chiarire il requisito; presentare un **piano
   operativo numerato**, **arrestare la catena di esecuzione dei tool** e
   **chiudere il turno con una domanda esplicita di approvazione**: non scrivere
   file né eseguire comandi nello stesso turno del piano.
2. **Isolare** — lavorare su **branch di feature**; build riproducibile
   (gestore deps/lockfile); niente dipendenze non dichiarate né installazioni
   globali.
3. **Baseline verde** — eseguire la suite di test *prima* della modifica, come
   riferimento diagnostico.
4. **Modifica piccola e coesa** — un cambiamento alla volta. Per spostare/rifattorizzare
   codice, **mappare prima le dipendenze**: cosa chiama/legge (incluse le
   **variabili**, non solo le funzioni) e chi lo usa da fuori.
5. **Verificare** — rieseguire test/smoke *dopo*; se fallisce, diagnosticare e
   **correggere prima** di proseguire (mai accumulare rotture).
6. **Checkpoint** — commit **solo a verde**, a blocchi, con messaggi chiari
   (cosa + perché) e il trailer di co-autore.
7. **Azioni esterne/irreversibili** (push, pubblicazione, cancellazioni,
   sovrascritture) — **conferma esplicita**; **mai esporre segreti** in chat/log.
8. **Riferire con onestà** — stato reale: se un test fallisce, dirlo con l'output;
   niente "fatto" senza verifica.
9. **Documentare man mano** — aggiornare `WORK_LOG` / `ARCHITECTURE` /
   `CHANGELOG` insieme al codice.
10. **Fermarsi e segnalare** quando il rischio supera il beneficio: dare il
    giudizio ingegneristico onesto invece di forzare un'estrazione/refactor dannoso.

**Revisione manuale obbligatoria.** Anche nel vibe coding, su alcune zone non si
delega la lettura all'AI: si ispeziona il codice a mano (anche senza capirne ogni
dettaglio). Lista fissa e corta:
- gestione di **credenziali e segreti**;
- codice che **scrive o cancella file**;
- **input che arriva dall'esterno** (file aperti, dati di rete, parametri);
- ogni **nuova dipendenza** proposta dall'AI.

Si lega alla sicurezza *by design* (§1.4) e alle pratiche su dati e dipendenze (§5).

**Ricerca proattiva di bug.** Dopo ogni modifica, analizzare anche il codice
*circostante* per effetti collaterali, race condition, gestione errata di valori
nulli/vuoti e percorsi non testati; annotare in `WORK_LOG` quanto scoperto.

**Contesto come artefatto.** Questo documento (`docs/METHOD.md`), `CLAUDE.md` e i prompt rilevanti sono
**versionati** e riusati: sono parte del progetto, non usa-e-getta. L'agente
**non modifica di sua iniziativa** i principi di metodo / `docs/METHOD.md`: ogni
modifica richiede **approvazione manuale ed esplicita dell'utente** ed è un
cambiamento deliberato e versionato; le note di lavoro vanno in `WORK_LOG`.

**Loop di auto-miglioramento.** Dopo ogni correzione dell'utente, annota in
`lessons.md` una **regola** (non un racconto): *cosa evitare / cosa fare*, in una
riga, col perché. A inizio sessione rileggi le lezioni pertinenti al task. Tieni
`lessons.md` corto e ad alto segnale: quando una lezione è **stabile e generale**,
**promuovila** in `CLAUDE.md` (se operativa) o in `docs/METHOD.md` (se di metodo) e
rimuovila da `lessons.md`. È memoria di lavoro, non un archivio.

**Gate minimo prima di ogni commit** (Definition of Done del singolo passo):
esecuzione del **comando di Gate** del progetto (→ CLAUDE.md) — test/smoke verdi +
lint/format puliti — e documentazione coerente. Il "verde" è l'**uscita del
comando**, non un giudizio.

## 11. Repository, Git e integrazione continua (CI/CD)

- **Repo Git locale** fin dall'inizio: `git init`, `.gitignore` adeguato (build,
  cache, ambienti locali, **segreti/chiavi**, artefatti), commit iniziale pulito.
- **Infrastruttura da subito**: manifest delle dipendenze, script di build,
  workflow CI e configurazioni di lint/format si predispongono **dall'inizio**,
  come parte del piano operativo approvato (§10) — non a posteriori né "solo se
  richiesto".
- **Allineamento col remoto** (es. GitHub) con un **baseline coerente** di
  impostazioni del repo:
  - branch di default `main`; il lavoro avviene su branch di feature;
  - `LICENSE`, `README`, descrizione e *topics* compilati;
  - *branch protection* su `main` quando ci sono più contributor (consigliato);
  - Actions abilitate.
- **CI** da subito (es. GitHub Actions): ad ogni push/PR la **pipeline minima** è
  **lint → test → scansione dipendenze → scansione segreti** (e, quando sensato,
  smoke/e2e e build degli artefatti); se un passo fallisce, si ferma.
- **Ambienti/dispositivi bersaglio dichiarati** e davvero testati in CI con una
  **matrice** adeguata al target. Niente "funziona da me".
- **La forma della matrice dipende dal Profilo di piattaforma** (→ CLAUDE.md):
  congelare il runtime nel pacchetto (build self-contained o binario nativo)
  annulla l'asse "versione del runtime"; per **app web/mobile** la piattaforma
  (browser/dispositivo) **non** si può congelare e va coperta nella sua varietà.
- **Artefatti di build** prodotti e pubblicati dalla CI in modo **riproducibile**.

## 12. Requisiti non-funzionali e obiettivi misurabili

Oltre alle funzioni, definire **obiettivi misurabili** — come *budget*, non come
gabbie:
- **Avvio e reattività**: un tetto al **tempo massimo di avvio** (es. "pronto
  all'uso in < N secondi") e alla latenza dell'interazione.
- **Footprint**: dimensione del pacchetto, memoria/CPU/batteria ragionevoli sui
  target.
- **Piattaforme/dispositivi supportati**: OS/versioni/browser/dispositivi,
  **hardware minimo** (→ Profilo di piattaforma).
- **Prerequisiti d'uso** (di norma definiti **a software completato**): cosa serve
  all'utente per eseguirlo — idealmente **minimi** o dichiarati ed essenziali.
- **Affidabilità**: comportamento atteso con errori o dati corrotti.

I numeri si scelgono per progetto e si verificano (anche in CI dove possibile),
senza trasformarli in paletti arbitrari.

## 13. Distribuzione e rilascio

Principi **indipendenti dalla piattaforma**; il **meccanismo concreto** (pacchetto,
store, firma, canali) si definisce nel **Profilo di piattaforma** (→ CLAUDE.md).
- **Build identificabile con certezza**: numero di **versione** con **fonte unica
  di verità** (SemVer, → §6), propagato a metadati del pacchetto, schermata About,
  log diagnostico e CHANGELOG.
- **Integrità e firma** del pacchetto distribuito (evita manomissioni e avvisi del
  sistema).
- **Canali di rilascio** e, dove possibile, **rollout graduale** con rollback.
- **Aggiornamenti**: meccanismo definito (manuale vs automatico) e
  **compatibilità dei dati** tra versioni (→ §15).
- **Release tracciabili**: tag/versione + CHANGELOG + artefatti; se c'è
  offuscamento, archiviare le **mappe dei simboli** per de-offuscare i crash.

## 14. Affidabilità, logging e diagnostica

- **Logging** sempre presente con lo strumento idiomatico (non `print` a mano) e
  **livelli** standard (DEBUG/INFO/WARNING/ERROR…): in esercizio si scrive da INFO
  in su, il "debug" è abbassare la soglia. **Mai segreti o dati personali (PII)**;
  per gli errori, lo stack trace.
- **Gestione dei crash**: catturare gli errori non gestiti e registrarli/segnalarli
  **solo con consenso** (no telemetria nascosta).
- **Backup e recupero**: stato salvato in modo resiliente; non perdere il lavoro
  dell'utente.
- **Degradazione elegante**: con dati corrotti/parziali, fallire in modo
  controllato (*fail securely*, §1.4) informando l'utente.
- **Diagnostica remota**: un modo **a prova di errore** per far attivare all'utente
  il **log esteso** e raccogliere una **fotografia tecnica dell'ambiente, non
  dell'identità** (OS/runtime, versione app, architettura, risorse), **mascherando**
  i dati sensibili (es. nome utente nei percorsi). Il **meccanismo** (file-switch,
  toggle in-app, crash reporter) dipende dal **Profilo di piattaforma** (→ CLAUDE.md).

## 15. Compatibilità e migrazione dei dati

- **Versionare il formato** dei file/salvataggi (es. un campo `version`).
- **Retro-compatibilità**: le versioni nuove leggono i file vecchi; quando il
  formato cambia, prevedere la **migrazione automatica**.
- **Testare il caricamento** di file prodotti da versioni precedenti; mai rotture
  silenziose dei salvataggi esistenti.

## 16. Onboarding, accessibilità e identità

- **First-run / onboarding**: l'app è usabile subito, con **default sensati** e
  zero configurazione; uno stato vuoto chiaro o un progetto d'esempio.
- **Accessibilità (a11y)** come check concreto: navigazione assistita (tastiera /
  screen reader / TalkBack secondo la piattaforma), focus e ordine logici,
  contrasti adeguati, alternative testuali; target touch adeguati su mobile.
- **i18n**: stringhe separate dal codice (file di risorse) se è prevista più di una
  lingua; plurali/formati e **RTL** gestiti (decidere presto, non a posteriori).
- **Identità/branding coerente**: nome app, identificatore, icone, schermata
  iniziale e tema allineati.

## 17. Collaborazione e governance del repo

- **`CONTRIBUTING`**: come configurare l'ambiente, eseguire test/lint, stile di
  commit e di pull request.
- **Template per issue e pull request**; per i progetti pubblici, un **Code of
  Conduct**.
- **Controllo licenze automatico in CI**: verificare che le dipendenze restino
  compatibili con la licenza del progetto.
- **Definition of Done / checklist di rilascio** esplicita: test verdi + lint +
  documentazione aggiornata + CHANGELOG + credits/licenze aggiornati.

## 18. Configurazione e ambienti

- **Config fuori dal codice**: variabili d'ambiente, file di configurazione o
  config di build secondo lo stack; **niente valori hardcoded** (oltre ai segreti,
  §5).
- **Ambienti distinti** (es. sviluppo/produzione) con la stessa base di codice e
  configurazioni separate.
- **Default sicuri e documentati**: l'app parte con il **minimo** di configurazione
  — idealmente zero per l'utente finale.

---

### Promemoria sintetico
> Recap tematico: la numerazione è progressiva e **non corrisponde** a quella
> delle sezioni.

0. Capire il problema prima di progettare: obiettivi, utenti, requisiti, scope,
   **piattaforma target** (e cosa NON fare).
1. Architettura a blocchi (coesione alta, accoppiamento basso, frecce controllate;
   core isolato dalla piattaforma).
2. Test solidi e automatici, prima/dopo ogni modifica: testa ciò che fa male se
   si rompe, niente test tautologici, logica separata dall'ambiente.
3. Standard del linguaggio: naming, commenti, igiene, formatter+linter.
4. Best practice idiomatiche + gestione errori esplicita.
5. Licenze rispettate + Credits/Ringraziamenti sempre presenti e versionati.
6. Sicurezza *by design*: progettata dall'inizio (threat modeling, default
   sicuri, difesa in profondità, fail-securely); + igiene: niente segreti nel
   repo, input validati, dipendenze e supply-chain sorvegliate; + controlli
   automatici (scansione segreti, SAST; DAST per il web).
7. Git con branch/commit puliti, versioning, CHANGELOG, Definition of Done.
8. Documentazione (README/ARCHITECTURE/CHANGELOG/WORK_LOG).
9. UX/a11y/i18n, portabilità, prestazioni, build riproducibili.
10. Metodologia di processo (asse complementare): scegliere il modello adatto
    (Agile/Kanban/XP, DevOps/CI-CD, AI-assistito…) — organizza il lavoro, non
    sostituisce i principi 1–9.
11. Workflow AI-assistito: i test sono la fiducia in codice non letto; piano
    (**STOP + domanda di approvazione**) → baseline → modifica piccola → verifica
    via **comando di Gate** → commit a verde; revisione manuale obbligatoria sulle
    zone sensibili (segreti, scrittura file, input esterno, nuove dipendenze);
    onestà sullo stato; stop se il rischio supera il beneficio.
12. Pulizia continua: niente codice morto/refusi/file orfani/dipendenze inutili
    (la storia è in git); regola dello scout.
13. Repo & CI: git locale, allineamento GitHub (baseline impostazioni), pipeline
    minima lint→test→scansione dipendenze→scansione segreti, ambienti/dispositivi
    bersaglio testati in matrice (forma → Profilo), artefatti riproducibili.
14. Requisiti non-funzionali misurabili (avvio, footprint, piattaforme,
    prerequisiti) + distribuzione: build identificabile, versione a fonte unica,
    firma/integrità, canali/rollout, compatibilità dati (meccanismo → Profilo).
15. Affidabilità: logging (livelli; niente PII), gestione crash con consenso,
    backup/recupero, degradazione elegante, diagnostica remota (meccanismo →
    Profilo).
16. Dati: formato versionato + migrazione automatica, retro-compatibilità testata.
17. Onboarding (default sensati), accessibilità (a11y), branding coerente, e
    governance del repo (CONTRIBUTING, template, check licenze in CI, DoD).
18. Stack tecnologico e **piattaforma** scelti con criterio (idoneità, semplicità,
    maturità, licenza, manutenzione, peso, competenze; mono- vs cross-platform).
19. Configurazione fuori dal codice (env/file/build config, niente hardcoded),
    ambienti distinti, default sicuri e minimo setup.

---
