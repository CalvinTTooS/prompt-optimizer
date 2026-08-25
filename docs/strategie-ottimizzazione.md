# Strategie di ottimizzazione dei prompt

[English](optimization-strategies.md) · **Italiano**

Questo documento spiega **su cosa si basa** l'ottimizzazione dei prompt di Prompt
Optimizer: i metodi che applica e perché. Non è teoria generica — descrive le
strategie **realmente** implementate nei prompt di sistema del programma
(`app/constants/prompts.ts`). Se un giorno i prompt cambiano, cambia anche questo
documento.

L'idea di fondo: **non esiste "il prompt perfetto" in astratto**, esiste il prompt
giusto *per un certo target*. Una chat, un agente CLI e una coppia System+User via
API leggono le istruzioni in modo diverso. Il programma parte dal tuo prompt grezzo
e lo riscrive nel formato adatto al target che scegli, applicando le strategie qui
sotto.

---

## Principi trasversali (validi su tutti i formati)

- **Struttura esplicita.** Un prompt ben delimitato (tag XML nelle chat, heading
  Markdown nei file-istruzioni) è più affidabile di un muro di testo: il modello
  distingue ruolo, contesto, obiettivo e formato di output.
- **Priming di ruolo.** Dichiarare *chi* è il modello ("sei un esperto di…")
  orienta tono, priorità e livello di dettaglio.
- **Chiarezza e passo-passo.** Istruzioni concrete e sequenziali battono le
  richieste vaghe. Ogni riga deve superare il test: *"se la togliessi, il modello
  sbaglierebbe?"*.
- **Few-shot condizionale.** Un esempio input→output aiuta **solo** i task con un
  formato ripetuto (tabelle, classificazione, estrazione, trasformazioni). Per i
  task aperti (narrazione, spiegazione, consiglio) gli esempi *danneggiano*: meglio
  investire in ruolo e formato di output.
- **Istruzioni positive.** Dire *cosa fare* è più efficace del solo elenco di
  divieti; i vincoli negativi restano per le cose davvero da evitare.
- **Posizionamento.** Contesto e dati specifici vanno messi **presto**; l'istruzione
  puntuale spesso rende meglio **in fondo**.
- **Ragiona prima di agire.** Per i task non banali, far pianificare/elencare i
  passi prima di produrre l'output riduce gli errori (chain-of-thought, plan mode).
- **Autosufficienza.** Un prompt "di produzione" non fa domande di follow-up
  all'utente: contiene tutto ciò che serve per essere eseguito così com'è.

---

## Differenze per modello

La maggior parte delle best practice vale su **entrambi** i modelli; le differenze
genuine sono poche:

- **Google Gemini** — risponde bene a struttura esplicita e a un formato di output
  dichiarato; ottimo per output strutturati (JSON, tabelle) quando lo schema è
  chiaro.
- **Anthropic Claude** — risponde particolarmente bene ai **tag XML** e a un ruolo
  ben definito; nelle chat premia istruzioni discorsive e delimitate.

---

## Strategie per formato di output

Il programma genera fino a cinque varianti; ciascuna ha una strategia dedicata.

### 1. Claude Chat (Web UI)
Ottimizza per l'interazione umana, discorsiva e iterativa. Usa **tag XML**
standard (`<role>`, `<context>`, `<goal>`, `<output_format>`), stile naturale e
passo-passo. Few-shot **solo** se il task è format-driven. Domanda di follow-up
solo per i task conversazionali/esplicativi, mai per un output chiuso (una tabella,
una riscrittura, una classificazione).

### 2. Claude Cowork (Workspace Agent)
Ottimizza per un agente collaborativo in un ambiente condiviso. Usa tag orientati
al workspace (`<system>`, `<workspace_context>`, `<primary_task>`,
`<collaboration_rules>`), definisce i **confini** dell'agente (cosa può e non può
modificare) e i **punti di approvazione umana**.

### 3. Claude Code (agente CLI, genere `CLAUDE.md`)
Ottimizza per l'esecuzione autonoma nel terminale. Markdown puro (niente XML
verboso), con regole tassative:
- **Path rigidi in backtick**, mai come link Markdown; coerenza assoluta nei nomi
  di file e cartelle.
- **Scelte architetturali nette**, senza scappatoie ambigue.
- **Plan mode**: presenta un piano numerato e **si ferma in attesa di approvazione**
  prima di operare.
- **Branch separato** sempre (`git checkout -b`).
- **Generazione dinamica** con tool nativi (niente contenuti hardcoded, niente
  placeholder tipo `[TODO]`).
- Consapevolezza di **dipendenze e virtualenv**; **verifiche deterministiche**
  reali (es. `py_compile`, `pytest` coi test creati prima).
- **Memoria di lavoro**: aggiorna `WORK_LOG.md` e mantiene un **loop di
  auto-miglioramento** su `lessons.md` (vedi sotto). Legge `CLAUDE.md` all'inizio,
  non lo modifica.
- Parla **solo all'agente**: nessun promemoria per l'utente umano.

### 4. System + User (API strutturata)
Divide il prompt grezzo in una coppia **System / User** secondo le convenzioni API.
Criterio di instradamento unico per ogni frammento: *"resterebbe identico se
rieseguissi il task domani con dati diversi?"* → **sì → System** (ruolo, vincoli,
formato, guardrail, few-shot riusabili); **no → User** (il task concreto, i dati di
questa esecuzione, le domande puntuali). Lo User non è mai vuoto; niente contenuto
duplicato nei due campi.

### 5. File istruzioni Gemini (genere `GEMINI.md`)
Genera un file di contesto per Gemini CLI, adattato alle sue convenzioni native:
- **Consapevolezza gerarchica**: Gemini CLI concatena i file (globale → progetto →
  sottodirectory), con "closest file wins"; il contenuto è tarato sul livello
  dichiarato.
- **Neutralità del nome file**: il file non si auto-referenzia per nome (può
  chiamarsi `AGENTS.md`), così funziona anche se rinominato.
- **Interoperabilità `AGENTS.md`**: comandi build/test, code style, convenzioni di
  commit/PR.
- **Specificità verificabile**: comandi concreti (es. `npm test`), mai frasi come
  "scrivi codice pulito".
- **Modularità** con import `@file.md` per input estesi.
- **Ragiona-prima-di-agire** e **loop di auto-miglioramento** su `lessons.md`
  (vedi sotto).
- Nessuna assunzione di rilettura automatica; nessun promemoria per l'utente umano.

---

## Loop di auto-miglioramento (`lessons.md`)

Alcuni formati non producono un prompt usa-e-getta, ma **istruzioni per un agente
che lavora sullo stesso progetto tra molte sessioni** (Claude Code e Gemini, oltre
alla modalità **Scaffold strutturato**). Per questi, il programma include una
strategia in più: un **loop di auto-miglioramento**.

> Dopo ogni **correzione** dell'utente, l'agente annota in `lessons.md` una
> **regola** sintetica (cosa evitare / cosa fare + perché) e rilegge `lessons.md`
> a inizio sessione. Le lezioni **stabili e generali** vengono promosse nel file di
> istruzioni principale (`CLAUDE.md`/`GEMINI.md`) e rimosse da `lessons.md`, che
> resta **memoria di lavoro corta e ad alto segnale**, non un archivio.

Perché **solo** questi formati? Se stai ottimizzando *un singolo prompt* (una chat,
una coppia System+User), non c'è una sessione successiva da migliorare: la memoria
delle lezioni non serve e non va imposta. Ha senso dove esiste un **progetto che
evolve**.

---

## Anonimizzazione PII (prima di ogni invio)

Poiché il prompt viene inviato a Gemini, il programma **maschera i dati sensibili
sul dispositivo** *prima* della chiamata: email, telefoni, carte (validate con
Luhn) e CCV diventano segnaposto tipo `[EMAIL_1]`. Il modello vede solo il testo
mascherato; i valori reali vengono **ripristinati nell'output**. I segnaposto sono
intenzionali: le altre strategie (rifinitura, valutazione, few-shot) li lasciano
**identici**, non li trattano come un difetto.

---

## Strategie di supporto

- **Esempi few-shot condivisi.** Gli esempi che fornisci vengono iniettati in tutti
  i formati selezionati come **modello da emulare** (struttura, rigore, livello di
  dettaglio), mai copiati verbatim.
- **Rifinisci / Valuta.** Ogni variante può essere rifinita o valutata con Claude o
  OpenAI: la rifinitura mette i vincoli in cima, usa imperativi diretti e
  placeholder `{{...}}`, rende l'obiettivo verificabile; la valutazione controlla
  obiettivo verificabile, vincoli espliciti, ambiguità, autosufficienza e struttura
  (senza punteggio numerico).
- **Scaffold strutturato.** Da una descrizione di progetto, il programma compila la
  sezione "Progetto" di un template e assembla il set completo di istruzioni per
  agenti (`CLAUDE.md` + `GEMINI.md` + `METHOD.md` + profili di piattaforma) — con il
  loop `lessons.md` già incluso.

---

## Fonti

La ricerca con fonti dietro ciascun formato è in
[`docs/prompt-engineering-best-practices.md`](prompt-engineering-best-practices.md).
Le istruzioni operative reali vivono in `app/constants/prompts.ts`.
