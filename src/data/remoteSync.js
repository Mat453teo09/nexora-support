import { readItem, writeItem } from "./storage";

/**
 * Sincronizzazione multi-dispositivo tramite Supabase (piano gratuito).
 *
 * L'app funziona anche senza Supabase (modalità locale, dati nel browser).
 * Se l'owner configura URL e chiave anon (nelle Impostazioni oppure via
 * variabili d'ambiente VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), tutti
 * i dispositivi leggono e scrivono lo stesso stato remoto: le chat diventano
 * condivise davvero tra PC, telefono e browser diversi.
 *
 * La "anon key" di Supabase è la chiave pubblica del progetto: la tabella
 * è protetta dalle policy RLS (vedi supabase-setup.sql) e le password
 * esistono solo come hash SHA-256, mai in chiaro.
 */

const REMOTE_CONFIG_KEY = "nexora_support_remote_config";

const STATE_KEY = "app_state";

/** Intervallo di polling in millisecondi (dati e presenza). */
export const POLL_INTERVAL_MS = 4000;

/**
 * La presenza si considera valida fino a questo tempo dall'heartbeat.
 * Vale 2 minuti (non pochi secondi) perché i browser rallentano i timer
 * delle schede in background: con 45s lo staff sembrava offline dopo
 * meno di un minuto anche con la finestra aperta.
 */
export const PRESENCE_TTL_MS = 120_000;

/**
 * Configurazione predefinita da variabili d'ambiente (build pubblicata).
 *
 * Un URL localhost ha senso solo in sviluppo: nel sito pubblicato viene
 * ignorato (evita tentativi di connessione inutili finché l'owner non
 * inserisce l'URL reale del progetto Supabase).
 */
function envRemoteConfig() {
  const url = String(import.meta.env?.VITE_SUPABASE_URL ?? "").trim();
  const anonKey = String(import.meta.env?.VITE_SUPABASE_ANON_KEY ?? "").trim();

  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(url);

  if (isLocalhost && !import.meta.env?.DEV) {
    return { url: "", anonKey: "" };
  }

  return { url, anonKey };
}

export function loadRemoteConfig() {
  const saved = readItem(REMOTE_CONFIG_KEY);

  if (saved && (saved.url || saved.anonKey)) return saved;

  return envRemoteConfig();
}

export function saveRemoteConfig(config) {
  writeItem(REMOTE_CONFIG_KEY, {
    url: String(config.url ?? "").trim().replace(/\/+$/, ""),
    anonKey: String(config.anonKey ?? "").trim(),
  });
}

export function clearRemoteConfig() {
  writeItem(REMOTE_CONFIG_KEY, { url: "", anonKey: "" });
}

export function isRemoteConfigured(config) {
  return Boolean(config?.url && config?.anonKey);
}

async function supabaseFetch(config, path, options = {}) {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: options.prefer ?? "return=representation",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(`Supabase ${response.status}: ${text.slice(0, 200)}`);
  }

  const text = await response.text();

  return text ? JSON.parse(text) : null;
}

/** Scarica lo stato remoto (utenti, clienti, conversazioni). */
export async function fetchRemoteState(config) {
  const rows = await supabaseFetch(
    config,
    `app_state?id=eq.${STATE_KEY}&select=data`,
  );

  const data = rows?.[0]?.data;

  if (!data) return null;

  return {
    users: Array.isArray(data.users) ? data.users : [],
    customers: Array.isArray(data.customers) ? data.customers : [],
    conversations: Array.isArray(data.conversations) ? data.conversations : [],
  };
}

/** Pubblica lo stato locale su Supabase (upsert della riga unica). */
export async function pushRemoteState(
  config,
  { users, customers, conversations },
) {
  await supabaseFetch(config, "app_state", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({
      id: STATE_KEY,
      data: { users, customers, conversations },
      updated_at: new Date().toISOString(),
    }),
  });
}

/**
 * Presenza del personale su tabella separata: ogni dispositivo scrive
 * solo la propria riga (upsert), senza leggere-riscrivere tutto lo stato
 * e quindi senza rischi di sovrascritture concorrenti.
 */
export async function pushPresence(config, userId, online) {
  await supabaseFetch(config, "app_presence", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({
      user_id: userId,
      online: Boolean(online),
      last_seen: new Date().toISOString(),
    }),
  });
}

/** Legge la presenza di tutto lo staff: mappa userId → { online, lastSeen }. */
export async function fetchPresence(config) {
  const rows = await supabaseFetch(config, "app_presence?select=*");

  const presence = {};

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (row?.user_id) {
      presence[row.user_id] = {
        online: Boolean(row.online),
        lastSeen: Date.parse(row.last_seen ?? "") || 0,
      };
    }
  });

  return presence;
}

/** Applica la presenza (con scadenza TTL) agli utenti dello stato. */
export function applyPresenceToUsers(users, presence) {
  const now = Date.now();

  return users.map((user) => {
    const entry = presence?.[user.id];

    if (!entry) return user;

    const fresh = entry.online && now - entry.lastSeen < PRESENCE_TTL_MS;

    return { ...user, online: fresh };
  });
}

/**
 * Unisce lo stato remoto con quello locale:
 * - i campi "autoritativi" (assegnazione, stato, note) vincono dal remoto,
 * - i messaggi delle conversazioni si fondono per id (nessuna perdita),
 * - utenti e clienti si uniscono per id, con la versione remota più recente.
 */
export function mergeStates(localState, remoteState) {
  if (!remoteState) return localState;

  const remoteConversationById = new Map(
    remoteState.conversations.map((item) => [item.id, item]),
  );

  const conversations = localState.conversations.map((conversation) => {
    const remote = remoteConversationById.get(conversation.id);

    if (!remote) return conversation;

    remoteConversationById.delete(conversation.id);

    const localIds = new Set(
      conversation.messages.map((message) => message.id),
    );

    const mergedMessages = [
      ...conversation.messages,
      ...remote.messages.filter((message) => !localIds.has(message.id)),
    ].sort((a, b) => a.time - b.time);

    return {
      ...conversation,
      ...remote,
      messages: mergedMessages,
      unread: Math.max(conversation.unread ?? 0, remote.unread ?? 0),
    };
  });

  remoteState.conversations
    .filter(
      (conversation) =>
        !localState.conversations.some(
          (local) => local.id === conversation.id,
        ),
    )
    .forEach((conversation) => conversations.push(conversation));

  const remoteUserById = new Map(remoteState.users.map((user) => [user.id, user]));

  const users = localState.users.map((user) =>
    remoteUserById.has(user.id) ? { ...user, ...remoteUserById.get(user.id) } : user,
  );

  remoteState.users
    .filter((user) => !users.some((local) => local.id === user.id))
    .forEach((user) => users.push(user));

  const remoteCustomerById = new Map(
    remoteState.customers.map((item) => [item.id, item]),
  );

  const customers = localState.customers.map((customer) =>
    remoteCustomerById.has(customer.id)
      ? { ...customer, ...remoteCustomerById.get(customer.id) }
      : customer,
  );

  remoteState.customers
    .filter((customer) => !customers.some((local) => local.id === customer.id))
    .forEach((customer) => customers.push(customer));

  return { users, customers, conversations };
}
