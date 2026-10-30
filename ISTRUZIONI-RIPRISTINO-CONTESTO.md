# Istruzioni di ripristino contesto per l'assistente
## Extensions Ciglia Verbania

Questo documento è il manuale di continuità del progetto. Se l'assistente perde la memoria della conversazione, deve leggerlo prima di modificare codice, database, orari o pubblicazione. È una fotografia dello stato verificato al **31 ottobre 2026**; prima di agire verificare sempre lo stato effettivo di GitHub e Supabase, perché questo file può diventare storico.

---

## 1. Regole operative inderogabili

1. **Lingua:** parlare con la titolare in italiano, in modo chiaro e conciso.
2. **Non ricreare il progetto:** non creare un nuovo repository, un nuovo progetto Supabase o una seconda versione del sito.
3. **Repository di produzione:** lavorare esclusivamente su `lolabigmama/Extensions-ciglia-verbania`, branch `main`, salvo istruzioni esplicite diverse.
4. **Repository sorgente:** `W0lW/varese-sites`, branch `feat/extensions-ciglia-verbania`, cartella `custom-pages/extensions-ciglia-verbania/`. È il progetto sorgente da cui è stato derivato il sito. **Non modificarlo.**
5. **Non esporre segreti:** mai mettere nei file, nel frontend o nei messaggi la Supabase service-role key o la chiave privata del proprietario. La chiave publishable Supabase è destinata al frontend e non equivale alla service-role key.
6. **Non inventare gli orari:** se la titolare non specifica se un orario vale una sola data o si ripete ogni settimana, chiedere una sola conferma prima di salvarlo.
7. **Non trasformare disponibilità occasionali in orari ricorrenti.** Per una data precisa usare `special_slots`; per fasce settimanali usare `business_hours`.
8. **Non dire che una modifica è online finché non è verificata.** Dopo ogni commit controllare GitHub Actions e, per le modifiche al database/API, controllare anche Supabase.
9. **Le richieste di appuntamento pubbliche sono pending.** Non dichiararle confermate: la risposta API attuale dice che la richiesta è in attesa di conferma.
10. Prima di interventi Supabase, leggere la skill Supabase disponibile nell'ambiente ChatGPT: `skills://plugins/supabase/supabase/skill.md`. Per SQL/schema consultare anche `supabase-postgres-best-practices`.

---

## 2. Indirizzi e risorse

| Risorsa | Valore |
|---|---|
| Sito pubblicato | https://lolabigmama.github.io/Extensions-ciglia-verbania/ |
| Repository di produzione | https://github.com/lolabigmama/Extensions-ciglia-verbania |
| Branch pubblicato | `main` |
| Progetto Supabase ref | `lcfdshnpsgaaqmyupzcy` |
| URL Supabase | `https://lcfdshnpsgaaqmyupzcy.supabase.co` |
| Edge Function | `booking-api` |
| URL base API | `https://lcfdshnpsgaaqmyupzcy.supabase.co/functions/v1/booking-api` |
| OpenAPI per GPT Actions | `openapi/gpt-actions.yaml` |
| Fuso orario | `Europe/Rome` |

La pubblicazione usa GitHub Pages. Il workflow è `.github/workflows/deploy-pages.yml`; ogni push su `main` avvia build e deploy. Il workflow carica la root del repository come sito.

---

## 3. Obiettivo e struttura del sito

La richiesta della titolare è un sito essenziale e mobile-friendly:
- il calendario prenotazioni deve essere visibile subito all'apertura della pagina;
- il calendario deve leggere disponibilità e trattamenti dal backend Supabase;
- sotto il calendario deve esserci solo il listino prodotti con due prodotti;
- non aggiungere descrizioni commerciali, sezioni promozionali o testo superfluo senza una richiesta esplicita.

File principale: `index.html`.
La pagina usa la Edge Function indicata nell'attributo `data-booking-api` del tag HTML. Il frontend richiede i trattamenti, richiede gli slot per data/trattamento, invia le richieste appuntamento e aggiorna il calendario con polling e notifiche Supabase Realtime.

### Prodotti presenti

| Prodotto | Prezzo | Immagini |
|---|---:|---|
| Valigetta kit | 15 € | `assets/products/IMG_9904.jpeg`, `assets/products/IMG_9905.jpeg` |
| Whipped Shampoo | 20 € | `assets/products/IMG_9903.jpeg` |

Le immagini sono file già presenti nel repository. Non sostituirle senza istruzioni della titolare.

---

## 4. Trattamenti, prezzi e durata

I quattro servizi presenti in `public.services`:

| Nome | Prezzo | Prezzo in centesimi DB | Durata |
|---|---:|---:|---:|
| Extensions ciglia one to one | 50 € | 5000 | 120 minuti |
| Extensions ciglia volume | 70 € | 7000 | 120 minuti |
| Refill one to one | 40 € | 4000 | 120 minuti |
| Refill volume | 60 € | 6000 | 120 minuti |

I prezzi sono salvati in centesimi (`price_cents`). La durata è `duration_minutes = 120` per tutti e quattro i servizi.

---

## 5. Disponibilità già inserite

È stata registrata una disponibilità eccezionale, **solo per lunedì 2 novembre 2026**, nel fuso `Europe/Rome`:

| Data | Inizio | Fine prevista |
|---|---:|---:|
| 2026-11-02 | 10:30 | 12:30 |
| 2026-11-02 | 14:00 | 16:00 |
| 2026-11-02 | 16:00 | 18:00 |
| 2026-11-02 | 18:00 | 20:00 |

Questi quattro orari sono stati inseriti nella tabella `public.special_slots` e verificati con una query SQL. Non sono orari settimanali e non vanno copiati automaticamente ai lunedì successivi.

La tabella contiene quattro record con:
- `slot_date = 2026-11-02`
- `starts_at = 10:30:00, 14:00:00, 16:00:00, 18:00:00`

La durata effettiva è presa dal servizio scelto (attualmente due ore).

---

## 6. Database Supabase: stato reale

Le tabelle presenti nel progetto Supabase, schema `public`, verificate tramite introspezione:

### `services`
Campi principali: `id`, `name`, `price_cents`, `duration_minutes`, `is_active`, `sort_order`, `created_at`. Contiene i quattro servizi sopra descritti.

### `business_hours`
Campi: `id`, `weekday`, `opens_at`, `closes_at`, `is_active`. Attualmente è vuota (0 righe). Numerazione giorni: 0=domenica, 1=lunedì, 2=martedì, 3=mercoledì, 4=giovedì, 5=venerdì, 6=sabato.

Questa tabella rappresenta **fasce continue**, non singoli orari di appuntamento. Il backend genera inizi appuntamento ogni `slot_interval_minutes` minuti dentro la fascia, finché l'appuntamento completo rientra nell'orario di chiusura. Non inserire una fascia ampia solo per rappresentare quattro orari discreti, altrimenti comparirebbero molti orari intermedi.

### `special_slots`
Campi: `id`, `slot_date`, `starts_at`, `created_at`. Contiene le disponibilità per date specifiche. È stata aggiunta con la migrazione `002_special_date_slots.sql`. La tabella ha RLS attivo; le operazioni passano dalla Edge Function con privilegi server-side.

Quando per una data esistono righe in `special_slots`, l'API usa quegli orari specifici e non genera gli orari dalla fascia settimanale per quella data. Per date senza righe speciali usa invece `business_hours`.

### `appointments`
Campi principali: `id`, `service_id`, `customer_name`, `customer_email`, `customer_phone`, `customer_notes`, `starts_at`, `ends_at`, `status`, `source`, `created_at`, `updated_at`. Stati enum: `pending`, `confirmed`, `cancelled`. Le richieste dal sito vengono create come `pending`; gli appuntamenti pending e confirmed occupano lo slot e impediscono sovrapposizioni.

### `blocked_dates`
Campi: `id`, `starts_at`, `ends_at`, `reason`, `created_at`. Contiene intervalli non prenotabili inseriti dalla titolare.

### `booking_settings`
Riga singleton `id=1`. Valori verificati:
- `timezone = Europe/Rome`
- `slot_interval_minutes = 15`
- `maximum_booking_days = 90`
- `minimum_advance_hours = 2`

RLS è attivo sulle tabelle. Il frontend non deve leggere direttamente i dati personali dei clienti. La Edge Function usa la chiave service-role lato server per operare sul database.

### Attenzione alle migrazioni nel repository

Nel repository esistono:
- `supabase/migrations/001_booking_schema.sql`
- `supabase/migrations/002_special_date_slots.sql`

La migrazione 002 documenta la tabella `special_slots` e i quattro orari del 2 novembre. La 001 è una versione iniziale/template dello schema e contiene alcuni nomi di tabelle/colonne precedenti (ad esempio `opening_hours` e `calendar_blocks`) che **non corrispondono esattamente allo schema attualmente introspezionato in produzione** (`business_hours`, `blocked_dates`, `maximum_booking_days`, `minimum_advance_hours`). Non rieseguire la 001 alla cieca e non presumere che sia una fotografia fedele del database live. Prima di ogni migrazione confrontare sempre lo schema Supabase effettivo.

---

## 7. Edge Function `booking-api`

Codice sorgente nel repository: `supabase/functions/booking-api/index.ts`.
La funzione è distribuita nel progetto Supabase `lcfdshnpsgaaqmyupzcy`, con `verify_jwt = false`. La funzione gestisce CORS, validazione, richieste pubbliche e percorsi privati protetti da chiave dedicata.

Variabili ambiente lette dal codice:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OWNER_ACTION_API_KEY`
- `SITE_ORIGIN`

Valore predefinito di `SITE_ORIGIN` nel codice: `https://lolabigmama.github.io`. Verificare che il secret sia impostato correttamente nel progetto Supabase.

### Endpoint pubblici

Base URL + percorso:

- `GET /public/services`: elenca servizi attivi.
- `GET /public/availability?service_id=<uuid>&date=YYYY-MM-DD`: calcola gli slot liberi per il servizio e la data.
- `POST /public/appointments`: crea una richiesta appuntamento pending.

Il calcolo disponibilità:
1. verifica che il servizio sia attivo;
2. determina il giorno nel fuso Europe/Rome;
3. legge orari settimanali e orari speciali per la data;
4. legge appuntamenti pending/confirmed e blocchi che si sovrappongono;
5. applica durata del trattamento, intervallo slot, anticipo minimo e orizzonte massimo;
6. esclude gli slot che collidono con appuntamenti o blocchi.

La creazione dell'appuntamento ricontrolla lo slot sul database e rifiuta conflitti. Il vincolo di esclusione impedisce sovrapposizioni tra appuntamenti pending/confirmed.

### Endpoint privati titolare

Tutti richiedono header `x-owner-api-key`, confrontato con il secret server-side `OWNER_ACTION_API_KEY`.

- `GET /owner/hours`: legge fasce settimanali.
- `POST /owner/hours`: aggiunge una fascia settimanale con `weekday`, `opens_at`, `closes_at`, facoltativo `is_active`.
- `DELETE /owner/hours?id=<uuid>`: elimina una fascia.
- `GET /owner/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD`: legge appuntamenti nell'intervallo.
- `POST /owner/blocks`: aggiunge un blocco con `starts_at`, `ends_at`, facoltativo `reason`.
- `GET /owner/special-slots?from=YYYY-MM-DD&to=YYYY-MM-DD`: legge disponibilità eccezionali.
- `POST /owner/special-slots`: aggiunge una disponibilità con JSON `{"slot_date":"2026-11-02","starts_at":"10:30"}`.
- `DELETE /owner/special-slots?id=<uuid>`: rimuove una disponibilità speciale.

Le modifiche al calendario inviano un broadcast Supabase Realtime sul canale `calendar`, evento `calendar_changed`.

### Stato di configurazione GPT

L'OpenAPI è presente in `openapi/gpt-actions.yaml` e contiene gli endpoint pubblici e privati. È uno scaffold pronto per la configurazione, **non prova che il Custom GPT sia già collegato**.

Per completare il collegamento:
1. generare una chiave casuale lunga e privata;
2. configurarla come secret `OWNER_ACTION_API_KEY` in Supabase;
3. configurare la stessa chiave come autenticazione API del Custom GPT, header `x-owner-api-key`;
4. importare `openapi/gpt-actions.yaml` nelle Actions del GPT;
5. provare lettura e inserimento di un orario speciale e verificare la risposta;
6. non scrivere la chiave nel repository o nel browser.

Non è stato verificato che `OWNER_ACTION_API_KEY` sia già configurata. Non affermare che il GPT personalizzato è già collegato o può modificare il calendario finché i passaggi sopra non sono completati e testati.

---

## 8. Regole per gestire le disponibilità che la titolare comunica in chat

### Se comunica un giorno e un orario senza specificare la ricorrenza
Chiedere: “Questo orario vale solo per la prossima data oppure si ripete ogni settimana?” Non salvare finché non è chiaro.

### Se è una sola data
Usare `POST /owner/special-slots` (se l'autenticazione GPT è stata completata) oppure operare sul database con gli strumenti Supabase autorizzati. Campi:
- `slot_date`: data ISO `YYYY-MM-DD`;
- `starts_at`: ora locale `HH:MM`.

Prima verificare la data esatta. Per più orari nella stessa data inserire una riga per ogni orario. Non inserire automaticamente la stessa disponibilità per le settimane successive.

### Se è ricorrente ogni settimana
Usare `POST /owner/hours` per una fascia continua. Attenzione: gli slot vengono generati ogni 15 minuti e la durata di ogni servizio è attualmente due ore. Se la titolare fornisce solo orari di inizio discreti ricorrenti (per esempio 10:30, 14:00, 16:00, 18:00) e non una fascia continua, non forzare il modello `business_hours`: occorre estendere il modello per slot settimanali discreti, in modo analogo a `special_slots` ma con weekday.

### Controlli dopo ogni modifica
- rileggere le righe inserite dal database/API;
- controllare che data e ora siano nel fuso Europe/Rome;
- assicurarsi che gli slot non siano già occupati o bloccati;
- ricordare che tutti i servizi durano due ore;
- non promettere la prenotabilità se l'orario è già passato, troppo vicino (anticipo minimo 2 ore), oltre i 90 giorni o in conflitto.

### Cancellare/modificare
Prima leggere l'ID esatto della riga e la data/ora interessata. Cancellare solo la disponibilità richiesta, non gli appuntamenti dei clienti. Se un appuntamento esiste già, non cancellarlo o spostarlo senza un'istruzione esplicita e una conferma chiara.

---

## 9. Sicurezza, privacy e limiti

- Non esporre service-role key, owner key o dati personali.
- La chiave publishable nel browser è pubblica per definizione; non usarla per operazioni privilegiate.
- Le richieste pubbliche non sono confermate automaticamente.
- Prima di considerare il sistema pronto per un uso commerciale completo, completare informativa privacy/consenso, retention e cancellazione dati, rate limiting/anti-abuso e test end-to-end.
- Le tabelle sensibili non devono ricevere policy anon che consentano accesso ai dati cliente.
- RLS attivo senza policy pubbliche è intenzionale per le tabelle riservate; la Edge Function usa il ruolo server.
- Il CORS deve essere limitato al dominio del sito.
- Non assumere che l'email di conferma, notifiche o pannello admin siano implementati se non verificati nel codice.

---

## 10. Cronologia delle attività tecniche svolte

Questa è la sequenza ricostruita dalla conversazione e dai file attualmente presenti:

1. Individuato il progetto sorgente nel repository `W0lW/varese-sites`, branch `feat/extensions-ciglia-verbania`, cartella `custom-pages/extensions-ciglia-verbania/`. La sorgente è stata lasciata intatta.
2. Identificato il repository di destinazione `lolabigmama/Extensions-ciglia-verbania`, branch `main`, da usare per la pubblicazione indipendente su GitHub Pages.
3. Impostata la pagina dedicata con calendario in primo piano, responsive, e listino con due prodotti. Aggiunte/riutilizzate le tre immagini prodotto in `assets/products/`.
4. Collegato il frontend alla Edge Function Supabase tramite `data-booking-api`. Il browser chiama gli endpoint pubblici per servizi, disponibilità e richieste appuntamento.
5. Preparato lo schema prenotazioni e il backend Supabase. Il database live è stato creato con tabelle `services`, `business_hours`, `blocked_dates`, `appointments`, `booking_settings`; RLS è stato abilitato.
6. Inseriti i quattro servizi con prezzi in centesimi e durata 120 minuti.
7. Configurati i parametri di prenotazione: Europe/Rome, slot interval 15 minuti, massimo 90 giorni, anticipo minimo 2 ore.
8. Distribuita la Edge Function `booking-api` con `verify_jwt=false`; la funzione gestisce internamente l'autorizzazione delle rotte titolare tramite `x-owner-api-key`.
9. Predisposto il canale broadcast Realtime `calendar` / `calendar_changed` per aggiornare il calendario quando cambiano disponibilità, blocchi o appuntamenti.
10. Creato il documento OpenAPI `openapi/gpt-actions.yaml` per le Actions del Custom GPT, comprendente endpoint pubblici e privati.
11. Esteso il modello per disponibilità singole per data: creata la tabella `special_slots`, con RLS, indice per data/orario e vincolo di unicità su `(slot_date, starts_at)`.
12. Aggiornata la funzione `booking-api` per leggere `special_slots` e usare gli orari speciali come candidati esclusivi per la data se presenti; aggiunti endpoint privati GET/POST/DELETE per gestirli.
13. Aggiornata l'OpenAPI per esporre le operazioni su `/owner/special-slots`.
14. Registrate e verificate in Supabase le quattro disponibilità del 2 novembre 2026: 10:30, 14:00, 16:00, 18:00.
15. Aggiornati `README-BOOKING.md` e questo manuale per documentare il funzionamento e la disponibilità speciale.
16. Il workflow GitHub Actions `41147219267` ha completato build e deploy con esito `success` dopo gli aggiornamenti di documentazione e codice.

Nota: alcuni file di documentazione più vecchi (in particolare `BOOKING-ARCHITECTURE.md`, `BACKEND-BUNDLE-FOR-GPT.md` e parte di `README.md`) contengono descrizioni di fase progettuale/demo che non riflettono più il database live. Usare questo manuale, `README-BOOKING.md`, il codice effettivo e l'introspezione Supabase come riferimenti aggiornati. Non copiare le vecchie istruzioni di setup senza verificarle.

---

## 11. Procedura standard per ogni modifica al sito

1. Leggere questo file e `README-BOOKING.md`.
2. Leggere il file esistente dal repository di destinazione e ottenere il suo SHA aggiornato.
3. Modificare solo i file necessari nel repository di destinazione, branch `main`.
4. Per codice backend, distribuire la Edge Function solo dopo aver verificato che il file locale/repository corrisponda al codice desiderato.
5. Per modifiche schema, confrontare prima le tabelle live; usare una nuova migrazione incrementale, non riscrivere o rieseguire migrazioni storiche.
6. Verificare il risultato Supabase (schema/righe/funzione attiva).
7. Verificare il workflow GitHub Actions: build e deploy devono risultare entrambi `success`.
8. Solo allora comunicare il completamento e fornire il link pubblico.
9. Aggiornare questo manuale e `README-BOOKING.md` quando cambia una configurazione stabile, una rotta, una tabella o una regola operativa.

## 12. Stato aperto / prossime verifiche

- [ ] Verificare dal browser che il calendario pubblico mostri correttamente i quattro slot del 2 novembre per ciascun servizio.
- [ ] Verificare end-to-end una richiesta di prenotazione di test, poi annullarla/rimuoverla in modo controllato se è stata creata.
- [ ] Impostare e testare `OWNER_ACTION_API_KEY` come secret Supabase e completare l'autenticazione delle GPT Actions.
- [ ] Verificare il valore di `SITE_ORIGIN` nei secrets Supabase.
- [ ] Completare privacy, consenso, anti-abuso e policy di conservazione dati prima di promuovere il flusso a prenotazione automatica.
- [ ] Se la titolare comunicherà orari ricorrenti come inizi discreti, aggiungere il supporto a slot settimanali discreti senza convertire tali orari in fasce continue.

Fine del manuale. In caso di dubbio, non indovinare: controllare il codice live e lo schema Supabase, poi chiedere alla titolare il chiarimento minimo necessario.
