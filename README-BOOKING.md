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
Il modulo raccoglie nome, nickname Instagram, trattamento, data/orario e note facoltative. L'email non viene richiesta. Le richieste sono registrate come `pending` e attendono conferma della titolare. Non viene inviato alcun DM Instagram automatico.

## Dove consultare le prenotazioni
Le richieste sono archiviate in `public.appointments` nel progetto Supabase:
https://supabase.com/dashboard/project/lcfdshnpsgaaqmyupzcy/editor

## Disponibilità e calendario
- `business_hours` contiene gli orari settimanali ricorrenti.
- `special_slots` contiene le disponibilità per date specifiche e prevale sugli orari ricorrenti.
- Gli appuntamenti `pending` e `confirmed` occupano la disponibilità.
- Le date bloccate sono gestite tramite `blocked_dates`.
- Le impostazioni sono in `booking_settings`.

## API e azioni titolare
Gli endpoint pubblici per servizi, disponibilità e creazione appuntamenti sono gestiti dalla Edge Function `booking-api`. Le azioni private richiedono `x-owner-api-key`, corrispondente al secret `OWNER_ACTION_API_KEY`. Non esporre mai chiavi private o la service-role key nel frontend, nel repository o nei messaggi.

## Sincronizzazione Google Calendar

Il calendario dedicato è **Prenotazioni extensions 🩷**, ID:
`9423ee2eb38a3e279cecd6aa89960d4c2556b192de63a3505dd8b1788e0e0099@group.calendar.google.com`
Timezone: `Europe/Rome`.

La Edge Function `booking-api` chiama un Google Apps Script tramite i secret server-side:
- `GOOGLE_APPS_SCRIPT_URL`: URL della Web App Apps Script distribuita.
- `GOOGLE_APPS_SCRIPT_TOKEN`: token condiviso, conservato solo nei secret Supabase e nelle Script Properties di Apps Script.

Il bridge è versionato in `google-apps-script/Code.gs`. Per attivarlo:
1. Aprire https://script.google.com/ con l'account Google proprietario del calendario.
2. Creare un progetto Apps Script e incollare il contenuto di `google-apps-script/Code.gs`.
3. In **Impostazioni progetto → Proprietà script**, aggiungere:
   - `GOOGLE_CALENDAR_ID` = l'ID del calendario dedicato riportato sopra.
   - `GOOGLE_BRIDGE_TOKEN` = un token casuale lungo (almeno 32 byte). Non riutilizzare password.
4. In **Distribuisci → Nuova distribuzione → App web**, eseguire l'app come **Me** e consentire l'accesso a **Chiunque**. Autorizzare l'accesso a Google Calendar quando richiesto. Copiare l'URL della Web App che termina in `/exec`.
5. Nel dashboard Supabase del progetto, aprire **Edge Functions → Secrets** e impostare:
   - `GOOGLE_APPS_SCRIPT_URL` = URL `/exec` appena copiato.
   - `GOOGLE_APPS_SCRIPT_TOKEN` = lo stesso token impostato in Script Properties.
6. Dopo aver salvato i secret, inviare una nuova prenotazione di prova dal sito. Deve apparire nel calendario dedicato con titolo `IN ATTESA`. Quando la titolare la conferma, lo stesso evento viene aggiornato a `CONFERMATO`; se la annulla, l'evento viene eliminato.

Il bridge effettua upsert usando l'ID prenotazione, quindi conferme e aggiornamenti modificano l'evento esistente invece di crearne uno duplicato. Le richieste pending sono visibili in calendario ma non equivalgono a prenotazioni confermate.

**Importante:** la parte server-side della Edge Function contiene già la chiamata al bridge, ma la sincronizzazione resta inattiva finché i due secret non sono configurati. Non inserire mai il token in GitHub o nel codice del sito. Se si cambia il codice Apps Script dopo la prima distribuzione, creare una nuova versione della distribuzione Web App.

## Cronologia e manutenzione
- Le richieste pubbliche restano `pending` fino alla conferma della titolare.
- Nessun DM Instagram automatico.
- Il sorgente della Edge Function deve restare versionato in `supabase/functions/booking-api/index.ts`. Prima di ogni deploy, confrontarlo con la versione attiva su Supabase e riallineare il repository dopo il deploy.
