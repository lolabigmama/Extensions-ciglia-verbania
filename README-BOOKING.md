# Calendario prenotazioni

## Configurazione attuale
- Frontend GitHub Pages: calendario responsive in apertura e listino di due prodotti.
- Backend Supabase: progetto `lcfdshnpsgaaqmyupzcy`.
- Edge Function attiva: `booking-api`.
- Fuso orario: `Europe/Rome`.
- Trattamenti: Extensions ciglia one to one (50 €, 120 min), Extensions ciglia volume (70 €, 120 min), Refill one to one (40 €, 120 min), Refill volume (60 €, 120 min).
- Orari lavorativi: non ancora configurati, vengono aggiunti solo dopo comunicazione esplicita della titolare in chat.
- Le richieste dal sito vengono salvate come `pending`, non come appuntamenti confermati.

## Endpoint pubblici usati dal sito
- `GET /public/services`
- `GET /public/availability?service_id=...&date=YYYY-MM-DD`
- `POST /public/appointments`

## Azioni private per il GPT della titolare
OpenAPI: `openapi/gpt-actions.yaml`
- `GET /owner/hours`
- `POST /owner/hours`
- `DELETE /owner/hours?id=...`
- `GET /owner/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /owner/blocks`

Le azioni private richiedono l'header `x-owner-api-key`. Prima di attivare le Actions del GPT, impostare il secret Supabase `OWNER_ACTION_API_KEY` e usare lo stesso valore nella configurazione di autenticazione API del GPT. Non inserire mai la service-role key o la owner key nel frontend, nei file del repository o nei messaggi.

## Segreti Supabase
La Edge Function usa le variabili server-side `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` fornite dall'ambiente Supabase. Configurare inoltre:
- `OWNER_ACTION_API_KEY`: chiave casuale lunga, privata, per le azioni GPT.
- `SITE_ORIGIN`: `https://lolabigmama.github.io`.

## Aggiornamento orari
I giorni sono numerati 0=domenica, 1=lunedì, ..., 6=sabato. Quando la titolare comunica gli orari in chat, aggiornarli in `business_hours`; il sito ricarica gli slot e riceve gli eventi realtime del calendario. Gli slot sono ricalcolati sul database e gli appuntamenti in conflitto vengono rifiutati.

## Sicurezza e stato
Le tabelle hanno RLS attivo. I dati personali degli appuntamenti non sono esposti al browser: le letture/scritture passano dalla Edge Function. Le richieste pubbliche sono in attesa di conferma. Prima di promuovere a prenotazione automatica, completare informativa privacy/consenso, anti-abuso/rate limiting, test end-to-end e configurazione della chiave privata GPT.
