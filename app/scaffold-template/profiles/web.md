## Profilo di piattaforma — Web
- **Distribuzione**: deploy statico/CDN o server; **nessuna installazione**;
  versioning via tag + build hash; cache busting.
- **Matrice CI**: **browser × versioni** (il runtime è il **browser**, non si
  congela); verifica responsive.
- **Diagnostica**: error tracking lato client (es. Sentry) **con consenso**, log
  server-side; niente PII.
- **Sicurezza**: **OWASP Top 10**, **CSP**/security headers, HTTPS, **DAST** (es.
  OWASP ZAP) sull'app in esecuzione.
