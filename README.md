# Extensions Ciglia Verbania

Sito statico autonomo copiato dal progetto `custom-pages/extensions-ciglia-verbania`.

## Pubblicazione

Il repository usa GitHub Actions per pubblicare la cartella principale su GitHub Pages. Ogni push su `main` avvia il workflow `.github/workflows/deploy-pages.yml`.

URL previsto: https://lolabigmama.github.io/Extensions-ciglia-verbania/

## Modalità demo

Il sito mantiene il calendario disattivato finché l'API di prenotazione non viene configurata. Il form non invia prenotazioni in modalità demo.

## Backend Supabase

Sono inclusi lo schema iniziale, la Edge Function, la configurazione Supabase e la documentazione tecnica. Non sono stati applicati al progetto Supabase né distribuiti segreti o funzioni. Prima di attivare le prenotazioni occorre completare e verificare schema, sicurezza/RLS, regole di disponibilità, privacy e pannello amministratore.

Non inserire mai la chiave `service_role` nel frontend o nel repository.
