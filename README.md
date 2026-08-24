# Prompt Optimizer

**English** · [Italiano](README.it.md)

Prompt Optimizer is born from a simple idea: **help you write good prompts.** To
do that it leans on Google **Gemini's free API tier** — and precisely *because*
your prompt is sent to Gemini, it **anonymizes the sensitive data Gemini
receives**: PII (emails, phone numbers, cards) is detected and masked **on your
device** before the call, then restored in the output. Better prompts, without
handing your personal data to the model.

Desktop app (Windows, via **Tauri**) — no backend of its own: everything runs
client-side in the Tauri webview, with your API keys stored only on your device.

![Prompt Optimizer — main screen](docs/manual-img/04.png)

![Windows 10/11](https://img.shields.io/badge/Windows-10%2F11-0078D6?logo=windows&logoColor=white)
[![Release](https://img.shields.io/github/v/release/CalvinTTooS/prompt-optimizer)](https://github.com/CalvinTTooS/prompt-optimizer/releases/latest)
![Downloads](https://img.shields.io/github/downloads/CalvinTTooS/prompt-optimizer/total)
[![License: MIT](https://img.shields.io/github/license/CalvinTTooS/prompt-optimizer)](LICENSE)

> 🤖 Developed with AI assistance, under strict versioned development standards — see [Development](#development).

## Download

Grab the latest build from the **[Releases](https://github.com/CalvinTTooS/prompt-optimizer/releases/latest)** page:

- **Installer (recommended)**: `Prompt_optimizer_x.y.z_x64-setup.exe` — installs into your user profile, **no admin rights required**.
- **Portable**: `pop_app.exe` — a single executable to copy and run (requires **WebView2**, usually already present on Windows 10/11).

> ⚠️ The app is unsigned: on first launch Windows **SmartScreen** may warn you → *"More info" → "Run anyway"*.
> Full guide: [user manual (EN)](docs/user-manual.md) · [manuale utente (IT)](docs/manuale-utente.md).

## What it does

- **Optimizes a prompt** into up to 5 variants: Claude Chat, Claude Cowork,
  Claude Code (CLI), a System+User pair (API), and a Gemini instruction file
  (`GEMINI.md`). Engine: Google **Gemini** with your own API key.
- **PII anonymization** (email, phone, cards/CCV with Luhn validation) before
  anything reaches the model, with automatic restore in the output.
- **Refine / Evaluate** each variant with **Claude** (API) or **OpenAI** (API)
  — see "Provider layer". Per-engine switch in ⚙️ Settings.
- **Shared few-shot examples**, injected into every selected format.
- **Structured scaffold**: generates the full set of agent-instruction files for
  a software project (`CLAUDE.md`, `GEMINI.md`, `METHOD.md`, platform profiles),
  with per-file "additional instructions" you can view, edit and reset.
- In-app **toast** notifications.

## How it works

1. **Paste a raw prompt** — even a messy one-liner.
2. **PII is anonymized locally** (on by default): emails, phone numbers, credit
   cards (Luhn-validated) and CCVs are detected and replaced with placeholders
   like `[EMAIL_1]` *before* anything is sent. Gemini only ever sees the masked
   text; the real values are restored in the final output. You can also mask any
   selected text by hand.
3. **Gemini rewrites it** into the target format(s) you tick — each tuned to how
   that target actually reads prompts:
   - **Claude Chat** — conversational, XML-tagged, for chat UIs.
   - **Claude Cowork** — a workspace agent, with explicit boundaries and
     human-approval points.
   - **Claude Code** — CLI-agent instructions (`CLAUDE.md` genre): plan first,
     then act, with verifiable steps.
   - **System + User** — splits the prompt into a **system** part (stable: role,
     constraints, output format) and a **user** part (the specific task/data),
     using one rule: *"would this line stay identical if you ran the task
     tomorrow with different data?"* → yes → System, no → User.
   - **Gemini instruction file** (`GEMINI.md`) — a Gemini CLI context file:
     hierarchy-aware, filename-neutral, interoperable with `AGENTS.md`.
4. **Shared few-shot examples** you provide are injected into every selected
   format at once.
5. **Refine / Evaluate** any variant with Claude or OpenAI (see *Provider
   layer*), keeping keys local.
6. **Structured scaffold** (separate mode): from a project description, Gemini
   fills only the "Project" section of a template and the app assembles a full
   agent-instruction set — `CLAUDE.md` + `GEMINI.md` + `METHOD.md` + platform
   profiles — to download as a folder or zip.

Everything runs client-side in the Tauri shell; nothing passes through a server of ours.

## Requirements

- **Node.js** + npm.
- **Rust/Cargo** toolchain (for the Tauri desktop build).

## Run and build

```bash
npm install
npm run tauri dev      # full desktop shell
npm run tauri build    # executable + installer
```

> `npm run dev` alone starts **only** the Next.js webview in the browser, without
> the Tauri APIs (store, native downloads). You need the Tauri shell to use the app.

This repo produces a **single API-only build**: no feature flags, no dependency
on a local CLI. `npm run tauri dev`/`npm run tauri build` — with no flags — are
always enough.

## Privacy

Your **prompts** are sent to **Google Gemini** for optimization and, if you use
Refine/Evaluate via API, to the provider you choose (**Anthropic** and/or
**OpenAI**). Your **API keys** (Gemini, Anthropic, OpenAI) are stored **only on
your device** (`tauri-plugin-store`), are never logged, and calls go directly to
the providers' endpoints — **no proprietary backend** in between.

## Development

This software was **developed with AI assistance**, following a set of fairly
strict, versioned development standards — plan-before-code, a test gate on every
change, security-by-design, and code hygiene. Those standards aren't implicit:
they're written down and live in the repo.

- [`CLAUDE.md`](CLAUDE.md) — project-specific directives, loaded every session.
- [`docs/METHOD.md`](docs/METHOD.md) — the full, stable engineering methodology.
- [`AGENTS.md`](AGENTS.md) — cross-tool agent notes.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — setup, the test gate and conventions.
- [`docs/prompt-engineering-best-practices.md`](docs/prompt-engineering-best-practices.md)
  — the sourced research behind each prompt format.

## Contact and issues

Questions, bugs or ideas? Open a **[GitHub issue](https://github.com/CalvinTTooS/prompt-optimizer/issues)** — it's the best way to reach me: public, trackable, and no email exchange needed.

## License

[MIT](LICENSE).

---

## Provider layer (Refine / Evaluate)

The "Refine"/"Evaluate with Claude" actions in `ResultViewer` don't talk to a
single backend: they run on a swappable **provider layer** (`app/lib/providers/`,
orchestrated by `availableProviders()` in `app/lib/providers/registry.ts` and
consumed by `app/hooks/useClaudeRefine.ts`). Each provider implements the same
`LlmProvider` interface (`run(assembled, tier) → { text, usage }`, in
`app/lib/providers/types.ts`) and shows up as its own button in the UI when available:

- **Claude API** (`claude-api`, label "Claude (API)") — `app/lib/providers/claudeApi.ts`.
  Active when an Anthropic API key is present in ⚙️ Settings.
- **OpenAI API** (`openai-api`, label "OpenAI (API)") — `app/lib/providers/openaiApi.ts`.
  Active when an OpenAI API key is present in ⚙️ Settings.

The two providers' API keys are entered in the ⚙️ Settings panel and stay
**local only** (same `tauri-plugin-store` used for the Gemini key); calls go
straight from the webview via `tauri-plugin-http` to the Anthropic/OpenAI
endpoints — no backend of its own in between. The in-UI usage monitor
accumulates the tokens returned by each provider (tokens only, not price). Each
engine can be toggled on/off from the switches in ⚙️ Settings (master + per-engine).
