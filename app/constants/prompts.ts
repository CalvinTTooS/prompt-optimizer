export const FLOW_CHAT_INSTRUCTIONS = `
          === FLUSSO 1: CLAUDE CHAT (Web UI) ===
          - Obiettivo: Ottimizzare per l'interazione umana, discorsiva e iterativa.
          - Struttura: Usa tag XML standard (<role>, <context>, <goal>, <output_format>).
          - Stile: Naturale, chiaro, focalizzato su istruzioni passo-passo.
          - Few-shot CONDIZIONALE: se il task ha un formato/pattern ripetuto (tabella, classificazione, estrazione, trasformazione strutturata), includi UN esempio concreto input→output dentro <output_format>. Se il task è aperto (narrazione, spiegazione, consiglio, scrittura creativa), NON inventare esempi: investi invece in <role> e <output_format>.
          - Domanda di follow-up SOLO per i task conversazionali/esplicativi, non per quelli a output chiuso (una tabella, una riscrittura, una classificazione).
          `;

export const FLOW_COWORK_INSTRUCTIONS = `
          === FLUSSO 2: CLAUDE COWORK (Workspace Agent) ===
          - Obiettivo: Ottimizzare per un agente collaborativo in un ambiente di lavoro condiviso.
          - Struttura: Usa tag orientati al workspace (<system>, <workspace_context>, <primary_task>, <collaboration_rules>).
          - Regole specifiche: Definisci i confini dell'agente (cosa può/non può modificare) e istruzioni su quando chiedere feedback umano.
          `;

// FLUSSO 3 AGGIORNATO: INTERNAL CONSISTENCY, NO LOOPHOLES, STRICT PATHS
export const FLOW_CODE_INSTRUCTIONS = `
          === FLUSSO 3: CLAUDE CODE (CLI Agent) ===
          - Obiettivo: Ottimizzare per l'esecuzione autonoma nel terminale locale.
          - Struttura: Markdown puro e strutturato (NIENTE tag XML verbosi).
          - Regole TASSATIVE (pena il fallimento e la regressione del prompt):
            1. "Context First & STRICT Paths": Inizia con '## Contesto del progetto'. Usa ESCLUSIVAMENTE path racchiusi in backtick (es. \`src/main.py\`). È ASSOLUTAMENTE VIETATO formattare i file locali come link Markdown testuali (vietato: [main.py](http://main.py)). Pena: fallimento generazione.
            2. "Internal Consistency": Mantieni coerenza assoluta nei nomi dei file e delle directory. Se definisci una cartella nel Contesto (es. \`docs/course/\`), usa ESATTAMENTE la stessa cartella nel Piano e nelle Istruzioni Operative. Niente variazioni arbitrarie.
            3. "Architectural Clarity (No Loopholes)": Fai scelte architetturali nette e deterministiche. Evita frasi ambigue o scappatoie come "se non per i template iniziali". Definisci chiaramente come i testi/codici verranno generati senza lasciare zone d'ombra.
            4. "Plan Mode Mechanics": Inserisci '## Generazione del Piano Operativo' subito dopo il contesto. Ordina all'agente di presentare un piano numerato e di "FERMARSI ATTENDENDO APPROVAZIONE" prima di elencare le istruzioni operative.
            5. "Safety & Branching": Nelle istruzioni operative, ordina di lavorare SEMPRE su un branch separato (es. 'git checkout -b').
            6. "True Dynamic Generation (Native Tools)": NON hardcodare il contenuto dei file nel prompt. Descrivi i requisiti (scopo, tono, argomenti) e ordina di usare tool nativi (write_file). OBBLIGATORIO definire cosa sia un placeholder: vieta espressamente pattern come '[TODO]', '<INSERIRE CONTENUTO>', '...'.
            7. "Dependency & Virtualenv Awareness": Distingui Standard Library (es. 'pathlib') da pacchetti esterni. Comandi bash girano in subshell: DEVE usare path assoluti per l'ambiente virtuale (es. '.venv/bin/python').
            8. "Deterministic Verification": Richiedi verifiche reali (es. 'py_compile'). Se richiedi 'pytest', DEVI ordinare all'agente di creare i file di test prima di eseguirli. Niente verifiche condizionali ("se esistono...").
            9. "Logging & Memory": Ordina di aggiornare 'WORK_LOG.md'. È VIETATO MODIFICARE 'CLAUDE.md', ma è OBBLIGATORIO LEGGERLO all'inizio.
            10. "No Human Reminders": Il prompt parla SOLO all'agente. Nessun promemoria rivolto all'utente umano.
          `;

export const FLOW_SYSTEM_USER_INSTRUCTIONS = `
          === FLUSSO 4: SYSTEM PROMPT + USER PROMPT (API strutturata) ===
          - Obiettivo: Dividere il prompt grezzo in una coppia System Prompt / User Prompt secondo le convenzioni delle API (campo "system" vs turno "user").
          - Criterio di instradamento OBBLIGATORIO per ogni frammento del prompt: "questa istruzione resterebbe identica se l'utente rieseguisse il task domani con dati diversi?". Se SÌ → System Prompt. Se NO → User Prompt.
          - Verso il System Prompt: ruolo/persona, vincoli di stile/tono/lunghezza, formato di output, regole di sicurezza o guardrail, few-shot examples riutilizzabili.
          - Verso lo User Prompt: la richiesta/task concreto, dati o documenti specifici di questa esecuzione (anche se lunghi, posizionali all'inizio del blocco User), domande puntuali.
          - Regole TASSATIVE: lo User Prompt risultante non può MAI essere vuoto (deve contenere sempre almeno il task concreto); NON duplicare contenuto identico in entrambi i campi; se una frase mescola un'istruzione persistente con un dato di richiesta, separale esplicitamente invece di lasciarle ambigue.
          `;

// FLUSSO 5: file di istruzioni per Gemini CLI (genere GEMINI.md). Basato sulla
// ricerca in docs/prompt-engineering-best-practices.md ("File di istruzioni per
// Gemini"). Differenza chiave rispetto al FLUSSO 3 (CLAUDE.md): Gemini CLI carica
// e CONCATENA i file in modo gerarchico (globale → progetto → sottodirectory),
// con "closest file wins", nome file configurabile e import modulari @file.md.
export const FLOW_GEMINI_INSTRUCTIONS = `
          === FLUSSO 5: FILE ISTRUZIONI GEMINI (genere GEMINI.md) ===
          - Obiettivo: Generare un file di contesto/istruzioni per Gemini CLI (default \`GEMINI.md\`), analogo a CLAUDE.md ma adattato alle convenzioni native di Gemini CLI.
          - Struttura: Markdown puro, heading (\`##\`) e bullet ad alto segnale. Conciso e NON ridondante: ogni riga deve superare il test "se la rimuovessi, l'agente sbaglierebbe?".
          - Regole TASSATIVE:
            1. "Hierarchical Awareness": Gemini CLI carica e CONCATENA i file gerarchicamente (globale \`~/.gemini/\` → root progetto → sottodirectory), con "closest file wins". Genera contenuto adatto al livello dichiarato dall'utente (se non dichiarato, assumi root di progetto) e NON ripetere regole che apparterrebbero a un livello superiore.
            2. "Filename Neutrality": Il nome del file è configurabile (\`context.fileName\`, può essere \`AGENTS.md\`). È VIETATO auto-referenziare il file come "questo GEMINI.md" o dipendere dal suo nome fisico: il contenuto deve funzionare anche se rinominato/aliasato.
            3. "AGENTS.md Interoperability": Includi sezioni compatibili con lo standard aperto AGENTS.md: comandi build/test, code style, convenzioni di commit/PR.
            4. "Verifiable Specificity": Comandi build/test CONCRETI e verificabili (es. \`npm test\`), MAI frasi generiche tipo "scrivi codice pulito" o "testa le tue modifiche".
            5. "Modularity (@import)": Se l'input è lungo o copre più aree, proponi uno scheletro con import modulari \`@path/to/file.md\` verso sotto-file tematici, invece di un unico blob monolitico.
            6. "Reason-before-act": Istruisci l'agente a pianificare ed elencare i file che modificherà PRIMA di agire, e a fornire il contesto prima e l'istruzione specifica alla fine.
            7. "No Auto-reload Assumptions": NON scrivere contenuti che presuppongano riletture automatiche durante la sessione (l'utente deve lanciare \`/memory refresh\` a mano dopo una modifica). Le istruzioni devono essere stabili.
            8. "No Human Reminders": Il file parla SOLO all'agente. Nessun promemoria rivolto all'utente umano.
          `;

// SCAFFOLD: meta-prompt per la modalità "Scaffold strutturato". Gemini compila
// SOLO la sezione "Progetto" del template (vedi app/scaffold-template/); la
// parte operativa e METHOD.md restano verbatim (assemblati da scaffoldBuilder.ts).
export const SCAFFOLD_PROGETTO_INSTRUCTIONS = `Sei un esperto di setup di progetti software. A partire dalla descrizione del progetto fornita dall'utente, compila la sezione "Progetto" di uno scaffold di istruzioni per agenti di coding.

Restituisci un oggetto JSON con un unico campo "progetto": una stringa Markdown che contiene ESATTAMENTE queste sottosezioni (heading di secondo livello, nell'ordine):

## Contesto
Obiettivo (cosa fa, per chi, perché), utenti, vincoli chiave. Riferimenti competitivi solo se pertinenti.

## Scelte architetturali vincolanti
Elenco puntato: Piattaforma/e target (se deducibile dalla descrizione indicala, altrimenti scrivi "da decidere"), Linguaggio, Framework / interfaccia, Persistenza / IO, Stack di test, Packaging / distribuzione.

## Organizzazione del codice
Percorsi rigidi di Sorgenti / Test / Asset (se deducibili; altrimenti proponi una convenzione ragionevole per lo stack).

## Comandi del progetto
Elenco puntato: Setup ambiente, Avvio / run, Test (baseline), Lint / format, e il **Gate** (comando unico che unisce lint + test, es. \`npm run lint && npm test\`).

## Profilo di piattaforma
NON forzare una piattaforma. Scrivi l'istruzione: scegliere un profilo da \`profiles/\` (desktop · android · web) e incollarne il contenuto qui quando la piattaforma è decisa; fino ad allora lavorare sul core agnostico (\`METHOD.md\` §1.1).

REGOLE TASSATIVE:
- Contenuto ad alto segnale e verificabile: comandi concreti, non frasi generiche.
- Se un'informazione non è deducibile dalla descrizione, usa un placeholder chiaro tra parentesi angolari (es. \`<da definire>\`), NON inventare dettagli falsi.
- NON riscrivere le regole operative dello scaffold (workflow, sicurezza, igiene): quelle sono fisse e non fanno parte del tuo output.
- Rispondi in italiano.`;

// Preamble prepended to few-shot example blocks injected into a flow's
// instruction. Examples are a MODEL to emulate, never copied verbatim.
export const FEW_SHOT_EXAMPLES_GUIDE = `--- ESEMPI DI RIFERIMENTO (few-shot) — per tutti i formati selezionati ---
Usa questi esempi come MODELLO da emulare per struttura, stile, rigore e livello di dettaglio. NON copiarli verbatim: adattali al nuovo task. NON alterare i segnaposto di anonimizzazione ([EMAIL_X], ecc.).`;

export const CLAUDE_REFINE_INSTRUCTIONS = `Sei un esperto di prompt engineering. Ricevi un prompt già ottimizzato da un altro modello e lo RIFINISCI secondo queste regole:
- Metti un blocco "Vincoli" esplicito in cima.
- Usa imperativi diretti, non domande.
- Usa placeholder {{...}} per i dati variabili invece di valori hardcoded.
- Rimuovi domande di follow-up: un prompt di produzione deve essere autosufficiente.
- Mantieni un esempio few-shot SOLO se il task è format-driven (output con struttura fissa); altrimenti rimuovilo.
- Rendi l'obiettivo verificabile con criteri di successo espliciti.
- NON alterare i segnaposto di anonimizzazione tipo [EMAIL_1], [PHONE_2], [CARD_3]: riportali identici nel prompt rifinito.

Restituisci ESCLUSIVAMENTE un oggetto JSON con esattamente due campi, senza testo prima o dopo, senza blocchi di codice markdown:
{"refined": "<il prompt rifinito completo>", "changes": "<2-4 frasi: cosa hai cambiato e perché>"}`;

export const CLAUDE_EVAL_INSTRUCTIONS = `Sei un esperto di prompt engineering. VALUTI (NON riscrivi) un prompt già ottimizzato, contro questi criteri:
- Obiettivo verificabile: c'è un criterio di successo chiaro?
- Vincoli espliciti: formato, lunghezza, tono, cosa NON fare?
- Ambiguità: termini vaghi o istruzioni interpretabili in più modi?
- Placeholder: i dati variabili sono {{...}} invece di valori hardcoded?
- Autosufficienza: nessuna domanda di follow-up all'utente (prompt di produzione)?
- Few-shot: esempio presente solo se il task è format-driven?
- Struttura: vincoli in cima, ordine sensato?

I segnaposti di anonimizzazione tipo [EMAIL_1], [PHONE_2] sono intenzionali: NON considerarli un difetto.

Restituisci ESCLUSIVAMENTE un oggetto JSON, senza testo prima o dopo, senza blocchi markdown:
{"verdict":"solido|migliorabile|da-rivedere","suggestion":"<1-2 frasi: se conviene rifinire e perché>","items":[{"criterion":"<criterio>","ok":true,"note":"<nota di una riga>"}]}
NIENTE punteggio numerico. "verdict" deve essere uno tra: solido, migliorabile, da-rivedere. "ok" è booleano.`;

export const CLAUDE_REFINE_PAIR_INSTRUCTIONS = `Sei un esperto di prompt engineering. Ricevi una COPPIA System+User già ottimizzata e la RIFINISCI. System e User sono un'unità: rendili coerenti tra loro (il System definisce ruolo/vincoli, lo User il compito). Regole:
- Vincoli in cima al System; imperativi diretti; placeholder {{...}} per i dati variabili; niente domande di follow-up; obiettivo verificabile.
- NON alterare i segnaposto di anonimizzazione tipo [EMAIL_1], [PHONE_2]: riportali identici.
Restituisci ESCLUSIVAMENTE un oggetto JSON, senza testo prima/dopo, senza markdown:
{"refinedSystem":"<system rifinito>","refinedUser":"<user rifinito>","changes":"<2-4 frasi: cosa hai cambiato e perché>"}`;

export const CLAUDE_EVAL_PAIR_INSTRUCTIONS = `Sei un esperto di prompt engineering. VALUTI (NON riscrivi) una COPPIA System+User come UNITÀ, inclusa la coerenza tra System e User, contro i criteri: obiettivo verificabile, vincoli espliciti, ambiguità, placeholder per i dati variabili, autosufficienza (niente follow-up), few-shot solo se format-driven, struttura. I segnaposto [EMAIL_1] ecc. sono intenzionali, non un difetto.
Restituisci ESCLUSIVAMENTE un oggetto JSON, senza testo prima/dopo, senza markdown:
{"verdict":"solido|migliorabile|da-rivedere","suggestion":"<1-2 frasi>","items":[{"criterion":"<criterio>","ok":true,"note":"<nota>"}]}
NIENTE punteggio numerico.`;

