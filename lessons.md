# lessons.md — regole apprese dalle correzioni

> Una riga per lezione: **REGOLA — perché**. Tieni il file corto (~30 righe max).
> Quando una lezione è **stabile e generale**, promuovila in `CLAUDE.md` (se
> operativa) o in `docs/METHOD.md` (se di metodo) e **rimuovila da qui**. È memoria
> di lavoro, non un archivio.

- **Aggiornare il documento di allineamento fork NELLO STESSO commit della
  modifica, non "poi"** — se una modifica merita un commit, merita la riga che
  permette agli altri fork di replicarla. Rimandare l'ho già fatto due volte, e
  entrambe è stato l'utente ad accorgersene: rimandato significa dimenticato, e
  il debito cresce in silenzio (9 commit di arretrato al 2026-08-30).

- **Scrivere in `lessons.md` alla PRIMA correzione, non alla seconda** — il file
  è rimasto vuoto per tre giorni mentre accumulavo correzioni ripetute. Una
  lezione annotata è ciò che impedisce la ricaduta; una lezione riconosciuta e
  non scritta non serve a niente.

- **Misurare il rumore prima di chiamare "rumore" uno scostamento** — per giorni
  ho liquidato differenze da 1 osservazione come variabilità senza averla mai
  quantificata. Ripetendo la stessa identica configurazione (run 14 vs 15),
  `gemini.noGenericPhrases` ha oscillato di 2 su 30: la soglia era una stima a
  occhio, non un dato.
