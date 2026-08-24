# Prompt Optimizer

App desktop (Windows, via **Tauri**) che trasforma un prompt grezzo in varianti
ottimizzate per diversi target AI, con anonimizzazione PII e generazione di
scaffold di istruzioni per agenti. Nessun backend proprio: tutto gira
client-side nella webview Tauri, con le tue API key salvate solo sul dispositivo.

## Cosa fa

- **Ottimizza un prompt** in fino a 5 varianti: Claude Chat, Claude Cowork,
  Claude Code (CLI), coppia System+User (API), file istruzioni Gemini
  (`GEMINI.md`). Motore: Google **Gemini** con la tua API key.
- **Anonimizzazione PII** (email, telefono, carte/CCV con validazione Luhn)
  prima dell'invio al modello, con ripristino automatico nell'output.
- **Rifinisci / Valuta** ogni variante con **Claude** (API) o **OpenAI** (API)
  — vedi "Provider layer". Switch per motore in ⚙️ Impostazioni.
- **Esempi few-shot** condivisi, iniettati in tutti i formati selezionati.
- **Scaffold strutturato**: genera il set completo di file di istruzioni per un
  progetto software (`CLAUDE.md`, `GEMINI.md`, `METHOD.md`, profili di
  piattaforma), con "istruzioni aggiuntive" visualizzabili/modificabili/
  ripristinabili per-file.
- Notifiche **toast** in-app.

## Requisiti

- **Node.js** + npm.
- Toolchain **Rust/Cargo** (per la build desktop Tauri).

## Avvio e build

```bash
npm install
npm run tauri dev      # shell desktop completa
npm run tauri build    # eseguibile + installer
```

> `npm run dev` da solo avvia **solo** la webview Next.js nel browser, senza le
> API Tauri (store, download nativi). Per usare l'app serve la shell Tauri.

Questo repo produce una **build unica solo-API**: nessuna feature flag, nessuna
dipendenza da un CLI locale. `npm run tauri dev`/`npm run tauri build` — senza
alcun flag — bastano sempre.

## Privacy

I tuoi **prompt** vengono inviati a **Google Gemini** per l'ottimizzazione e, se
usi Rifinisci/Valuta via API, al provider scelto (**Anthropic** e/o **OpenAI**).
Le **API key** (Gemini, Anthropic, OpenAI) sono salvate **solo sul tuo dispositivo**
(`tauri-plugin-store`), non vengono mai loggate, e le chiamate escono
direttamente verso gli endpoint dei provider — **nessun backend proprietario**
nel mezzo.

## Sviluppo

Vedi [CONTRIBUTING.md](CONTRIBUTING.md) per setup, gate di test e convenzioni.
Metodologia e direttive di progetto: [`CLAUDE.md`](CLAUDE.md) e
[`docs/METHOD.md`](docs/METHOD.md).

## Licenza

[MIT](LICENSE).

---

## Provider layer (Rifinisci / Valuta)

Le azioni "Rifinisci"/"Valuta con Claude" nel `ResultViewer` non parlano a un
unico backend: girano su un **layer di provider** intercambiabile
(`app/lib/providers/`, orchestrato da `availableProviders()` in
`app/lib/providers/registry.ts` e consumato da `app/hooks/useClaudeRefine.ts`).
Ogni provider implementa la stessa interfaccia `LlmProvider` (`run(assembled,
tier) → { text, usage }`, in `app/lib/providers/types.ts`) e compare come
pulsante separato in UI quando disponibile:

- **Claude API** (`claude-api`, label "Claude (API)") — `app/lib/providers/claudeApi.ts`.
  Attivo quando è presente una API key Anthropic in ⚙️ Impostazioni.
- **OpenAI API** (`openai-api`, label "OpenAI (API)") — `app/lib/providers/openaiApi.ts`.
  Attivo quando è presente una API key OpenAI in ⚙️ Impostazioni.

Le API key dei due provider si inseriscono nel pannello ⚙️
Impostazioni e restano **solo locali** (stesso store `tauri-plugin-store` usato
per la chiave Gemini); le chiamate escono direttamente dalla webview via
`tauri-plugin-http` verso gli endpoint Anthropic/OpenAI — nessun backend
proprio nel mezzo. Il monitor di consumo in UI accumula i token restituiti da
ogni provider (solo token, non prezzo). Ogni motore può essere attivato/
disattivato dagli switch in ⚙️ Impostazioni (master + per-motore).
