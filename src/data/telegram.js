/**
 * Notifiche tramite bot Telegram.
 *
 * Perché Telegram: invia una notifica vera sul telefono (anche ad app
 * chiusa) senza bisogno di un backend. Basta creare un bot con
 * @BotFather e fornire il token + gli id delle chat.
 *
 * La sequenza è quella richiesta: prima l'owner, poi gli operatori,
 * uno dopo l'altro (invii sequenziali, non in parallelo).
 */

/** Configurazione predefinita incorporata nel build (opzionale). */
export function defaultBotConfig() {
  const operatorIds = String(
    import.meta.env?.VITE_TELEGRAM_OPERATOR_CHAT_IDS ?? "",
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    token: String(import.meta.env?.VITE_TELEGRAM_BOT_TOKEN ?? "").trim(),
    ownerChatId: String(import.meta.env?.VITE_TELEGRAM_OWNER_CHAT_ID ?? "").trim(),
    operatorChatIds: operatorIds,
  };
}

/** Normalizza una config arrivata dallo storage o dal cloud. */
export function normalizeBotConfig(config) {
  if (!config || typeof config !== "object") return null;

  const operatorChatIds = Array.isArray(config.operatorChatIds)
    ? config.operatorChatIds
    : String(config.operatorChatIds ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

  return {
    token: String(config.token ?? "").trim(),
    ownerChatId: String(config.ownerChatId ?? "").trim(),
    operatorChatIds: operatorChatIds.filter(Boolean),
  };
}

export function isBotConfigured(config) {
  const normalized = normalizeBotConfig(config);

  if (!normalized?.token) return false;

  return Boolean(
    normalized.ownerChatId || normalized.operatorChatIds.length > 0,
  );
}

async function sendTelegramMessage(config, chatId, text) {
  const response = await fetch(
    `https://api.telegram.org/bot${config.token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();

    throw new Error(`Telegram ${response.status}: ${detail.slice(0, 120)}`);
  }

  return true;
}

/**
 * Notifica di una nuova chat: prima l'owner, poi ogni operatore.
 * Ritorna il numero di invii riusciti e l'eventuale errore (senza lanciare,
 * per non bloccare mai l'invio del messaggio del cliente).
 */
export async function notifyNewConversation(config, info = {}) {
  const normalized = normalizeBotConfig(config);

  if (!isBotConfigured(normalized)) {
    return { sent: 0, skipped: true };
  }

  const lines = [
    "🔔 Nuova chat di supporto",
    "",
    `Cliente: ${info.customerName ?? "Sconosciuto"}`,
  ];

  if (info.customerPhone) {
    lines.push(`Telefono: ${info.customerPhone}`);
  }

  if (info.messageText) {
    lines.push(`Messaggio: ${info.messageText.slice(0, 300)}`);
  }

  lines.push("", "Apri il pannello NEXORA per rispondere.");

  const text = lines.join("\n");
  const recipients = [];

  /* Sequenza richiesta: owner per primo, poi gli operatori. */
  if (normalized.ownerChatId) {
    recipients.push({ chatId: normalized.ownerChatId, role: "owner" });
  }

  normalized.operatorChatIds.forEach((chatId) => {
    recipients.push({ chatId, role: "operator" });
  });

  let sent = 0;
  let lastError = null;

  for (const recipient of recipients) {
    try {
      await sendTelegramMessage(normalized, recipient.chatId, text);
      sent += 1;
    } catch (error) {
      lastError = String(error?.message ?? error);
    }
  }

  return { sent, error: lastError };
}
