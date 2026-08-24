## Profilo di piattaforma — Desktop / portable
- **Distribuzione**: cartella/zip **portatile** (default, zero installazione); in
  alternativa installer (es. Inno Setup/NSIS) o Store/MSIX/winget. **Code signing**
  dei binari.
- **Versione/asset**: SemVer nei **metadati dell'eseguibile** (su Windows campi a
  quattro parti `a.b.c.d`, la quarta = build); risoluzione dei path asset robusta
  al packaging (es. `sys._MEIPASS` con PyInstaller).
- **Matrice CI**: OS (× architettura) × versione runtime; **congelando il runtime**
  (build self-contained/embedded) la matrice si riduce essenzialmente all'OS.
- **Diagnostica remota**: cartella **`switch`** con file `.off`→`.on` (`debug`,
  `safe`); log su **file con rotazione** in percorso scrivibile; fotografia macchina
  con **mascheramento** del percorso utente (`C:\Users\***\…`); attenzione a Program
  Files (scrittura non garantita).
