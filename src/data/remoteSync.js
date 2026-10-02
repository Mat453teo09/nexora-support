import { readItem, writeItem } from "./storage";
import { uuid } from "../utils/uuid";

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

/**
 * Intervallo di polling in millisecondi.
 *
 * Con la scheda visibile il polling è molto rapido (i messaggi arrivano
 * in ~1-2 secondi); in background i browser limitano comunque i timer,
 * quindi si rallenta per non sprecare richieste.
 */
export const POLL_VISIBLE_MS = 1_500;
export const POLL_HIDDEN_MS = 10_000;

/**
 * Ritardo di accumulo del push dopo una modifica locale: piccolo per far
 * viaggiare i messaggi subito, abbastanza da raggruppare le modifiche a raffica.
 */
export const PUSH_DEBOUNCE_MS = 250;

/** Intervallo del polling in base alla visibilità della scheda. */
export function currentPollIntervalMs() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return POLL_HIDDEN_MS;
  }

  return POLL_VISIBLE_MS;
}

/**
 * La presenza si considera valida fino a questo tempo dall'heartbeat.
 * Vale 2 minuti (non pochi secondi) perché i browser rallentano i timer
 * delle schede in background: con 45s lo staff sembrava offline dopo
 * meno di un minuto anche con la finestra aperta.
 */
export const PRESENCE_TTL_MS = 120_000;

/** Dimensione massima di un allegato (limite pratico del piano gratuito). */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

/** Bucket Supabase Storage che contiene gli allegati delle chat. */
export const ATTACHMENTS_BUCKET = "nexora-attachments";

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

  const savedIsLocalhost =
    saved && /^https?:\/\/(localhost|127\.0\.0\.1)/.test(saved.url ?? "");

  /* Una config salvata verso localhost non maschera le chiavi incorporate
     nel sito pubblicato: in produzione vale la config di build. */
  if (
    saved &&
    (saved.url || saved.anonKey) &&
    !(savedIsLocalhost && !import.meta.env?.DEV)
  ) {
    return saved;
  }

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

/**
 * Carica un allegato su Supabase Storage e restituisce i metadati da
 * salvare nel messaggio (URL pubblico, nome, dimensione, tipo).
 */
export async function uploadAttachment(config, { conversationId, file }) {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("L'allegato supera il limite di 4 MB.");
  }

  const extension = (
    (file.name.split(".").pop() ?? "").match(/^[a-zA-Z0-9]{1,8}$/)
      ? `.${file.name.split(".").pop().toLowerCase()}`
      : ""
  );

  const path = `conv-${conversationId}/${Date.now()}-${uuid().slice(0, 8)}${extension}`;

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Lettura del file non riuscita"));
    reader.readAsDataURL(file);
  });

  const body = await (await fetch(dataUrl)).blob();
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");

  const response = await fetch(
    `${config.url}/storage/v1/object/${ATTACHMENTS_BUCKET}/${encodedPath}`,
    {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true",
      },
      body,
    },
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(`Upload non riuscito (${response.status}): ${text.slice(0, 120)}`);
  }

  return {
    url: `${config.url}/storage/v1/object/public/${ATTACHMENTS_BUCKET}/${encodedPath}`,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
  };
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
    clearedAt: Number(data.clearedAt) || 0,
    bot: data.bot && typeof data.bot === "object" ? data.bot : null,
  };
}

/** Pubblica lo stato locale su Supabase (upsert della riga unica). */
export async function pushRemoteState(
  config,
  { users, customers, conversations, clearedAt = 0, bot = null },
) {
  await supabaseFetch(config, "app_state", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({
      id: STATE_KEY,
      data: {
        users,
        customers,
        conversations,
        clearedAt: Number(clearedAt) || 0,
        ...(bot ? { bot } : {}),
      },
      updated_at: new Date().toISOString(),
    }),
  });
}

/**
 * Ultima attività di una conversazione: serve al tombstone di cancellazione.
 * Usa la data di creazione e il timestamp del messaggio più recente.
 */
function conversationLastActivity(conversation) {
  const created = Number(conversation?.createdAt) || 0;

  const lastMessage = (conversation?.messages ?? []).reduce(
    (max, message) => Math.max(max, Number(message?.time) || 0),
    0,
  );

  return Math.max(created, lastMessage);
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

  /* Tombstone: quando le chat vengono cancellate, clearedAt è il momento
     della cancellazione. Le conversazioni la cui ultima attività è
     precedente vengono rimosse anche negli altri dispositivi, così la
     cancellazione non viene "resuscitata" da chi ha ancora i vecchi dati. */
  const clearedAt = Math.max(
    Number(remoteState.clearedAt) || 0,
    Number(localState.clearedAt) || 0,
  );

  const localConversations = localState.conversations.filter(
    (conversation) => conversationLastActivity(conversation) >= clearedAt,
  );

  const remoteConversationById = new Map(
    remoteState.conversations.map((item) => [item.id, item]),
  );

  const conversations = localConversations.map((conversation) => {
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
        !localConversations.some(
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

  return {
    users,
    customers,
    conversations,
    clearedAt,
    bot: remoteState.bot ?? localState.bot ?? null,
  };
}
