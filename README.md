# NEXORA Support

Pannello di assistenza clienti (React + Vite) con tema dark/viola e chat clienti in tempo reale.

## Due lati, una sola app

- **Lato staff** (pannello): gestione conversazioni, operatori, assegnazioni e impostazioni.
- **Lato cliente** (simil WhatsApp): il cliente inserisce nome e numero e apre una chat
  con lo staff, a schermo intero, senza account.

Dalla pagina di login si passa da un lato all'altro con il link in basso
("Sei un cliente?" / "Sei uno staff?").

Le due schede si sincronizzano in tempo reale: se apri il pannello staff in una
tab e la chat cliente in un'altra, i messaggi appaiono immediatamente su entrambi
i lati (sync via storage events). Le sessioni sono indipendenti per scheda.
Per la sincronizzazione **tra dispositivi e browser diversi** (PC, telefono,
finestra incognito…) vedi la sezione [Sync multi-dispositivo](#sync-multi-dispositivo-in-tempo-reale-supabase).

## Account staff

| Ruolo | Username | Nome visualizzato |
| --- | --- | --- |
| OWNER | `owner` | Sofy_2012 |
| OPERATOR | `operator1` … `operator14` | Operator 1 … Operator 14 |

### Sicurezza delle password

- Le password **non vengono mai salvate in chiaro**: per ogni account esiste
  solo un hash SHA-256 con salt (`sha256("nexora:v1:<password>")`, vedi
  `src/utils/hash.js`).
- Le password **non sono visibili in nessuna schermata**, nemmeno all'OWNER:
  la sezione "Operatori" mostra solo nome, username e stato. Per cambiare una
  password l'OWNER la reimposta (viene subito re-hashata), il personale può
  aggiornare la propria dal profilo.
- Le credenziali iniziali dei 15 account sono configurate dall'owner in
  `src/data/initialData.js` (solo come hash) e vanno cambiate al primo utilizzo.
- Al primo avvio una migrazione allinea automaticamente eventuali dati vecchi
  (hash non uniformi o password in chiaro) al formato attuale, senza perdere
  le credenziali scelte.

Tutti gli operatori partono attivi e offline: **al login lo stato passa
automaticamente a online** (e al logout torna offline). Al primo avvio dopo
l'aggiornamento una migrazione elimina le conversazioni demo e riattiva tutti
gli operatori.

## Pubblicazione online

Il progetto genera un sito statico: il risultato della build va pubblicato su
qualsiasi hosting statico. Con GitHub Pages:

```bash
npm run build
```

e carica la cartella `dist/` (oppure usa l'action ufficiale "Deploy static
content to Pages" con `path: ./dist`). L'app non richiede server: i dati
restano nel browser (localStorage/sessionStorage), quindi su un hosting statico
funziona subito senza configurazioni.

- L'OWNER vede tutte le sezioni: Inbox, Conversazioni, Operatori, Risolte, Impostazioni.
- Gli OPERATOR vedono solo: Inbox, Conversazioni, Risolte.
- Nuovi operatori: sezione "Operatori" → pulsante "Nuovo operatore" (solo OWNER).
- Il nome mostrato in chat deriva sempre dall'account loggato; l'OWNER appare
  sempre come "Sofy_2012".

## Funzionalità

### Lato cliente
- Accesso con nome + numero (nessuna password): il cliente viene riconosciuto
  dal numero e ritrova la sua cronologia.
- Chat stile WhatsApp con lo staff, con nome dell'operatore che risponde.
- Se lo staff segna la conversazione come risolta, il cliente lo vede e può
  riaprirla semplicemente scrivendo un altro messaggio.

### Lato staff
- Login con verifica degli utenti del sistema (letti sempre dal dato più recente).
- **Solo OWNER**: gestire gli operatori (crea, modifica nome e password, attiva/
  disattiva, elimina, presenza), assegnare le chat, vedere tutte le conversazioni
  e cambiare la propria password nella sezione "Il mio profilo". Il nome
  visualizzato dell'owner è fisso per progetto ("Sofy_2012").
- **Operatori**: scrivere e rispondere nelle chat, assegnare una conversazione
  a se stessi ("Assegna a me"), gestire la propria presenza online/offline
  dal pallino nella barra laterale.
- Tutti (owner, operatori e clienti) vedono sempre il nick dell'operatore
  che scrive e, lato cliente, anche chi è assegnato alla chat.
- Conversazioni: assegnazione (solo OWNER, oppure "Assegna a me" per gli operatori),
  stato aperta/risolta, ricerca per nome/testo/numero, filtri con conteggi,
  badge non letti.
- Chat: invio messaggi con nome dinamico dall'account loggato.
- Pannello cliente: nome, numero, operatore assegnato, stato e note interne salvate.
- **Statistiche** (solo OWNER): conversazioni totali/aperte/risolte, messaggi
  scambiati, tempo medio della prima risposta e di risoluzione, performance
  per operatore (assegnate, risolte, messaggi).
- Impostazioni: riepilogo, sync cloud (vedi sotto) e ripristino dei dati iniziali.

## Sync multi-dispositivo in tempo reale (Supabase)

Senza configurazione l'app funziona in modalità locale (dati nel browser).
Collegando un progetto **Supabase gratuito** tutte le chat, i clienti, gli
account e la presenza online diventano condivisi tra **tutti i dispositivi e
browser in tempo reale**: un cliente scrive dal telefono e lo staff vede il
messaggio entro pochi secondi, su qualsiasi dispositivo.

### Setup (una volta, 2 minuti)

1. Crea un progetto gratuito su [supabase.com](https://supabase.com).
2. Nel progetto: **SQL Editor** → incolla il contenuto di `supabase-setup.sql`
   (crea le tabelle `app_state` e `app_presence` con le policy RLS) → Run.
3. **Settings → API**: copia *Project URL* e *anon public key*.
4. Nell'app: **Impostazioni → Sync multi-dispositivo (cloud)** → incolla URL e
   chiave → **Collega**. La pill mostra lo stato (idle / connessione /
   sincronizzato / errore).

In alternativa puoi fornire i valori come variabili d'ambiente
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (vedi `.env.example`): tutti i
dispositivi si collegano da soli senza inserire nulla. Un URL `localhost` nei
dati di build viene **ignorato in produzione** (serve solo per i test in
sviluppo con `scripts/fake-supabase-test.mjs`).

### Come funziona

- Lo stato completo (utenti, clienti, conversazioni) vive in una riga della
  tabella `app_state`; la presenza dello staff nella tabella `app_presence`
  (una riga per utente, senza sovrascritture concorrenti).
- Ogni modifica locale viene pubblicata sul cloud (push con piccolo ritardo di
  accumulo); ogni pochi secondi l'app scarica il cloud e lo **fonde** con lo
  stato locale: i messaggi si uniscono per id, nessuna perdita.
- La presenza usa un heartbeat con scadenza automatica (~2 minuti): chi chiude
  il browser torna offline da solo, anche se la scheda era in background.
- La chiave anon è pubblica per progetto; l'accesso è regolato dalle policy
  RLS di `supabase-setup.sql` e le password restano solo come hash.

## Dati e persistenza

- Dati condivisi (utenti, clienti, conversazioni): `localStorage` con prefisso
  `nexora_support_` e sincronizzazione live tra schede.
- Sessioni (staff e cliente): `sessionStorage`, indipendenti per schede.
- Con il cloud collegato (vedi sopra) i dati vivono anche su Supabase:
  l'adapter è in `src/data/remoteSync.js`.

Il punto di accesso è l'adapter in `src/data/storage.js`: per passare a un backend
reale basta sostituire le funzioni di quell'adapter con chiamate API mantenendo la
stessa firma; le componenti React non vanno toccate. I dati iniziali sono in
`src/data/initialData.js`.

## Sviluppo

```bash
npm install
npm run dev      # server di sviluppo
npm run build    # build di produzione
npm run lint     # controllo ESLint
```
