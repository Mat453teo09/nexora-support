/**
 * Storage adapter.
 *
 * Oggi usa localStorage. Per passare a un backend reale basta
 * sostituire le funzioni di questo file con chiamate API
 * (fetch/axios) mantenendo la stessa firma: il resto dell'app
 * non deve sapere dove vengono salvati i dati.
 */

const PREFIX = "nexora_support_";

const KEYS = {
  users: `${PREFIX}users`,
  customers: `${PREFIX}customers`,
  conversations: `${PREFIX}conversations`,
  session: `${PREFIX}session`,
  clientSession: `${PREFIX}client_session`,
};

export const storageKeys = KEYS;

function isStorageAvailable() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

export function readItem(key) {
  if (!isStorageAvailable()) return null;

  const raw = window.localStorage.getItem(key);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeItem(key, value) {
  if (!isStorageAvailable()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage pieno o non disponibile: ignoriamo senza rompere l'app.
  }
}

export function removeItem(key) {
  if (!isStorageAvailable()) return;

  window.localStorage.removeItem(key);
}

/*
 * Le sessioni (staff e cliente) vivono in sessionStorage: ogni scheda
 * del browser ha la propria, così si può tenere aperto il pannello
 * staff in una tab e la chat cliente in un'altra, come due dispositivi.
 */

function isSessionStorageAvailable() {
  try {
    return typeof window !== "undefined" && Boolean(window.sessionStorage);
  } catch {
    return false;
  }
}

export function readSessionItem(key) {
  if (!isSessionStorageAvailable()) return null;

  const raw = window.sessionStorage.getItem(key);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeSessionItem(key, value) {
  if (!isSessionStorageAvailable()) return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage non disponibile: ignoriamo senza rompere l'app.
  }
}

export function removeSessionItem(key) {
  if (!isSessionStorageAvailable()) return;

  window.sessionStorage.removeItem(key);
}

/**
 * Carica i dati, seminando i valori iniziali al primo avvio.
 */
export function loadCollection(key, seed) {
  const saved = readItem(key);

  if (Array.isArray(saved)) return saved;

  writeItem(key, seed);

  return seed;
}

/**
 * Oggetto pronta per essere sostituita con un client API
 * (es. async fetch verso /api/operators) senza toccare la UI.
 */
export const dataStore = {
  keys: KEYS,
  loadUsers: (seed) => loadCollection(KEYS.users, seed),
  loadCustomers: (seed) => loadCollection(KEYS.customers, seed),
  loadConversations: (seed) => loadCollection(KEYS.conversations, seed),
  saveUsers: (users) => writeItem(KEYS.users, users),
  saveCustomers: (customers) => writeItem(KEYS.customers, customers),
  saveConversations: (conversations) => writeItem(KEYS.conversations, conversations),
  loadSession: () => readSessionItem(KEYS.session),
  saveSession: (session) => writeSessionItem(KEYS.session, session),
  clearSession: () => removeSessionItem(KEYS.session),
  loadClientSession: () => readSessionItem(KEYS.clientSession),
  saveClientSession: (session) => writeSessionItem(KEYS.clientSession, session),
  clearClientSession: () => removeSessionItem(KEYS.clientSession),
};
