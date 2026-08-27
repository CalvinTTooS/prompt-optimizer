// Test dataset for the conformance evaluation harness.
//
// Each case is a raw input prompt plus the flow(s) it should be run through.
// The corpus is deliberately FIXED: changing it invalidates historical
// comparisons, so treat additions as a versioned change (see docs/audit-*).
//
// Provenance matters here. Most cases were written by the project owner
// WITHOUT knowledge of the rules the checker verifies — that independence is
// what makes them useful as a test set. Cases marked `note` were added to
// cover flows the owner's lists did not reach (code/gemini/scaffold), and are
// deliberately shaped to stress specific rules.
//
// Sizing rationale: ~10 cases per rule-heavy flow. Enough to FALSIFY a rule
// ("this is violated at least sometimes"), not enough to CERTIFY one. A rule
// passing 10/10 says little; a rule failing 4/10 says a lot.

export type EvalFlow = 'chat' | 'cowork' | 'code' | 'systemUser' | 'gemini' | 'scaffold';

export interface EvalCase {
  id: string;
  title: string;
  input: string;
  flows: EvalFlow[];
  /** Which rule(s) this case is meant to stress. Documentation only. */
  note?: string;
}

export const EVAL_CASES: EvalCase[] = [
  // ==========================================================================
  // CHAT — conversational, XML-tagged output
  // ==========================================================================
  {
    id: 'chat-fotosintesi',
    title: 'Spiegazione divulgativa per bambini',
    input: 'Spiegami la fotosintesi come se avessi 10 anni.',
    flows: ['chat'],
  },
  {
    id: 'chat-email-scuse',
    title: 'Email di scuse a un cliente',
    input: 'Aiutami a scrivere una email di scuse a un cliente per un ritardo di consegna di 5 giorni.',
    flows: ['chat'],
  },
  {
    id: 'chat-titanic',
    title: 'Narrazione + domanda diretta (open-ended)',
    input: 'Raccontami gli eventi dell\'affondamento della nave inaffondabile agli inizi del secolo scorso. Come si chiamava?',
    flows: ['chat'],
  },
  {
    id: 'chat-ram-memoria',
    title: 'Spiegazione divulgativa tecnica',
    input: 'Spiegami in modo semplice la differenza tra la RAM e la memoria di massa di un computer.',
    flows: ['chat'],
  },
  {
    id: 'chat-trasloco',
    title: 'Consiglio pratico',
    input: 'Consigliami come organizzare un trasloco senza stress avendo solo due settimane di tempo.',
    flows: ['chat'],
  },
  {
    id: 'chat-giallo',
    title: 'Scrittura creativa',
    input: 'Scrivi l\'inizio di un racconto giallo ambientato in una biblioteca di notte.',
    flows: ['chat'],
  },
  {
    id: 'chat-tabella',
    title: 'Format-driven: tabella markdown',
    input: 'Trasforma questi appunti in una tabella markdown con colonne Attività, Priorità e Scadenza: comprare il regalo entro venerdì, priorità alta; chiamare il dentista, priorità media; pagare la bolletta della luce, urgente.',
    flows: ['chat'],
  },
  {
    id: 'chat-classificazione',
    title: 'Format-driven: classificazione',
    input: 'Classifica questi feedback dei clienti in Positivo, Neutro o Negativo: "servizio lento ma personale cortese"; "prodotto eccellente, lo consiglio"; "non lo ricomprerei".',
    flows: ['chat'],
  },
  {
    id: 'chat-riscrittura',
    title: 'Riscrittura di stile',
    input: 'Riscrivi questa frase in un tono più formale: "ehi, ci vediamo domani per fare il punto sul progetto?"',
    flows: ['chat'],
  },
  {
    id: 'chat-csv-assente',
    title: 'Contenuto assente: CSV mai fornito',
    input: 'Eccoti dei file in CSV, formattali in una tabella e dimmi cosa vedi.',
    flows: ['chat'],
    note: 'Contenuto assente. Verifica se il prompt generato inventa i dati o produce un segnaposto onesto.',
  },
  {
    id: 'chat-log-assente',
    title: 'Contenuto assente: log di sistema mai forniti',
    input: 'Guarda questi log di sistema e dimmi perché il server è andato in errore.',
    flows: ['chat'],
    note: 'Contenuto assente + diagnosi tecnica.',
  },
  {
    id: 'chat-news-impossibile',
    title: 'Richiesta impossibile: notizie del giorno + lunghezza sproporzionata',
    input: 'Scrivi un testo di 10 cartelle sulle notizie del giorno che riguardano la politica.',
    flows: ['chat'],
    note: 'Doppio impossibile: fatti non conoscibili dal modello + lunghezza irrealistica. Caso di stress.',
  },
  {
    id: 'chat-gatta-notte',
    title: 'Domanda ingenua brevissima',
    input: 'La mia gatta di notte fa sempre le corse, perché?',
    flows: ['chat'],
    note: 'Input molto corto e informale: verifica che l\'ottimizzatore non sovra-ingegnerizzi.',
  },
  {
    id: 'chat-docker-vm',
    title: 'Confronto tecnico',
    input: 'Spiegami la differenza tra Docker e una macchina virtuale.',
    flows: ['chat'],
  },

  // ==========================================================================
  // CODE — CLI agent task (genere CLAUDE.md), 10 regole tassative
  // ==========================================================================
  {
    id: 'code-rinomina-batch',
    title: 'Script CLI di rinomina file',
    input: 'Crea uno script Python che rinomina in batch tutti i file .jpg di una cartella aggiungendo la data di scatto come prefisso.',
    flows: ['code'],
  },
  {
    id: 'code-test-email',
    title: 'Aggiunta di test unitari',
    input: 'Aggiungi test unitari a un modulo JavaScript che valida indirizzi email.',
    flows: ['code'],
  },
  {
    id: 'code-corso-finanza',
    title: 'Prompt generico non-software su flusso code',
    input: 'Vorrei che mi creassi un corso di finanza personale e investimento di base.',
    flows: ['code'],
    note: 'Input fuori dominio per il flusso: verifica che le regole strutturali reggano comunque.',
  },
  {
    id: 'code-bash-backup',
    title: 'Script Bash di backup',
    input: 'Scrivimi uno script in Bash per fare il backup dei file sul server.',
    flows: ['code'],
  },
  {
    id: 'code-python-fix',
    title: 'Contenuto assente: codice da correggere mai fornito',
    input: 'Correggi questo pezzo di codice Python che non funziona.',
    flows: ['code'],
    note: 'Contenuto assente. Stressa R6 (divieto di segnaposto tipo [TODO]).',
  },
  {
    id: 'code-paginazione-api',
    title: 'Modifica multi-file su progetto esistente',
    input: 'Aggiungi la paginazione all\'endpoint /api/ordini di questo progetto Express e aggiorna i test di conseguenza.',
    flows: ['code'],
    note: 'Stressa R8 (verifica deterministica: i test vanno creati prima di eseguirli) e R5 (branch separato).',
  },
  {
    id: 'code-migrazione-vitest',
    title: 'Migrazione di toolchain',
    input: 'Migra i test del progetto da Jest a Vitest, aggiornando la configurazione e tutti gli import.',
    flows: ['code'],
    note: 'Stressa R2 (coerenza interna dei nomi di file e cartelle lungo tutto il piano).',
  },
  {
    id: 'code-memory-leak',
    title: 'Debugging di un difetto non localizzato',
    input: 'Trova e correggi la perdita di memoria nel worker che processa le immagini.',
    flows: ['code'],
    note: 'Stressa R3 (scelte nette, niente scappatoie ambigue) e R8 (verifica reale).',
  },
  {
    id: 'code-genera-docs',
    title: 'Generazione file con percorsi espliciti',
    input: 'Genera la documentazione API a partire dai docstring del modulo services/ e salvala in docs/api.md.',
    flows: ['code'],
    note: 'Stressa R1 deliberatamente: l\'input nomina due percorsi, tentando il modello a produrre link Markdown invece di backtick.',
  },
  {
    id: 'code-config-toml',
    title: 'Nuova funzionalità con contenuto da generare',
    input: 'Aggiungi il supporto per il file di configurazione .appconfig.toml con validazione dello schema e valori di default.',
    flows: ['code'],
    note: 'Stressa R6 (generazione dinamica via tool nativi, niente contenuto hardcoded né placeholder).',
  },

  // ==========================================================================
  // COWORK — agente collaborativo: confini + punti di approvazione umana
  // ==========================================================================
  {
    id: 'cowork-report-trimestrale',
    title: 'Bozza report + revisione col team',
    input: 'Prepara la bozza di un report trimestrale di vendite e coordina la revisione con il team.',
    flows: ['cowork'],
  },
  {
    id: 'cowork-revisione-marketing',
    title: 'Revisione documenti condivisi',
    input: 'Rivedi i documenti di marketing nella cartella condivisa del team e proponi migliorie, chiedendo conferma prima di modificare qualsiasi file.',
    flows: ['cowork'],
  },
  {
    id: 'cowork-senior-review',
    title: 'Revisione di codice in coppia',
    input: 'Fai finta di essere il mio senior developer e revisiona questo pezzo di codice.',
    flows: ['cowork'],
    note: 'Contenuto assente + definizione di ruolo collaborativo.',
  },
  {
    id: 'cowork-design-db',
    title: 'Progettazione passo-passo',
    input: 'Lavora con me passo dopo passo per progettare il database di una nuova piattaforma.',
    flows: ['cowork'],
    note: 'Stressa i punti di approvazione umana: "passo dopo passo" implica checkpoint.',
  },
  {
    id: 'cowork-refactoring-legacy',
    title: 'Refactoring con approvazione a ogni passo',
    input: 'Aiutami a fare il refactoring di questo modulo legacy spiegandomi cosa cambi volta per volta.',
    flows: ['cowork'],
    note: 'Richiesta esplicita di punti di approvazione: verifica che finiscano in <collaboration_rules>.',
  },
  {
    id: 'cowork-pair-test',
    title: 'Pair programming con divisione dei ruoli',
    input: 'Fai da pair programmer: io scrivo la funzione e tu scrivi subito i test unitari corrispondenti.',
    flows: ['cowork'],
    note: 'Definisce un confine netto dell\'agente: verifica che finisca nel prompt generato.',
  },
  {
    id: 'cowork-bug-async',
    title: 'Debugging collaborativo',
    input: 'Collaboriamo per trovare e risolvere un bug subdolo nella sincronizzazione asincrona dei dati.',
    flows: ['cowork'],
  },
  {
    id: 'cowork-brainstorming-rete',
    title: 'Brainstorming prima della decisione',
    input: 'Facciamo un brainstorming interattivo sull\'infrastruttura di rete prima di decidere i componenti.',
    flows: ['cowork'],
    note: 'Esplicita un "non decidere ancora": verifica i confini dell\'agente.',
  },

  // ==========================================================================
  // SYSTEM + USER — la regola critica: lo User non può MAI essere vuoto
  // ==========================================================================
  {
    id: 'sysusr-riassunto-articoli',
    title: 'Assistente riassunti scientifici',
    input: 'Voglio un assistente che riassuma articoli scientifici in 3 bullet, tono neutro, in italiano. Primo articolo da riassumere: [incolla qui il testo dell\'articolo].',
    flows: ['systemUser'],
  },
  {
    id: 'sysusr-traduttore',
    title: 'Bot traduttore EN→IT formale',
    input: 'Un bot che traduce testi dall\'inglese all\'italiano mantenendo un tono formale e lasciando invariati i termini tecnici.',
    flows: ['systemUser'],
  },
  {
    id: 'sysusr-json-strutturato',
    title: 'Format-driven: solo JSON',
    input: 'Trasforma questo testo non strutturato in un JSON valido.',
    flows: ['systemUser'],
    note: 'Contenuto assente + formato rigido.',
  },
  {
    id: 'sysusr-duplicati-elenchi',
    title: 'Confronto di due elenchi',
    input: 'Confronta questi due elenchi di nomi e indirizzi e trova i duplicati o le differenze.',
    flows: ['systemUser'],
    note: 'Contenuto assente. Task ricorrente con dati variabili: caso ideale per lo split.',
  },
  {
    id: 'sysusr-newsletter',
    title: 'Task ricorrente periodico',
    input: 'Crea una newsletter settimanale da mandare ai miei iscritti.',
    flows: ['systemUser'],
  },
  {
    id: 'sysusr-email-cliente-arrabbiato',
    title: 'Risposta a email, contenuto assente',
    input: 'Rispondi a questa email di un cliente arrabbiato dicendogli che stiamo risolvendo.',
    flows: ['systemUser'],
    note: 'Contenuto assente: la mail non c\'è. Stressa il divieto di User vuoto.',
  },
  {
    id: 'sysusr-verbale-riunione',
    title: 'Riassunto di documento lungo assente',
    input: 'Riassumi questo verbale di riunione lungo 5 pagine.',
    flows: ['systemUser'],
    note: 'Contenuto assente + dato posizionalmente lungo.',
  },
  {
    id: 'sysusr-cybersecurity',
    title: 'Solo ruolo, nessun task concreto',
    input: 'Comportati come un esperto di cybersecurity e rispondi solo a domande di analisi delle vulnerabilità.',
    flows: ['systemUser'],
    note: 'CASO CRITICO: l\'input non contiene alcun task. Stressa la regola "lo User Prompt non può MAI essere vuoto".',
  },
  {
    id: 'sysusr-supporto-it',
    title: 'Solo ruolo + tono, nessun task',
    input: 'Agisci come un assistente del supporto tecnico IT: sii sintetico, gentile e fai domande di diagnosi.',
    flows: ['systemUser'],
    note: 'CASO CRITICO: nessun task nell\'input.',
  },
  {
    id: 'sysusr-solo-json',
    title: 'Vincolo di formato assoluto, nessun task',
    input: 'Rispondi solo in formato JSON strutturato e non inserire mai testo discorsivo o commenti.',
    flows: ['systemUser'],
    note: 'CASO CRITICO: nessun task. Vincolo puro di formato.',
  },
  {
    id: 'sysusr-consulente-neutrale',
    title: 'Ruolo con guardrail di responsabilità',
    input: 'Sii un consulente finanziario neutrale che spiega i concetti senza dare consigli di investimento diretti.',
    flows: ['systemUser'],
    note: 'CASO CRITICO: nessun task. Il vincolo è un guardrail.',
  },
  {
    id: 'sysusr-copywriter-ironico',
    title: 'Ruolo con vincolo di tono',
    input: 'Prendi il ruolo di un copywriter senior con un tono ironico, diretto e senza frasi banali.',
    flows: ['systemUser'],
    note: 'CASO CRITICO: nessun task.',
  },
  {
    id: 'sysusr-revisore-legale',
    title: 'Ruolo analitico specialistico',
    input: 'Rispondi come un revisore legale pignolo evidenziando tutti i possibili rischi contrattuali.',
    flows: ['systemUser'],
    note: 'CASO CRITICO: nessun task.',
  },
  {
    id: 'sysusr-policy-non-so',
    title: 'Guardrail anti-allucinazione',
    input: 'Istruisci il modello a non usare mai informazioni non verificate e a dire "non so" se mancano dati.',
    flows: ['systemUser'],
    note: 'Corrisponde alla BP "give the model an out". Nessun task concreto.',
  },
  {
    id: 'sysusr-policy-sicurezza',
    title: 'Policy contro istruzioni pericolose',
    input: 'Definisci una policy di sistema per impedire che l\'AI accetti istruzioni pericolose o fuori contesto.',
    flows: ['systemUser'],
    note: 'Dominio prompt injection applicato al nostro stesso caso d\'uso.',
  },
  {
    id: 'sysusr-ticket-sla',
    title: 'Classificazione strutturata ricorrente',
    input: 'Crea un prompt di sistema per standardizzare l\'output di classificazione dei ticket in categorie ed SLA.',
    flows: ['systemUser'],
    note: 'Format-driven + ricorrente: il caso ideale per lo split System/User.',
  },
  {
    id: 'sysusr-solo-comandi-cli',
    title: 'Output ristretto a comandi eseguibili',
    input: 'Imposta un prompt che analizzi le richieste dell\'utente e generi solo i comandi CLI esatti da eseguire.',
    flows: ['systemUser'],
  },
  {
    id: 'sysusr-tabella-piu-elenco',
    title: 'Formato composto obbligatorio',
    input: 'Fai in modo che il modello risponda sempre con una tabella riassuntiva seguita da un elenco puntato.',
    flows: ['systemUser'],
    note: 'Vincolo di formato composto. Nessun task concreto.',
  },

  // ==========================================================================
  // GEMINI — file di istruzioni (genere GEMINI.md), 9 regole tassative
  // ==========================================================================
  {
    id: 'gemini-monorepo-node',
    title: 'GEMINI.md per monorepo Node',
    input: 'Genera le istruzioni per un monorepo Node con pnpm, TypeScript e Vitest.',
    flows: ['gemini'],
  },
  {
    id: 'gemini-python-uv',
    title: 'GEMINI.md per progetto Python',
    input: 'Istruzioni per un progetto Python che usa uv, ruff e pytest.',
    flows: ['gemini'],
  },
  {
    id: 'gemini-web-generico',
    title: 'Stack non specificato',
    input: 'Crea un file di istruzioni per un progetto web con frontend moderno e backend ad API.',
    flows: ['gemini'],
    note: 'Input volutamente vago. Stressa R4 (specificità verificabile): produce comandi concreti o frasi generiche?',
  },
  {
    id: 'gemini-typescript-pulito',
    title: 'Regole di stile per l\'assistente',
    input: 'Voglio un file markdown per spiegare all\'assistente come scrivere codice TypeScript pulito.',
    flows: ['gemini'],
    note: 'Stressa R2 (neutralità del nome file: l\'input dice "file markdown", non GEMINI.md).',
  },
  {
    id: 'gemini-non-rompere-test',
    title: 'Vincolo sui test',
    input: 'Fai un file di regole per l\'AI che lavora sulla nostra codebase per evitare che rompa i test.',
    flows: ['gemini'],
  },
  {
    id: 'gemini-commit-docs',
    title: 'Convenzioni di commit e documentazione',
    input: 'Scrivi le linee guida da mettere nel repo per documentare le funzioni e gestire i commit Git.',
    flows: ['gemini'],
    note: 'Stressa R3 (interoperabilità AGENTS.md: commit/PR conventions).',
  },
  {
    id: 'gemini-cloud-native',
    title: 'Pattern architetturali',
    input: 'Definisci lo stile architetturale e i pattern da seguire per una nuova applicazione cloud-native.',
    flows: ['gemini'],
  },
  {
    id: 'gemini-rust-crate',
    title: 'GEMINI.md per libreria Rust',
    input: 'Istruzioni per una libreria Rust pubblicata su crates.io, con clippy e cargo test.',
    flows: ['gemini'],
    note: 'Stack con comandi concreti verificabili: buon controllo su R4.',
  },
  {
    id: 'gemini-monorepo-gerarchico',
    title: 'Progetto multi-cartella',
    input: 'File di contesto per un progetto con più sottocartelle: una app web, un servizio worker e una libreria condivisa.',
    flows: ['gemini'],
    note: 'Stressa R1 (consapevolezza gerarchica) e R5 (modularità con import @file.md).',
  },
  {
    id: 'gemini-migrazioni-db',
    title: 'Divieto operativo esplicito',
    input: 'Regole per l\'agente in un repo dove le migrazioni del database non vanno mai eseguite automaticamente.',
    flows: ['gemini'],
    note: 'Vincolo negativo di sicurezza: verifica che diventi una regola chiara e verificabile.',
  },

  // ==========================================================================
  // SCAFFOLD — set completo di istruzioni di progetto
  // ==========================================================================
  {
    id: 'scaffold-ricette',
    title: 'Scaffold app desktop ricette',
    input: 'Un\'app desktop (Tauri + React) per gestire ricette di cucina, con salvataggio locale e ricerca per ingrediente.',
    flows: ['scaffold'],
  },
  {
    id: 'scaffold-api-go',
    title: 'Scaffold API REST Go',
    input: 'Una API REST in Go per un servizio di prenotazioni ristoranti, con database Postgres e autenticazione JWT.',
    flows: ['scaffold'],
  },
  {
    id: 'scaffold-estensione-browser',
    title: 'Scaffold estensione browser',
    input: 'Un\'estensione per browser che salva e organizza i frammenti di codice trovati sul web.',
    flows: ['scaffold'],
    note: 'Piattaforma non coperta dai profili desktop/android/web: verifica il fallback "da decidere".',
  },
  {
    id: 'scaffold-cli-fatture',
    title: 'Scaffold tool a riga di comando',
    input: 'Un tool a riga di comando in Python per convertire fatture PDF in CSV.',
    flows: ['scaffold'],
  },
  {
    id: 'scaffold-android-spese',
    title: 'Scaffold app Android',
    input: 'Un\'app Android per registrare le spese condivise tra coinquilini.',
    flows: ['scaffold'],
    note: 'Piattaforma esplicita: verifica la selezione del profilo android.',
  },
  {
    id: 'scaffold-cloud-native',
    title: 'Scaffold con vincoli architetturali',
    input: 'Definisci lo stile architetturale e i pattern da seguire per una nuova applicazione cloud-native.',
    flows: ['scaffold'],
  },
];
