# CLAUDE.md — prompt-optimizer

@AGENTS.md

Metodologia di sviluppo (principi stabili, validi per ogni progetto — non si
modifica senza approvazione manuale ed esplicita dell'utente): vedi
[`docs/METHOD.md`](docs/METHOD.md). Questo file contiene solo le direttive
specifiche di **questo** progetto; va tenuto corto e ad alto segnale (fonte:
`docs/prompt-engineering-best-practices.md`, sezione "File di istruzioni per
agenti").

**Esecuzione dei piani**: per implementare un piano usa **sempre**
Subagent-Driven Development (`superpowers:subagent-driven-development`) come
default, senza chiedere all'utente di scegliere la modalità. L'unica eccezione è
quando i task sono strettamente accoppiati: in quel caso è la stessa skill a
indirizzare altrove.

**Loop di auto-miglioramento** (razionale: `docs/METHOD.md`): dopo una
**correzione** dell'utente, annota in `lessons.md` una **regola** (una riga +
perché); rileggi `lessons.md` a **inizio sessione**. Promuovi le lezioni stabili e
generali in `docs/METHOD.md` (metodo) o qui in `CLAUDE.md` (operativo) e rimuovile
da `lessons.md` — è memoria di lavoro, non un archivio.

**Eleganza su modifiche non banali**: prima di consolidare, chiediti se c'è un modo
più semplice/elegante; se è una pezza, rifalla pulita. **Salta per i fix banali**
(YAGNI, niente gold-plating).

## Contesto del progetto
**Prompt Optimizer**. App desktop che
prende in ingresso un prompt utente e genera fino a **cinque** varianti
ottimizzate per diversi target AI (Claude Chat/Web, Claude Cowork, Claude Code
CLI, System+User prompt, file istruzioni Gemini/GEMINI.md), tramite un modello
Google Gemini fornito dall'utente con la propria API key. Include
anonimizzazione PII (email, telefono, carte di credito/CCV) prima dell'invio al
modello, con ripristino automatico nell'output finale. Ha inoltre una **modalità
"Scaffold strutturato"** che genera uno scaffold completo di istruzioni per
agenti (CLAUDE.md + GEMINI.md + METHOD.md + profili), compilando solo la sezione
"Progetto" e scrivendolo in cartella o come ZIP.

Utente: sviluppatore/prompt-engineer singolo (uso personale/locale), non un
prodotto multi-tenant. Vincoli chiave: nessun backend proprio — tutta la logica
gira client-side nella webview Tauri; la API key Gemini è fornita e conservata
dall'utente sul proprio dispositivo. **Nota piattaforma importante**: il progetto
dichiara in `AGENTS.md` (importato in cima a questo file) di usare una versione
di Next.js "non standard" con API/convenzioni divergenti dal training data —
consultare `node_modules/next/dist/docs/` prima di scrivere codice Next.js.

## Scelte architetturali vincolanti
- **Piattaforma/e target**: **Desktop/portable** (Windows, via Tauri) — Profilo A.
- Linguaggio: TypeScript (frontend) + Rust (shell desktop Tauri, minimale).
- Framework / interfaccia: Next.js (App Router, `output: 'export'` → sito
  statico) + React 19 + Tailwind CSS 4, impacchettato in Tauri 2.
- Persistenza / IO: API key Gemini salvata via `tauri-plugin-store`
  (`app/lib/secureApiKeyStore.ts`). Salvataggio file (download `.md`,
  istruzioni di progetto, ZIP): il **dialog nativo viene aperto lato Rust**
  dai comandi `save_text_file`/`save_binary_file`/`save_scaffold_to_dir`
  (`src-tauri/src/lib.rs`), che fanno anche la scrittura — il frontend passa
  **solo il contenuto, mai un percorso**. Così non esiste né uno scope
  filesystem ampio nel manifest né un path controllato dal client
  (arbitrary-write eliminato; il dialog OS resta il gate di consenso). Il
  plugin fs resta usato solo dal frontend per il debug-switch, scopato a
  `$APPCONFIG` (`fs:allow-appconfig-read-recursive`/`-write-recursive`). Tutto
  richiede la shell Tauri (`npx tauri dev`/`npm run tauri dev`), non funziona in
  `npm run dev` puro browser.
- Stack di test (runner + tipo di fixture/asset): **Vitest** — ambiente Node
  (no DOM) per `app/lib/`, ambiente jsdom + `@testing-library/react`
  (`renderHook`) per `app/hooks/` (config in `vitest.config.ts`). I componenti
  in `app/components/` sono JSX puro senza stato proprio e non hanno test
  dedicati.
- Packaging / distribuzione: Tauri bundler → eseguibile standalone
  `src-tauri/target/release/pop_app.exe` (nome forzato via
  `mainBinaryName: "pop_app"` in `tauri.conf.json`; il `productName`
  "Prompt optimizer" resta il nome visualizzato dell'app) + installer
  `.msi`/NSIS in `src-tauri/target/release/bundle/`.
- Rifinisci/Valuta con Claude: layer di provider intercambiabile
  (`app/lib/providers/` — Claude API + OpenAI API, selezionati da
  `registry.ts`, chiavi in ⚙️ Impostazioni).

## Organizzazione del codice
- Sorgenti UI: `app/page.tsx` (~75 righe — solo orchestrazione: compone gli
  hook e i componenti, zero stato/logica propri) · `app/layout.tsx`,
  `app/globals.css`.
- Componenti (`app/components/`, JSX puro, zero `*.test.ts` — non hanno stato
  proprio, solo props): `SetupScreen` (schermata configurazione iniziale),
  `AppHeader` (titolo, toggle log esteso, reset key), `PromptEditor` (input,
  anonimizzazione, formati di output, pulsante ottimizza), `ResultViewer`
  (analisi tecnica, variabili, output generati con copia/download),
  `ScaffoldGenerator` (modalità scaffold strutturato), `MasterclassTips`
  (sezione statica, zero props).
- Hook (`app/hooks/`, stato + logica, testati con `@testing-library/react`
  `renderHook` + jsdom): `useApiKeyConfig` (chiave API, modelli, config),
  `usePromptOptimizer(apiKey, selectedModel)` (input, anonimizzazione, i 5
  flussi, chiamata Gemini, risultato/variabili, copia/download),
  `useScaffoldGenerator(apiKey, selectedModel)` (modalità scaffold: chiamata
  Gemini per la sezione Progetto, assemblaggio, scrittura in cartella/ZIP),
  `useDebugLogging` (toggle log esteso).
- Logica pura testabile: `app/lib/` — `promptOptimizer.ts` (schema di risposta
  strutturata Gemini e parsing), `secureApiKeyStore.ts` (wrapper del Tauri
  store plugin), `anonymization.ts` (rilevamento/mascheramento PII, con
  validazione Luhn sulle carte per ridurre i falsi positivi), `nativeDownload.ts`
  (invoca il comando Rust `save_text_file` per il salvataggio file — passa solo
  il contenuto, il dialog è lato Rust), `logger.ts` (wrapper
  `@tauri-apps/plugin-log`: scrive su console **e** sul file di log persistente
  con rotazione, senza mai lanciare se il runtime Tauri non è disponibile),
  `debugSwitch.ts` (legge/scrive il file `debug.on` che attiva il log esteso,
  via fs plugin scopato a `$APPCONFIG`), `scaffoldBuilder.ts` (assembla lo
  scaffold: splicing della sezione Progetto nei template verbatim),
  `scaffoldPackager.ts` (invoca `save_scaffold_to_dir` o costruisce lo ZIP con
  jszip e invoca `save_binary_file`), ciascuna con `*.test.ts` accanto (ambiente
  Node, no DOM).
- Costanti: `app/constants/prompts.ts` — istruzioni statiche dei 5 flussi +
  meta-prompt scaffold; `app/constants/scaffoldTemplate.ts` — **auto-generato**
  da `scripts/generate-scaffold-constants.mjs` (hook `prebuild`) a partire dai
  file canonici in `app/scaffold-template/` (CLAUDE.md/GEMINI.md/METHOD.md +
  profili); l'app è export statico e non può leggerli a runtime. Rigenera con
  `npm run generate:scaffold` dopo aver modificato i .md canonici.
- Backend desktop: `src-tauri/src/main.rs`, `src-tauri/src/lib.rs` (bootstrap
  Tauri + plugin store/dialog/fs/log; comandi `save_text_file`/
  `save_binary_file`/`save_scaffold_to_dir` che aprono il dialog nativo lato
  Rust e scrivono — nessun percorso passato dal frontend; check del
  debug-switch `debug.on` all'avvio).
- Config Tauri: `src-tauri/tauri.conf.json` · `src-tauri/capabilities/default.json`.
- Documentazione: `docs/METHOD.md` (metodologia) ·
  `docs/prompt-engineering-best-practices.md` (ricerca best practice prompt
  engineering, per casistica) · `handover.md` (stato/roadmap storica).
- Percorsi **rigidi**: usare sempre questi, non variarli. Costanti/prompt di
  sistema in `app/constants/`, componenti JSX in `app/components/`, stato/logica
  in `app/hooks/` — `page.tsx` resta solo orchestrazione (vedi sopra).

## Comandi del progetto (concreti ed eseguibili)
- Setup ambiente: `npm install` (frontend) — Rust/Cargo toolchain richiesto per
  la build Tauri (non gestito da npm).
- Avvio / run: `npm run tauri dev` (o `npx tauri dev`) per la shell desktop
  completa (richiesto per testare store API key e download nativi); `npm run
  dev` avvia solo la webview Next.js nel browser, senza le API Tauri.
- Build (build unica, solo-API): `npm run tauri dev` e `npm run tauri build` —
  **senza alcun flag** — producono sempre e solo la versione solo-API/Gemini
  (provider Claude API + OpenAI API per Rifinisci/Valuta). Nessuna feature
  Cargo, nessuna dipendenza da un CLI locale.
- Test (definisce la **baseline verde**): `npm test` (Vitest, `vitest run`).
- Lint / format: `npm run lint` (ESLint 9 + eslint-config-next); nessun
  formatter dedicato configurato (Prettier assente).
- **Gate** — *Definition of Done del singolo passo; l'agente lo esegue e ne legge
  l'**uscita** prima di dichiarare "ho finito"*: `npm run lint && npm test`
  (nota: `npm run lint` oggi segnala anche errori preesistenti su codice non
  ancora rifattorizzato in `page.tsx` — non bloccanti per un passo che non
  tocca quelle righe, ma da ripulire quando si rifattorizza quel file).

## Profilo di piattaforma — Profilo A (Desktop / portable)
- **Distribuzione**: Tauri bundler produce sia eseguibile standalone sia
  installer (`.msi`/NSIS) — allineato al default "portatile" raccomandato.
  **Code signing volutamente fuori scope**: nessuna opzione gratuita
  realistica esiste (i certificati self-signed non eliminano l'avviso
  SmartScreen di Windows), quindi non è nel backlog.
- **Versione/asset**: `tauri.conf.json` ha `"version": "../package.json"` —
  `package.json` è la fonte unica di verità per il SemVer (meccanismo
  ufficiale Tauri, non più un duplicato manuale).
- **CSP**: configurata in `tauri.conf.json` (`default-src 'self'`; `connect-src`
  aperto solo verso `generativelanguage.googleapis.com`; `style-src` con
  `'unsafe-inline'` per Tailwind/Next). **Non verificata in una finestra reale**
  — va controllata con `npm run tauri dev` per eventuali violazioni CSP in
  console prima di considerarla definitiva.
- **CI**: `.github/workflows/ci.yml` — su push/PR: `npm ci` → `npm run lint` →
  `npm test` → `npm run build` (tutti bloccanti). Repo collegato a GitHub
  (`https://github.com/CalvinTTooS/Prompt_optimizer`), pipeline verificata
  verde. Non include la build Tauri completa (installer): servirebbe un
  runner Windows; con runtime Tauri "congelato" nel bundle, la matrice minima
  per quella build sarebbe solo l'OS target (Windows; eventuale estensione
  macOS/Linux da decidere).
- **Diagnostica remota**: `tauri-plugin-log` attivo sia in debug (livello
  Debug) sia in release (livello Info), con i target di default del plugin
  (stdout + file nella cartella log dell'app, rotazione `KeepOne` a 40KB) — non
  serve configurazione custom, sono i default del plugin. Il frontend logga via
  `app/lib/logger.ts` (console + file). Il livello Debug si attiva anche in
  release se esiste un file vuoto `debug.on` in `%APPDATA%\com.prompt.optimizer\`
  (controllato lato Rust prima che qualsiasi finestra esista, quindi copre
  anche i crash all'avvio — nessun terminale richiesto: si può creare a mano
  via Esplora File, o tramite il toggle "🐞 Log esteso" in-app, che scrive lo
  stesso file via `app/lib/debugSwitch.ts`; il toggle richiede comunque un
  riavvio per applicarsi, dato che il livello di log Rust si fissa all'avvio.
  **Ancora assente**: mascheramento esplicito di dati sensibili nei path — da
  rivedere se emergono PII nei log.
