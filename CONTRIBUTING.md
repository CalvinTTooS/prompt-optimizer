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

## Convenzioni

- **Branch**: lavora sempre su un branch dedicato; niente commit diretti su
  `master`.
- **Commit**: stile Conventional Commits (`feat(...)`, `fix(...)`,
  `chore(...)`, `docs(...)`, `test(...)`).
- **Versioning**: al finishing di ogni feature, bump SemVer tenendo allineati
  `package.json` e `src-tauri/Cargo.toml` (poi `cargo check` per sincronizzare
  `Cargo.lock`).

Metodologia e direttive di progetto: [`CLAUDE.md`](CLAUDE.md) e
[`docs/METHOD.md`](docs/METHOD.md).
