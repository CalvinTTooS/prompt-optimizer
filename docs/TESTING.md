# TESTING.md — regole per non rompere i test

Regole operative per l'agente che modifica questa codebase, dedotte dalle
convenzioni già in uso in `app/**/*.test.ts`. Prima di dichiarare un passo
finito, il Gate resta `npm run lint && npm test` (vedi `CLAUDE.md`).

1. **Mock prima dell'import.** Tutti i test che toccano un plugin Tauri
   (`@tauri-apps/plugin-store`, `plugin-fs`, `plugin-log`, `plugin-dialog`)
   dichiarano `vi.mock(...)` in cima al file e importano il modulo reale
   **dopo**, con `await import('./modulo')` a livello di modulo (vedi
   `secureApiKeyStore.test.ts`, `scaffoldTemplateStore.test.ts`). Segui lo
   stesso ordine in ogni nuovo test: un `import` statico prima del mock lega il
   modulo alla versione non mockata e il test fallisce (o peggio, prova a
   toccare l'ambiente Tauri assente in Vitest).
2. **Nessuna chiamata reale a rete o filesystem nei test.** Gemini, Claude
   API/CLI, OpenAI e i plugin Tauri vanno sempre mockati (`vi.fn()`/
   `vi.mock`). Se un modulo nuovo introduce una dipendenza esterna, aggiungi il
   mock nello stesso commit del modulo, non in un passo successivo.
3. **`app/constants/scaffoldTemplate.ts` è generato, non va editato a mano.**
   È prodotto da `scripts/generate-scaffold-constants.mjs` a partire dai file
   canonici in `app/scaffold-template/`. Se modifichi quei `.md`, rilancia
   `npm run generate:scaffold` prima di eseguire i test: altrimenti
   `scaffoldTemplates.test.ts`/`scaffoldTemplateStore.test.ts` confrontano
   contenuto generato contro versione stantia e falliscono in modo poco
   leggibile.
4. **`app/lib/conformance.ts` e i prompt in `app/constants/prompts.ts` sono
   accoppiati.** `conformance.test.ts` verifica per `id` le singole regole di
   conformità dei 5 flussi (es. `code.noXmlTags`, `gemini.headings`). Se cambi
   una regola in un flusso (heading richiesto, tag vietato, ecc.), aggiorna la
   corrispondente funzione `check*` in `conformance.ts` nello stesso passo:
   altrimenti il test resta verde per il motivo sbagliato o rosso senza che il
   messaggio indichi la vera causa.
5. **I segnaposto di anonimizzazione sono un contratto, non testo libero.**
   Il formato `[EMAIL_N]`, `[TELEFONO_N]`, `[CARTA_N]`, `[CCV_N]` (maiuscole,
   underscore, indice numerico) deve restare esattamente questo in
   `anonymization.ts` e in ogni prompt generato: un carattere alterato rompe il
   ripristino del dato reale dell'utente. Se tocchi `anonymization.ts`, fai
   girare `anonymization.test.ts` per intero, incluso il branch di validazione
   Luhn sulle carte (riduce i falsi positivi: non rimuoverlo per "semplificare").
6. **Non introdurre `environment` per-file senza motivo.** `vitest.config.ts`
   usa `jsdom` globale per tutta la suite (lib **e** hook); non serve
   `// @vitest-environment node` nei test di `app/lib/`. Se un test di libreria
   sembra richiedere l'assenza del DOM, è più probabile un mock mancante che un
   problema di ambiente.
7. **`app/components/` non ha test propri per scelta**, non per dimenticanza
   (sono JSX puro, senza stato: vedi `CLAUDE.md`, sezione "Organizzazione del
   codice"). Se un componente inizia ad avere logica/stato proprio, quello
   stato va estratto in un hook in `app/hooks/` (con test jsdom +
   `renderHook`), non testato nel componente.
8. **Mai skippare, cancellare o allentare un'asserzione per far tornare verde
   la suite.** Un test rosso dopo una modifica è un segnale del comportamento
   cambiato, non del test da correggere: trova la causa (vedi
   `superpowers:systematic-debugging`) prima di toccare il test. Se il test
   codificava davvero un requisito superato, aggiornalo motivando il perché nel
   commit, non nel codice di produzione.
9. **Percorsi Rust (`src-tauri/`) non sono coperti da Vitest.** Modifiche a
   comandi Tauri (`save_text_file`, `save_binary_file`,
   `save_scaffold_to_dir`) vanno verificate a mano con `npm run tauri dev`:
   `npm test` che passa non garantisce nulla sul lato nativo.
