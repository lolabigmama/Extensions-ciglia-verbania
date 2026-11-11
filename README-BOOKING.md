# Extensions Ciglia Verbania

## Riferimenti del progetto
- Sito pubblico (GitHub Pages): https://lolabigmama.github.io/Extensions-ciglia-verbania/
- Repository di produzione: https://github.com/lolabigmama/Extensions-ciglia-verbania
- Branch di produzione: `main`.
- Frontend: `index.html`.
- Backend: progetto Supabase `lcfdshnpsgaaqmyupzcy`.
- URL Supabase: `https://lcfdshnpsgaaqmyupzcy.supabase.co`.
- Edge Function: `booking-api`.
- Base URL API: `https://lcfdshnpsgaaqmyupzcy.supabase.co/functions/v1/booking-api`.
- Fuso orario: `Europe/Rome`.

## Servizi e prezzi
Tutti i trattamenti hanno durata di 120 minuti.
- Extensions ciglia one to one: 50 €.
- Extensions ciglia volume: 70 €.
- Refill one to one: 40 €.
- Refill volume: 60 €.

## Modulo di prenotazione sul sito
Il modulo raccoglie:
- Nome e cognome (obbligatorio).
- Nickname Instagram (obbligatorio nel modulo; viene salvato in `customer_instagram`; è accettato con o senza `@` iniziale).
- Trattamento, data e orario.
- Note aggiuntive facoltative.

L'indirizzo email è stato rimosso dal modulo e non viene richiesto né inviato all'API. Non è configurato alcun messaggio automatico o DM Instagram di conferma. Dopo l'invio, il sito comunica che la richiesta è stata ricevuta ed è in attesa di conferma.

Le richieste vengono registrate con stato `pending`. Una richiesta in attesa non equivale a un appuntamento confermato: la titolare deve verificarla e confermarla tramite il flusso amministrativo disponibile.

## Dove consultare le prenotazioni
Al momento **non è stata realizzata una pagina/pannello amministratore integrato nel sito pubblico**.

Per consultare le richieste:
1. Aprire https://supabase.com/dashboard/project/lcfdshnpsgaaqmyupzcy/editor
2. Accedere al progetto Supabase.
3. Aprire **Table Editor**.
4. Selezionare la tabella `public.appointments`.

Campi rilevanti della tabella includono nome cliente, nickname Instagram (`customer_instagram`), trattamento, data/orario, note (`customer_notes`) e stato (`status`, ad esempio `pending` o `confirmed`). I nomi esatti delle altre colonne dipendono dallo schema attivo.

**Nota operativa:** non condividere pubblicamente il link al dashboard o credenziali di accesso. La tabella contiene dati personali delle clienti.

## Disponibilità e calendario
- La tabella `business_hours` è attualmente vuota: non sono ancora configurati orari settimanali ricorrenti.
- Le disponibilità eccezionali per singole date sono gestite tramite `special_slots`.
- Gli slot speciali prevalgono sugli orari settimanali generati.
- Le disponibilità vengono ricalcolate lato database; richieste che entrano in conflitto con appuntamenti già occupati vengono rifiutate.
- Gli appuntamenti con stato `pending` o `confirmed` occupano la disponibilità.
- Le date bloccate sono gestite tramite `blocked_dates`; le impostazioni generali tramite `booking_settings`.
- Disponibilità speciali già annotate: lunedì 2 novembre 2026 alle 10:30, 14:00, 16:00 e 18:00 (Europe/Rome), ciascuna per un appuntamento di 2 ore. Verificare che siano ancora presenti nel database prima di considerarle prenotabili.

## Endpoint pubblici usati dal sito
- `GET /public/services`
- `GET /public/availability?service_id=...&date=YYYY-MM-DD`
- `POST /public/appointments`

Il payload di creazione appuntamento include `customer_instagram` e le note facoltative; non include `customer_email`.

## Azioni private per la titolare / GPT
OpenAPI: `openapi/gpt-actions.yaml`
- `GET /owner/hours`
- `POST /owner/hours`
- `DELETE /owner/hours?id=...`
- `GET /owner/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /owner/blocks`
- `GET /owner/special-slots?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /owner/special-slots` con `slot_date` e `starts_at`
- `DELETE /owner/special-slots?id=...`

Le azioni private richiedono l'header `x-owner-api-key`. La chiave corrisponde al secret Supabase `OWNER_ACTION_API_KEY`. Non inserire mai questa chiave o la service-role key nel frontend, nel repository o nei messaggi.

## Configurazione server-side Supabase
La Edge Function utilizza le variabili server-side `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` fornite dall'ambiente Supabase. Configurare inoltre:
- `OWNER_ACTION_API_KEY`: chiave casuale lunga e privata per le azioni della titolare.
- `SITE_ORIGIN`: `https://lolabigmama.github.io`.

Non pubblicare mai valori reali dei segreti.

## Schema e gestione dati
- Tabella `public.appointments`: contiene le richieste di appuntamento.
- Colonna `customer_instagram`: aggiunta per memorizzare il nickname Instagram (tipo testo, nullable a livello database).
- `customer_notes`: contiene le note aggiuntive facoltative.
- `business_hours`: orari ricorrenti.
- `special_slots`: disponibilità per date specifiche.
- `blocked_dates`: date non prenotabili.
- `booking_settings`: impostazioni di prenotazione.

I nomi e i tipi effettivi devono essere verificati sullo schema Supabase prima di eseguire modifiche manuali.

## Aggiornamento degli orari
I giorni sono numerati 0=domenica, 1=lunedì, ..., 6=sabato. Per orari di una singola data usare `special_slots`; per orari ricorrenti usare `business_hours`. Il sito ricarica gli slot e riceve gli eventi realtime del calendario.

## Sicurezza, privacy e stato del progetto
- Le tabelle hanno RLS attivo.
- I dati personali degli appuntamenti non devono essere esposti direttamente al browser: le letture e scritture passano dalla Edge Function.
- Le richieste pubbliche restano in attesa di conferma (`pending`) finché la titolare non le conferma.
- Non è attivo alcun invio automatico di DM o messaggi Instagram.
- Non esiste ancora un pannello amministratore dedicato nel sito; la consultazione operativa avviene da Supabase Table Editor.
- Prima di attivare prenotazioni automatiche o un pannello pubblico/privato, completare informativa privacy e consenso, protezione anti-abuso/rate limiting, test end-to-end e autenticazione/autorizzazione adeguata.

## Cronologia aggiornamenti
- Modulo aggiornato: rimosso il campo email; aggiunti nickname Instagram e note aggiuntive facoltative.
- Database aggiornato: aggiunta la colonna `customer_instagram` a `public.appointments`.
- Edge Function `booking-api`: aggiornata per salvare il nickname Instagram, restituire la conferma di ricezione in attesa di approvazione e usare il campo Instagram nelle letture riservate alla titolare.
- Confermato per requisito: nessun DM Instagram automatico.
- Documentazione aggiornata per chiarire dove consultare le richieste e che il pannello amministratore integrato non è ancora presente.


## Allineamento sorgente e backend
Il sorgente della Edge Function deve restare versionato in `supabase/functions/booking-api/index.ts`. Prima di modificare o distribuire la funzione, confrontare il file GitHub con la versione effettivamente attiva su Supabase. Dopo ogni deploy, verificare la versione e riportare nel repository lo stesso sorgente. Non modificare Supabase direttamente lasciando indietro GitHub.

Al controllo dell'11 novembre 2026, il file GitHub della funzione è stato riallineato alla versione 5 attiva su Supabase (commit `53722c27f72f9332a41bbf00543ff664d98173ea`). La sincronizzazione automatica Google Calendar non è ancora implementata. Il calendario dedicato individuato è `Prenotazioni extensions 🩷` con fuso `Europe/Rome`; nessuna lettura del calendario personale è prevista.
