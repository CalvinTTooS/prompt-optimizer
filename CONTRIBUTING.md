# Contributing

Grazie per l'interesse! Questo è un'app desktop **Tauri 2 + Next.js** (static
export) **+ React 19 + TypeScript**, con backend **Rust** minimale.

## Setup

```bash
npm install            # dipendenze frontend
# È richiesta la toolchain Rust/Cargo per la build Tauri
npm run tauri dev      # shell desktop completa (API-only, nessun feature flag)
```

`npm run dev` da solo avvia solo la webview Next.js nel browser, **senza** le API
Tauri (store, download nativi): non basta per usare l'app.

## Gate (Definition of Done)

Prima di aprire una PR il gate deve essere **verde**:

```bash
npm run lint && npm test
```

- **Test**: Vitest (`npm test`). Ambiente Node per `app/lib/`; jsdom +
  `@testing-library/react` (`renderHook`) per `app/hooks/`. I componenti in
  `app/components/` sono JSX stateless e non hanno test dedicati.
- **Lint**: ESLint 9 (`npm run lint`).
- **Rust**: per modifiche a `src-tauri/`, esegui `cargo check` / `cargo test`.

## Organizzazione del codice

- Costanti/prompt di sistema → `app/constants/`
- Componenti JSX **stateless** → `app/components/`
- Stato + logica (hook, testati) → `app/hooks/`
- Logica pura (testata) → `app/lib/`
- `app/page.tsx` resta **solo orchestrazione** (compone hook e componenti).

## Documentare le funzioni

- **Commento `/** ... */` in inglese** su ogni funzione esportata di
  `app/lib/` e `app/hooks/` il cui contratto non sia ovvio dal nome/firma
  (esempio: `runAnonymization` in `app/lib/anonymization.ts`). Descrivi il
  **comportamento/contratto** (input non ovvi, effetti, casi limite), non una
  parafrasi del codice.
- **Funzioni interne (non esportate)**: un commento solo se l'algoritmo stesso
  non è ovvio (esempio: `passesLuhnCheck` — una riga che spiega *perché*
  quell'operazione, non *cosa* fa riga per riga).
- **Niente commenti sull'ovvio**: se toglierlo non farebbe sbagliare chi legge
  o modifica la funzione, il commento non va scritto.
- **Aggiorna o elimina i commenti insieme al codice che descrivono**: un
  commento disallineato dalla funzione è peggio di nessun commento.
- **Lingua**: identificatori e commenti in inglese (le stringhe rivolte
  all'utente restano in italiano) — coerenza con `docs/METHOD.md` §2.

## Convenzioni

- **Branch**: questo repo lavora **su `main`**, senza branch di feature (uso
  solista — vedi `docs/METHOD.md` §6/§10, che resta la regola di default per
  progetti con più contributor).
- **Commit**: [Conventional Commits](https://www.conventionalcommits.org/),
  messaggio in italiano: `tipo(scope): descrizione`.
  - **Tipi**: `feat` (nuova funzionalità), `fix` (correzione), `refactor`
    (ristrutturazione senza cambio di comportamento), `docs` (documentazione),
    `chore` (manutenzione/release), `test`.
  - **Scope**: il modulo o l'area toccata — nome di cartella/feature (es.
    `prompts`, `eval`, `tips`, `scaffold`, `conformance`, `readme`, `release`),
    non il nome del file.
  - **Atomici e a gate verde**: un commit = un cambiamento coeso; commit solo
    dopo `npm run lint && npm test` verde (→ [Gate](#gate-definition-of-done)).
  - Esempi reali dalla storia del repo: `feat(eval): secondo backend - claude
    CLI - per una lettura cross-modello`, `fix(prompts): esempi iniettati una
    volta sola (L8) e nessuna temperature (L9)`.
- **Versioning**: al finishing di ogni feature, bump SemVer tenendo allineati
  `package.json` e `src-tauri/Cargo.toml` (poi `cargo check` per sincronizzare
  `Cargo.lock`).

Metodologia e direttive di progetto: [`CLAUDE.md`](CLAUDE.md) e
[`docs/METHOD.md`](docs/METHOD.md).
