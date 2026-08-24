## Profilo di piattaforma — Android
- **Distribuzione**: **Google Play** tramite **AAB** (APK solo per sideload/test);
  **firma obbligatoria** + Play App Signing; canali internal→closed→open→prod con
  rollout/rollback.
- **Versione**: `versionName` (SemVer) + **`versionCode`** monotòno; R8/shrinking,
  `mapping.txt` archiviato.
- **Matrice CI**: **API × dimensione schermo/densità × ABI** (emulatori / Firebase
  Test Lab); la piattaforma **non** si congela (frammentazione).
- **Stack tipico**: Gradle (Kotlin DSL), Kotlin + Jetpack Compose, MVVM+UDF,
  Hilt/Koin, Room/DataStore, Coroutines/Flow.
- **Diagnostica**: **Timber/Log** (debug solo in `DEBUG`), **Crashlytics** (con
  consenso), **toggle in-app** per il log esteso; fotografia: modello, Android/API,
  ABI, risorse. (App in sandbox: niente file-switch nel filesystem.)
- **Sicurezza/UX**: dati in sandbox, EncryptedSharedPreferences/Keystore, permessi
  a runtime; **Material 3**, **TalkBack**, `strings.xml`, target touch ≥ 48dp.
