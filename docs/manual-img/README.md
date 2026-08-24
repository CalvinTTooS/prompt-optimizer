# Screenshot del manuale — guida di cattura

Il manuale (`docs/manuale-utente.md`) ha 12 punti dove va uno screenshot. Cattura
le immagini dall'**app desktop reale**, salvale **in questa cartella**
(`docs/manual-img/`) con i **nomi esatti** qui sotto, poi avvisami: sostituisco io
i segnaposto `📷` nel manuale con i riferimenti alle immagini in un unico passaggio.

## Come catturare (Windows)
- Premi **Win + Shift + S** → seleziona l'area → l'immagine va negli appunti.
- Incollala in Paint (o simile) e **salva come PNG** con il nome indicato, in
  `docs/manual-img/`.
- Formato: **PNG**. Larghezza consigliata: ~1000–1400 px. Ritaglia il superfluo.

## Elenco (nome file → cosa inquadrare)

| # | Nome file | Cosa inquadrare |
|---|-----------|-----------------|
| 1 | `01-smartscreen.png` | L'avviso SmartScreen di Windows con "Ulteriori informazioni / Esegui comunque" (se compare all'apertura dell'installer). |
| 2 | `02-installer.png` | Una schermata dell'installer NSIS durante l'installazione. |
| 3 | `03-setup.png` | La schermata **Setup** iniziale (guida rapida + campo per la Google API Key). |
| 4 | `04-schermata-principale.png` | La schermata principale: header (titolo, versione, lingua, Impostazioni), editor di testo, caselle dei formati, pulsante Ottimizza. |
| 5 | `05-privacy.png` | Lo switch **Privacy Attiva** e, se possibile, il pannello **Dati protetti** con qualche segnaposto. |
| 6 | `06-fewshot.png` | La sezione **Esempi / few shot** aperta, con un esempio. |
| 7 | `07-risultati.png` | Il pannello dei **risultati** dopo un'ottimizzazione (una o più varianti generate, coi badge). |
| 8 | `08-rifinisci-valuta.png` | I pulsanti **Rifinisci con… / Valuta con…** accanto a una variante. |
| 9 | `09-impostazioni.png` | Il pannello **⚙️ Impostazioni**: switch master, switch motori (Claude API/OpenAI API), campi delle chiavi. |
| 10 | `10-scaffold.png` | Il riquadro **"Crea file di istruzioni…"** con la checkbox attivata e il pulsante Genera. |
| 11 | `11-istruzioni-aggiuntive.png` | La sezione **Istruzioni aggiuntive** aperta (selettore file + Visualizza/Modifica/Ripristina). |
| 12 | `12-lingua.png` | Il **menu della lingua** aperto nell'header (le 9 lingue). |

## Suggerimenti
- Per gli scatti dell'app "in azione" (5, 7, 8) fai prima una vera ottimizzazione
  con un prompt di esempio, così le schermate mostrano contenuto realistico.
- Per il #9 (Impostazioni) puoi inserire chiavi finte/placeholder — non serve che
  siano reali per lo screenshot.
- Se una schermata non ti serve (es. #1/#2 se non vuoi mostrare l'installazione),
  saltala: nel manuale lascerò o toglierò il relativo segnaposto.
