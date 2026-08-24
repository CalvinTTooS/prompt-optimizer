Handover Context: Prompt Optimizer

Questo documento serve come riassunto dello stato del progetto per riprendere lo sviluppo su un altro PC o in una nuova sessione con un assistente AI.

Per il metodo di lavoro e le direttive di progetto vincolanti, vedi `CLAUDE.md` (direttive specifiche) e `docs/METHOD.md` (metodologia stabile). Questo file resta uno storico/riassunto discorsivo, non la fonte di verità operativa.

🛠️ Stack Tecnologico

Frontend: React 19 (Next.js 16, App Router, `output: 'export'`) + TypeScript + Tailwind CSS 4 (gestito all'interno della cartella prompt-optimizer).

Backend & Desktop Packaging: Tauri 2 (Rust) per compilare l'app in un eseguibile nativo standalone .exe, con i plugin `tauri-plugin-store` (API key), `tauri-plugin-dialog` + `tauri-plugin-fs` (download nativi), `tauri-plugin-log` (log persistente su file, attivo sia in debug sia in release).

AI Integration: Google Generative AI SDK (@google/generative-ai) per connettersi ai modelli Gemini, in **modalità JSON strutturata** (`responseMimeType: "application/json"` + `responseSchema`) — niente più parsing/pulizia manuale dell'output.

Test: Vitest — ambiente Node (no DOM) per `app/lib/`, ambiente jsdom + `@testing-library/react` (`renderHook`) per `app/hooks/` (config in `vitest.config.ts`).

📂 Struttura del Progetto e File Chiave (Percorsi Relativi)

Tutti i percorsi sono relativi alla cartella principale del progetto Ottimizzatore Prompt:

Codice UI Principale: `app/page.tsx` — ~65 righe, solo orchestrazione: compone i 3 custom hook e i 5 componenti, zero stato/logica propri.

Componenti (`app/components/`, JSX puro, nessuno stato proprio, niente test dedicati):
- `SetupScreen` — schermata di configurazione iniziale.
- `AppHeader` — titolo, toggle log esteso, reset key.
- `PromptEditor` — input, anonimizzazione, formati di output, pulsante ottimizza.
- `ResultViewer` — analisi tecnica, variabili, output generati con copia/download.
- `MasterclassTips` — sezione statica, zero props.

Custom hook (`app/hooks/`, stato + logica, testati con `renderHook`):
- `useApiKeyConfig` — chiave API, modelli disponibili, salvataggio/reset.
- `usePromptOptimizer(apiKey, selectedModel)` — input, anonimizzazione, i 5 flussi, chiamata Gemini, risultato/variabili, copia/download.
- `useDebugLogging` — toggle log esteso.

Logica pura testabile (`app/lib/`, ciascuna con `*.test.ts` accanto):
- `promptOptimizer.ts` — schema di risposta strutturata Gemini (`buildResponseSchema`) e parsing (`parseOptimizerResponse`, con errore esplicito su risposta troncata per limite token).
- `secureApiKeyStore.ts` — wrapper `tauri-plugin-store` per la API key.
- `anonymization.ts` — rilevamento/mascheramento PII, con validazione Luhn sulle carte di credito.
- `nativeDownload.ts` — wrapper dialog nativo + `tauri-plugin-fs` per il salvataggio file.
- `logger.ts` — wrapper `@tauri-apps/plugin-log`: console + file persistente, mai un'eccezione se il runtime Tauri non c'è.
- `debugSwitch.ts` — legge/scrive il file `debug.on` in `%APPDATA%\com.prompt.optimizer\` che attiva il log esteso (letto lato Rust all'avvio, prima che esista una finestra).

Costanti: `app/constants/prompts.ts` — le istruzioni statiche dei 5 flussi di ottimizzazione.

Backend Rust: `src-tauri/src/main.rs` e `src-tauri/src/lib.rs` — bootstrap Tauri + registrazione plugin.

Configurazione Tauri: `src-tauri/tauri.conf.json` — versione con fonte unica di verità (`"version": "../package.json"`), CSP configurata, `src-tauri/capabilities/default.json` per i permessi dei plugin.

Documentazione: `CLAUDE.md` (direttive di progetto) · `docs/METHOD.md` (metodologia stabile, ex "Parte 1" del template) · `docs/prompt-engineering-best-practices.md` (ricerca best practice di prompt engineering per casistica, con fonti) · `CLAUDE.md.template` (template generico multi-progetto, da riusare altrove).

Eseguibile Standalone: `src-tauri/target/release/pop_app.exe` (generato dopo il build).

Installer per Windows: `src-tauri/target/release/bundle/` (contiene i pacchetti .msi e nsis).

💡 Funzionalità Attuali dell'Applicazione

Ottimizzazione Prompt: Prende un prompt in ingresso e genera fino a **cinque** varianti ottimizzate usando Gemini (in un'unica chiamata, checkbox indipendenti e combinabili):

Versione Chat: Ottimizzata per interazioni discorsive con tag XML (Claude/Gemini Web).

Claude Cowork: Ottimizzata per agenti collaborativi in workspace.

Claude Code: Istruzioni tecniche in Markdown stretto con percorsi file precisi (no link).

System + User Prompt: Divide il prompt in una coppia System Prompt / User Prompt secondo le convenzioni delle API (criterio: "questa istruzione resterebbe identica con dati diversi domani? sì→System, no→User"), con copia e download separati per ciascuna parte.

File istruzioni Gemini (GEMINI.md): Genera un file di contesto per Gemini CLI (genere GEMINI.md), consapevole delle convenzioni native del tool — caricamento gerarchico, "closest file wins", nome file configurabile, import modulari @file.md, interoperabilità con AGENTS.md. Download come `GEMINI.md`.

Modalità Scaffold strutturato: genera uno scaffold completo di istruzioni per agenti dal template dell'utente (v0.4). Gemini compila SOLO la sezione "Progetto"; le regole operative, `METHOD.md` e i profili restano verbatim. Produce `CLAUDE.md` + `GEMINI.md` (parte operativa verbatim + Progetto compilato) + `METHOD.md` + `profiles/{desktop,android,web}.md`. Due output: scrittura diretta in una cartella scelta (dialog+fs, crea `profiles/`) o download ZIP (jszip). Il template canonico vive in `app/scaffold-template/`; le costanti embedded sono auto-generate da `scripts/generate-scaffold-constants.mjs`. Rispetta le BP: CLAUDE.md resta ~94 righe + Progetto, METHOD.md referenziato non inlinato.

Anonimizzazione Dati Sensibili (PII): Rileva automaticamente (tramite Regex, con validazione Luhn sulle carte per ridurre i falsi positivi) o manualmente (selezionando il testo) email, numeri di telefono, carte di credito e CCV, sostituendoli con segnaposto (es. [EMAIL_1]) prima di inviare il prompt a Gemini, per poi ripristinarli nell'output finale. Un valore già noto viene sempre mascherato col placeholder esistente, anche se ricompare in un testo non ancora processato.

Configurazione Dinamica Modelli: Carica dinamicamente i modelli Gemini abilitati per la generazione di testo direttamente tramite la API Key fornita dall'utente.

Persistenza sicura: la API key è salvata via `tauri-plugin-store` (non più `localStorage` in chiaro); richiede `npm run tauri dev` per funzionare (non disponibile in `npm run dev` browser puro).

Download nativi: i file generati (Cowork, Code, System, User) si salvano tramite dialog "Salva con nome" nativo + `tauri-plugin-fs`, non più un blob HTML.

Diagnostica: log persistente su file (rotazione automatica) sia in sviluppo sia in release, tramite `tauri-plugin-log`; il frontend logga sia su console sia sul file via `app/lib/logger.ts`. Log esteso attivabile senza terminale: file `debug.on` in `%APPDATA%\com.prompt.optimizer\` (creabile a mano o via il toggle "🐞 Log esteso" in-app), utile anche per il supporto remoto — richiede un riavvio per applicarsi.

🚀 Prossimi Passaggi e Migliorie Proposte

Le migliorie storiche di questo documento (refactoring frontend, integrazione Tauri nativa, JSON mode, anonimizzazione) sono state **completate**. Le aree aperte, in ordine di priorità:

CI/CD: **fatto**.
- Repo collegato a GitHub (`https://github.com/CalvinTTooS/Prompt_optimizer`), pipeline verificata verde (lint → test → build). Non include la build Tauri completa (installer): serve un runner Windows.

Verifica manuale in finestra reale:
- `run.bat` (root del repo) lancia `npm run tauri dev` con un doppio click, per verificare a mano store, download nativi, CSP e logging in una finestra reale.

Scomposizione di `page.tsx`: **fatto** — 5 componenti in `app/components/` + 3 custom hook in `app/hooks/` (con test via `@testing-library/react`), `page.tsx` ridotto a ~65 righe di sola orchestrazione.

Flusso 5 — File istruzioni Gemini (GEMINI.md): **fatto** — quinto flusso di output, con ricerca best practice dedicata in `docs/prompt-engineering-best-practices.md` (sezione "File di istruzioni per Gemini").

Integrazione template scaffold: **fatto** — realizzata come modalità "Scaffold strutturato" (vedi sopra), a partire dal template multi-file v0.4 consegnato dall'utente in `esempi e test/ClaudeMD_creator/` e copiato come fonte di verità in `app/scaffold-template/`. Spec in `docs/superpowers/specs/2026-07-20-scaffold-mode-design.md`. Audit del template contro le BP: solido; rifiniture opzionali (rimando ad AGENTS.md in CLAUDE.md, import @file.md al posto del copia-incolla profili) non applicate su scelta dell'utente.

Diagnostica remota, iterazione 2: **fatto** — file-switch `debug.on` (letto da Rust all'avvio, copre anche i crash) + toggle in-app equivalente, nessun terminale richiesto. Ancora assente: mascheramento esplicito di eventuali dati sensibili nei log.

Code signing dei binari: **escluso dal backlog**, nessuna opzione gratuita realistica esiste (i certificati self-signed non eliminano l'avviso SmartScreen di Windows).
