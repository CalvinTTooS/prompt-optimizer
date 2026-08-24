// Test dataset for the manual best-practice evaluation. Each case is a raw
// input prompt plus the flow(s) it should be run through. Mix of prompts
// derived from the user's esempi e test/ESEMPIO*.txt and fresh curated ones,
// spread across all output genres. Not secret — committed as the eval corpus.

export type EvalFlow = 'chat' | 'cowork' | 'code' | 'systemUser' | 'gemini' | 'scaffold';

export interface EvalCase {
  id: string;
  title: string;
  input: string;
  flows: EvalFlow[];
}

export const EVAL_CASES: EvalCase[] = [
  // --- Chatbot conversazionale ---
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
  // --- Claude Code (genere CLAUDE.md / task CLI) ---
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
    title: 'Prompt generico (da ESEMPIO 1)',
    input: 'Vorrei che mi creassi un corso di finanza personale e investimento di base.',
    flows: ['code'],
  },
  // --- Claude Cowork (agente collaborativo in workspace) ---
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
  // --- System + User Prompt ---
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
  // --- File istruzioni Gemini (GEMINI.md) ---
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
  // --- Modalità "Genera istruzioni di progetto" (scaffold) ---
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
];
