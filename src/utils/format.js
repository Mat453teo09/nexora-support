/**
 * Formattazioni di data e ora per messaggi e liste.
 */

export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatRelativeDay(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();

  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (sameDay) return "Oggi";

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Ieri";

  return formatDate(timestamp);
}

/** Etichetta breve per la lista conversazioni: "10:58" oppure "Ieri". */
export function formatListTimestamp(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();

  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  return sameDay ? formatTime(timestamp) : formatRelativeDay(timestamp);
}

/** Ultimo messaggio di una conversazione (o null se vuota). */
export function getLastMessage(conversation) {
  const messages = conversation?.messages ?? [];

  return messages.length > 0 ? messages[messages.length - 1] : null;
}

/** Etichetta compatta per la dimensione di un file ("12 KB", "1,5 MB"). */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
