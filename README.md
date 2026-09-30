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

## Account staff

| Ruolo | Username | Nome visualizzato |
| --- | --- | --- |
| OWNER | `owner` | Sofy_2012 |
| OPERATOR | `operator1` … `operator14` | Operator 1 … Operator 14 |

Le password sono definite in `src/data/initialData.js` (una diversa per ogni
account) e sono visibili all'OWNER nella sezione "Operatori". Tutti gli
operatori partono attivi e offline: **al login lo stato passa automaticamente
a online** (e al logout torna offline). Al primo avvio dopo l'aggiornamento una
migrazione elimina le conversazioni demo e riattiva tutti gli operatori.

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
- Impostazioni: riepilogo e ripristino dei dati iniziali.

## Dati e persistenza

- Dati condivisi (utenti, clienti, conversazioni): `localStorage` con prefisso
  `nexora_support_` e sincronizzazione live tra schede.
- Sessioni (staff e cliente): `sessionStorage`, indipendenti per scheda.

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
