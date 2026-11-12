# Istruzioni per il ripristino del contesto
## Progetto Extensions Ciglia Verbania

Questo documento raccoglie lo stato del progetto, le decisioni già prese e le modifiche pubblicate. Leggerlo prima di intervenire sul sito o sul sistema di prenotazione.

## Repository e sito
- Repository GitHub: `lolabigmama/Extensions-ciglia-verbania`
- Sito pubblico: https://lolabigmama.github.io/Extensions-ciglia-verbania/
- Gestione: https://lolabigmama.github.io/Extensions-ciglia-verbania/gestione.html
- Pagina prodotti: https://lolabigmama.github.io/Extensions-ciglia-verbania/sciampi.html

## Regole fondamentali per le modifiche
- L'utente è principiante e preferisce spiegazioni semplici, un passaggio alla volta.
- Prima di modificare file esistenti, recuperare sempre la versione attuale da GitHub.
- Non sovrascrivere mai il lavoro già pubblicato con una copia vecchia.
- Per ogni aggiornamento usare un commit GitHub e verificare il risultato rileggendo il file.
- Non modificare o rimuovere gli ID, gli endpoint, la logica API o il flusso di prenotazione esistente senza una richiesta esplicita e una verifica accurata.
- Non inserire chiavi, token o segreti nel codice HTML/JavaScript pubblico e non chiedere all'utente di incollarli in chat.

## Stile e direzione grafica
- Direzione approvata: elegante, americana, innovativa, premium.
- Palette: avorio, nero/espresso, beige/tortora e rosa cipria desaturato.
- Tipografia editoriale, spazi ampi, look moderno e raffinato.
- La prenotazione e il calendario devono restare il fulcro della homepage.
- Nell'header della homepage deve esserci solo il logo, senza menu di navigazione.
- Pagina prodotti separata.
- Font utilizzati/previsti: Italiana, Manrope e DM Sans.

## Regole mostrate prima della prenotazione
Il modulo mostra un dialogo obbligatorio con le regole prima dell'invio della prenotazione. La cliente deve selezionare la casella di accettazione per proseguire.

Regole attualmente presenti:
1. **Puntualità:** presentarsi puntuali all'orario concordato, non in anticipo.
2. **Disdette:** la disdetta nella stessa giornata comporta il pagamento del 50% del trattamento; senza pagamento non è possibile prenotare nuovamente.
3. **Cura delle ciglia:** l'utilizzo dello shampoo specifico per ciglia è obbligatorio per mantenere le extension pulite, belle e durature e tutelare le ciglia naturali.
4. **Telefono durante la seduta:** telefono in modalità silenziosa durante il trattamento, per garantire tranquillità, concentrazione e precisione.
5. **Tempi del refill:** oltre 2-3 settimane non si tratta più di refill ma di un nuovo set completo.
6. **Nessuna fretta durante il trattamento:** non prendere impegni immediatamente dopo il trattamento, anche in caso di refill, per consentire il tempo necessario e lavorare con cura e precisione.
7. **No accompagnatori:** non sono ammessi accompagnatori, per garantire tranquillità, igiene e concentrazione.
8. **Ritardi:** evitare ritardi superiori a 15 minuti; un ritardo eccessivo può compromettere le clienti successive e impedire lo svolgimento del trattamento.
9. **Disdette via Instagram:** per disdire un appuntamento, scrivere direttamente in DM su Instagram a @extensionscigliaverbania.

Nota: le regole 02 e 09 sono entrambe intenzionali. La 02 definisce la penale per la disdetta nello stesso giorno; la 09 indica il canale da usare per comunicare la disdetta.

## Prenotazioni: funzionamento attuale
- Il calendario è il punto centrale della homepage.
- Quando la cliente seleziona una data, gli orari disponibili vengono caricati subito, senza dover prima scegliere il trattamento.
- Tutti i trattamenti attivi hanno durata di 120 minuti.
- La selezione del trattamento resta obbligatoria per completare la prenotazione.
- L'ordine dei campi nel modulo è: **Orari disponibili**, poi **Scegli il trattamento**.
- Se la cliente seleziona prima un orario e poi il trattamento, l'orario selezionato deve restare selezionato.
- Il caricamento degli orari usa il primo servizio attivo come riferimento per la durata comune di 120 minuti.
- Non ripristinare il vecchio vincolo che richiedeva la selezione del trattamento prima di mostrare gli orari.

## Conferma automatica e Google Calendar
- Le nuove prenotazioni vengono confermate automaticamente dopo l'accettazione delle regole e l'invio corretto del modulo.
- La Edge Function `booking-api` imposta lo stato su `confirmed`.
- L'evento Google Calendar viene creato con titolo `CONFERMATO · [nome] · [trattamento]`.
- La prenotazione viene considerata confermata solo se la sincronizzazione con Google Calendar riesce.
- Se la sincronizzazione fallisce, lo stato viene riportato a `pending`, la funzione risponde con HTTP 502 e mostra il messaggio: “Non è stato possibile confermare l’appuntamento sul calendario. Riprova tra poco.”
- Messaggio di successo sul sito:
  “Il tuo appuntamento è stato confermato. Ti aspetto in Via Repubblica 7/8 a Trobaso🏡
  Scrivimi sulla pagina @extensionscigliaverbania quando ci sei 🩷”
- Le prenotazioni precedenti non sono state modificate dalla modifica alla conferma automatica. Al controllo precedente risultavano ancora 2 vecchie prenotazioni `pending`.

## Orari speciali
- Gli orari extra vengono salvati nella tabella Supabase `public.special_slots`.
- È stato aggiunto e verificato un orario speciale per venerdì 20 novembre 2026 alle 16:00.
- Riga inserita: `slot_date = 2026-11-20`, `starts_at = 16:00:00`.
- ID della riga: `1b9e2618-a4a1-4f80-bafd-51c1112a195e`.
- Prima dell'inserimento è stato verificato che non ci fossero appuntamenti sovrapposti nel database né eventi sovrapposti nel calendario Google collegato.
- La riga è stata verificata nuovamente dopo l'inserimento.
- Per aggiungere altri orari speciali, usare la tabella `public.special_slots`, dopo aver controllato eventuali sovrapposizioni con appuntamenti e calendario. Non creare una prenotazione cliente per rappresentare uno slot libero.

## Pagina prodotti / cura ciglia
- File: `sciampi.html`.
- Pagina separata dal calendario, con collegamento per tornare alla prenotazione.
- Prodotto presentato: **Whipped Shampoo**.
- Prezzo: **20 €**.
- È stata corretta la pagina per usare il design condiviso del sito, mostrare l'immagine reale del prodotto, il titolo, il prezzo e la descrizione.
- La cura delle ciglia e l'uso dello shampoo sono coerenti con la regola 03.

## Backend, database e integrazioni
- Progetto Supabase ref: `lcfdshnpsgaaqmyupzcy`.
- URL Supabase: https://lcfdshnpsgaaqmyupzcy.supabase.co
- Edge Function: `booking-api`, versione attiva verificata: 11.
- Tabella appuntamenti: `public.appointments`.
- Tabella orari speciali: `public.special_slots`.
- Calendario Google: “Prenotazioni extensions 🩷”.
- Fuso orario calendario: `Europe/Rome`.
- ID calendario: `9423ee2eb38a3e279cecd6aa89960d4c2556b192de63a3505dd8b1788e0e0099@group.calendar.google.com`.
- È presente un ponte Google Calendar tramite Apps Script.
- Segreti configurati nel backend: `GOOGLE_APPS_SCRIPT_URL`, `GOOGLE_APPS_SCRIPT_TOKEN`.
- La pagina di gestione usa l'header `x-owner-api-key`; il segreto è configurato in Supabase come `OWNER_ACTION_API_KEY` e viene inserito dall'utente nella pagina di gestione. Non inserirlo mai nei file pubblici.
- Le notifiche email non sono configurate.

## Cronologia delle modifiche pubblicate
- Regole obbligatorie prima dell'invio prenotazione: commit `edf4ac5e223cdcd18597b05311bfa0cad83b87c4`.
- Restyling premium: commit `a9f267732f1030db76c451191bd0d4c04c9f0ca2`.
- Creazione pagina prodotti: commit `48c39f851c5ebf124a08d3a4d74931c98b2621f0`.
- Rimozione menu header homepage, lasciando il logo: commit `67449b7610be1cfc7bd1b6aa116a428eb36ee1f6`.
- Correzione pagina shampoo e immagine prodotto: commit `a8402eb76504d69821db120fefffb1731fa72b40`.
- Conferma automatica prenotazioni: commit `cbcac0bcc442c33ffacb7343f2e521906248eb24`.
- Aggiornamento messaggio conferma con “a Trobaso”: commit `61e2042291e4a9dfb235b5c05be760f06cecf98b`.
- Caricamento orari senza selezionare prima il trattamento: commit `9f27c5b2158c2dc8499f8d29c5510a8be8ed90c8`.
- Mantenimento dell'orario selezionato dopo la scelta del trattamento: commit `1c23ddf805565d6db255315022078ecbe0f1cbdd`.
- Aggiunta regola 09 per disdette via DM Instagram: commit `0ca10359729dd7a681b38445e7c5bc3828fb6f1a`.
- Inserimento orario speciale 20 novembre 2026 alle 16:00 nel database Supabase: ID riga `1b9e2618-a4a1-4f80-bafd-51c1112a195e` (operazione database, non commit GitHub).
- Spostamento del campo “Orari disponibili” sopra “Scegli il trattamento”: commit `b1aa64d88065d0c7b21b03e834b99c0936cfa57b`.

## Ultimo stato verificato
- Ultimo commit del sito registrato in questo documento: `b1aa64d88065d0c7b21b03e834b99c0936cfa57b`.
- Dopo il commit è stato riletto `index.html` e verificato che “Orari disponibili” precede “Scegli il trattamento”.
- È stata verificata anche la persistenza dello slot speciale del 20 novembre 2026 alle 16:00.
- Questo documento è una guida di ripristino del contesto, non sostituisce una verifica dello stato live prima di nuove modifiche.

## Procedura consigliata per riprendere il lavoro
1. Leggere questo documento.
2. Recuperare da GitHub la versione attuale del file da modificare.
3. Per modifiche alla prenotazione, controllare anche la Edge Function `booking-api` e preservare gli ID e il flusso esistente.
4. Per modifiche al database, verificare prima lo stato attuale di appuntamenti e orari speciali.
5. Apportare una modifica per volta, pubblicarla e verificare il risultato.
6. Aggiornare questo documento dopo ogni nuova modifica significativa, indicando cosa è cambiato, dove è stato salvato e il commit o ID risultante.
