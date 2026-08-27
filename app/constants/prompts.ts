export const FLOW_CHAT_INSTRUCTIONS = `
          === FLUSSO 1: CLAUDE CHAT (Web UI) ===
          - Obiettivo: ottimizzare per l'interazione umana, discorsiva e iterativa.
          - Struttura: usa i tag XML <role>, <context>, <goal>, <output_format>. Apri e chiudi ciascun tag (</role>, </context>, </goal>, </output_format>): un tag lasciato aperto annulla il vantaggio della delimitazione, perché il modello non distingue più dove finisce una sezione e dove inizia la successiva.
          - Stile: naturale e chiaro, con le istruzioni in sequenza.
          - Few-shot condizionale: se il task ha un formato ripetuto (tabella, classificazione, estrazione, trasformazione strutturata), includi un esempio input→output dentro <output_format>. Se il task è aperto (narrazione, spiegazione, consiglio, scrittura creativa), investi invece in <role> e <output_format>: su un task aperto un esempio inventato àncora il modello a un caso particolare invece di guidarlo.
          - Domanda di follow-up: includila nei task conversazionali o esplicativi. Su un output chiuso (una tabella, una riscrittura, una classificazione) è rumore, perché la risposta è già completa.
          `;

export const FLOW_COWORK_INSTRUCTIONS = `
          === FLUSSO 2: CLAUDE COWORK (Workspace Agent) ===
          - Obiettivo: ottimizzare per un agente collaborativo in un ambiente di lavoro condiviso.
          - Struttura: usa i tag <system>, <workspace_context>, <primary_task>, <collaboration_rules>, aprendo e chiudendo ciascuno di essi.
          - Confini e approvazioni: dichiara che cosa l'agente può modificare, che cosa deve lasciare intatto, e in quali momenti si ferma a chiedere conferma. In un workspace condiviso una modifica non concordata è costosa da annullare, quindi i confini vanno scritti invece che lasciati impliciti.
          `;

// FLUSSO 3 AGGIORNATO: INTERNAL CONSISTENCY, NO LOOPHOLES, STRICT PATHS
export const FLOW_CODE_INSTRUCTIONS = `
          === FLUSSO 3: CLAUDE CODE (CLI Agent) ===
          - Obiettivo: Ottimizzare per l'esecuzione autonoma nel terminale locale.
          - Struttura: Markdown puro e strutturato, senza tag XML: l'agente CLI legge file di istruzioni in Markdown, e i tag lo porterebbero a trattare il prompt come dati da elaborare.
          - Regole del formato:
            1. "Context First & Strict Paths": inizia con '## Contesto del progetto'. Scrivi i percorsi dei file locali in backtick (es. \`src/main.py\`), perché l'agente li usa come percorsi reali; un link Markdown come [main.py](http://main.py) lo porterebbe invece a cercare una risorsa remota inesistente.
            2. "Internal Consistency": usa gli stessi nomi di file e cartelle in tutto il prompt. Se dichiari \`docs/course/\` nel Contesto, riprendi quel percorso identico nel Piano e nelle Istruzioni Operative: l'agente crea le cartelle che legge, quindi una variazione produce due alberi diversi.
            3. "Architectural Clarity": fai scelte architetturali nette. Formula ogni decisione in modo che abbia una sola lettura possibile, evitando riserve come "se non per i template iniziali": una zona d'ombra costringe l'agente a decidere da solo, e lo farà in modo diverso a ogni esecuzione.
            4. "Plan Mode Mechanics": inserisci '## Generazione del Piano Operativo' subito dopo il contesto. Chiedi all'agente di presentare un piano numerato e di "FERMARSI ATTENDENDO APPROVAZIONE" prima delle istruzioni operative, così l'utente intercetta un piano sbagliato prima che diventi lavoro svolto.
            5. "Safety & Branching": nelle istruzioni operative, fai lavorare l'agente su un branch separato (es. 'git checkout -b'), così il ramo principale resta ripristinabile se l'esecuzione va storta.
            6. "True Dynamic Generation": descrivi i requisiti del contenuto (scopo, tono, argomenti) e fai generare i file con i tool nativi (write_file), invece di incorporarne il testo nel prompt: un contenuto incollato nel prompt non è più aggiornabile dall'agente e gonfia il contesto. Nel prompt generato chiedi contenuti completi, elencando i segnaposto da evitare ('[TODO]', '<INSERIRE CONTENUTO>', '...'), perché un file consegnato con segnaposto richiede comunque un secondo passaggio umano.
            7. "Dependency Awareness": distingui la libreria standard (es. 'pathlib') dai pacchetti esterni. Se il progetto usa un ambiente virtuale, indica l'interprete col percorso completo (es. '.venv/bin/python'), perché ogni comando bash parte in una subshell che non eredita l'attivazione. Se il linguaggio non è desumibile dall'input, dichiara l'assunzione che stai facendo invece di lasciarla implicita.
            8. "Deterministic Verification": chiedi verifiche eseguibili (es. 'py_compile'). Se il piano prevede 'pytest', fai creare i file di test prima di eseguirli, e formula le verifiche in modo incondizionato: una verifica del tipo "se esistono, esegui i test" può essere soddisfatta senza eseguire nulla.
            9. "Logging & Memory": fai aggiornare 'WORK_LOG.md' e mantenere un loop di auto-miglioramento su 'lessons.md' (dopo ogni correzione dell'utente: annota una regola sintetica — cosa evitare o fare, col perché; rileggi 'lessons.md' a inizio sessione; promuovi le lezioni stabili in 'CLAUDE.md' e rimuovile da 'lessons.md', così resta memoria di lavoro e non un archivio). Fai leggere 'CLAUDE.md' all'inizio e lascialo invariato: contiene le direttive di progetto decise dall'utente, che l'agente riceve ma non negozia.
            10. "No Human Reminders": scrivi il prompt come se l'unico lettore fosse l'agente. Un promemoria rivolto all'utente resterebbe senza destinatario, perché nessuno lo legge durante l'esecuzione.
          `;

export const FLOW_SYSTEM_USER_INSTRUCTIONS = `
          === FLUSSO 4: SYSTEM PROMPT + USER PROMPT (API strutturata) ===
          - Obiettivo: Dividere il prompt grezzo in una coppia System Prompt / User Prompt secondo le convenzioni delle API (campo "system" vs turno "user").
          - Criterio di instradamento, da applicare a ogni frammento del prompt: "questa istruzione resterebbe identica se l'utente rieseguisse il task domani con dati diversi?". Se sì → System Prompt. Se no → User Prompt. È il criterio che rende il System riutilizzabile fra esecuzioni: tutto ciò che cambia da una volta all'altra appartiene allo User.
          - Verso il System Prompt: ruolo/persona, vincoli di stile/tono/lunghezza, formato di output, regole di sicurezza o guardrail, esempi few-shot riutilizzabili.
          - Verso lo User Prompt: la richiesta concreta, i dati o documenti specifici di questa esecuzione (se lunghi, mettili all'inizio del blocco User), le domande puntuali.
          - Regole del formato: lo User Prompt contiene sempre almeno il task concreto — se l'input descrive solo un ruolo e nessun compito, formula tu un primo task esemplificativo coerente col ruolo, perché una coppia con lo User vuoto non è eseguibile via API. Evita di ripetere lo stesso contenuto nei due campi: una regola duplicata diventa due regole da tenere allineate. Se una frase mescola un'istruzione persistente e un dato di questa richiesta, separale invece di lasciarle insieme.
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
          - Regole del formato:
            1. "Hierarchical Awareness": Gemini CLI carica e CONCATENA i file gerarchicamente (globale \`~/.gemini/\` → root progetto → sottodirectory), con "closest file wins". Genera contenuto adatto al livello dichiarato dall'utente (se non dichiarato, assumi root di progetto) e NON ripetere regole che apparterrebbero a un livello superiore.
            2. "Filename Neutrality": il nome del file è configurabile (\`context.fileName\`, può essere \`AGENTS.md\`). Riferisciti al file per il suo ruolo e non per il nome — evita formule come "questo GEMINI.md" — perché il contenuto deve restare valido anche se l'utente lo rinomina o lo aliasa.
            3. "AGENTS.md Interoperability": Includi sezioni compatibili con lo standard aperto AGENTS.md: comandi build/test, code style, convenzioni di commit/PR.
            4. "Verifiable Specificity": dai comandi di build e test concreti ed eseguibili (es. \`npm test\`), perché l'agente li lancia davvero e una frase come "scrivi codice pulito" o "testa le tue modifiche" non è eseguibile. Se l'input non dichiara la toolchain, scegli la convenzione più diffusa per quel linguaggio, dichiara l'assunzione in una riga (es. "assumo npm; sostituisci se il progetto usa un altro gestore") e fornisci comunque i comandi concreti sotto quell'assunzione: un comando dichiaratamente assunto è correggibile, una frase generica no.
            5. "Modularity (@import)": Se l'input è lungo o copre più aree, proponi uno scheletro con import modulari \`@path/to/file.md\` verso sotto-file tematici, invece di un unico blob monolitico.
            6. "Reason-before-act": Istruisci l'agente a pianificare ed elencare i file che modificherà PRIMA di agire, e a fornire il contesto prima e l'istruzione specifica alla fine.
            7. "No Auto-reload Assumptions": NON scrivere contenuti che presuppongano riletture automatiche durante la sessione (l'utente deve lanciare \`/memory refresh\` a mano dopo una modifica). Le istruzioni devono essere stabili.
            8. "Self-improvement Memory": Prevedi un loop di auto-miglioramento su file \`lessons.md\`: dopo ogni correzione dell'utente l'agente annota una regola sintetica (cosa evitare/fare + perché) e rilegge \`lessons.md\` a inizio sessione; le lezioni stabili vanno promosse nel file di istruzioni principale e rimosse da \`lessons.md\`. Riferisciti al file di istruzioni per ruolo, non per nome (vedi regola 2).
            9. "No Human Reminders": Il file parla SOLO all'agente. Nessun promemoria rivolto all'utente umano.
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

REGOLE DEL FORMATO:
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

