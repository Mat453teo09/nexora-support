import { useCallback, useEffect, useMemo, useState } from "react";

import { dataStore } from "../data/storage";
import {
  defaultBotConfig,
  isBotConfigured,
  normalizeBotConfig,
  notifyNewConversation,
} from "../data/telegram";
import { useConversationActions } from "./hooks/useConversationActions";
import { useConversationsState } from "./hooks/useConversationsState";
import { useRemoteSync } from "./hooks/useRemoteSync";
import { useUsersState } from "./hooks/useUsersState";
import { authenticateUser } from "../utils/auth";
import { StoreContext } from "./storeContext";

export function StoreProvider({ children }) {
  /* ==================== DATI LOCALI (con sync tra schede) ==================== */

  const {
    users,
    customers,
    createOperator,
    toggleOperatorActive,
    deleteOperator,
    setOperatorOnline,
    updateStaffProfile,
    registerCustomer,
    applyUsers,
    applyCustomers,
    applyPresence,
  } = useUsersState();

  const [conversations, setConversations] = useConversationsState();

  /* Tombstone di cancellazione chat (sincronizzato col cloud) e config bot. */
  const [chatsClearedAt, setChatsClearedAt] = useState(() =>
    dataStore.loadChatsClearedAt(),
  );
  const [botConfig, setBotConfig] = useState(
    () => normalizeBotConfig(dataStore.loadBotConfig()) ?? defaultBotConfig(),
  );

  useEffect(() => {
    dataStore.saveChatsClearedAt(chatsClearedAt);
  }, [chatsClearedAt]);

  useEffect(() => {
    dataStore.saveBotConfig(botConfig);
  }, [botConfig]);

  /* ==================== SESSIONI ==================== */

  const [session, setSession] = useState(() => dataStore.loadSession());
  const [clientSession, setClientSession] = useState(() =>
    dataStore.loadClientSession(),
  );

  useEffect(() => {
    if (session) {
      dataStore.saveSession(session);
    } else {
      dataStore.clearSession();
    }
  }, [session]);

  useEffect(() => {
    if (clientSession) {
      dataStore.saveClientSession(clientSession);
    } else {
      dataStore.clearClientSession();
    }
  }, [clientSession]);

  /* ==================== SYNC MULTI-DISPOSITIVO ==================== */

  /* Applica uno stato remoto+locale unito: conversazioni sempre,
     utenti e clienti solo se il remote li contiene (evita che l'heartbeat
     di presenza resetti utenti/clienti non ancora scaricati). */
  const applyRemote = useCallback(
    (merged) => {
      setConversations(merged.conversations);

      if (merged.clearedAt) {
        setChatsClearedAt((previous) => Math.max(previous, merged.clearedAt));
      }

      if (merged.bot) {
        setBotConfig((previous) => {
          const next = normalizeBotConfig(merged.bot);

          return next?.token ? next : previous;
        });
      }

      if (Array.isArray(merged.users) && merged.users.length > 0) {
        applyUsers(merged.users);
      }

      if (Array.isArray(merged.customers)) {
        applyCustomers(merged.customers);
      }
    },
    [setConversations, applyUsers, applyCustomers],
  );

  /* Solo presenza (dal polling): non tocca conversazioni/utenti/clienti,
     così non può sovrascrivere dati appena sincronizzati. */
  const applyRemotePresence = useCallback(
    (presence) => applyPresence(presence),
    [applyPresence],
  );

  const {
    remoteConfig,
    remoteStatus,
    remoteError,
    lastSyncAt,
    connect: connectRemoteBase,
    disconnect: disconnectRemote,
    replaceRemote,
  } = useRemoteSync({
    users,
    customers,
    conversations,
    clearedAt: chatsClearedAt,
    bot: botConfig,
    session,
    applyRemote,
    applyRemotePresence,
  });

  /* ==================== AZIONI ==================== */

  const login = useCallback(
    (username, password) => authenticateUser(users, username, password),
    [users],
  );

  /* Il login segna automaticamente il membro dello staff come online;
     al logout torna offline. */
  const startSession = useCallback(
    (user) => {
      setSession(user);

      if (user?.id) {
        setOperatorOnline(user.id, true);
      }
    },
    [setOperatorOnline],
  );

  const logout = useCallback(() => {
    if (session?.id) {
      setOperatorOnline(session.id, false);
    }

    setSession(null);
  }, [session, setOperatorOnline]);

  const startClientSession = useCallback(
    (customer) => setClientSession(customer),
    [],
  );

  const logoutClient = useCallback(() => setClientSession(null), []);

  const conversationActions = useConversationActions(setConversations);

  /* ==================== NOTIFICHE NUOVA CHAT (BOT) ==================== */

  /* Notifica sequenziale: prima l'owner, poi gli operatori. Non blocca mai
     l'invio del messaggio del cliente: eventuali errori vengono ignorati. */
  const notifyNewChat = useCallback(
    (customer, messageText) => {
      if (!isBotConfigured(botConfig)) return;

      notifyNewConversation(botConfig, {
        customerName: customer?.name,
        customerPhone: customer?.phone,
        messageText,
      }).catch(() => {});
    },
    [botConfig],
  );

  /* Wrapper: rileva la creazione di una conversazione e avvisa il bot. */
  const sendCustomerMessage = useCallback(
    (customerId, payload) => {
      const isNewConversation = !conversations.some(
        (conversation) => conversation.customerId === customerId,
      );

      conversationActions.sendCustomerMessage(customerId, payload);

      if (isNewConversation) {
        const customer = customers.find((item) => item.id === customerId);

        notifyNewChat(customer, payload?.text);
      }
    },
    [conversations, customers, conversationActions, notifyNewChat],
  );

  const createConversationForCustomer = useCallback(
    (customer) => {
      const isNewConversation = !conversations.some(
        (conversation) => conversation.customerId === customer.id,
      );

      conversationActions.createConversationForCustomer(customer);

      if (isNewConversation) {
        notifyNewChat(customer);
      }
    },
    [conversations, conversationActions, notifyNewChat],
  );

  /** Configura il bot Telegram (Impostazioni owner). */
  const updateBotConfig = useCallback((config) => {
    setBotConfig(normalizeBotConfig(config) ?? defaultBotConfig());
  }, []);

  /**
   * Cancella tutte le chat: azzera le conversazioni locali, scrive subito
   * lo stato vuoto sul cloud e tramite il tombstone le rimuove anche dagli
   * altri dispositivi (clienti e operatori restano intatti).
   */
  const clearAllConversations = useCallback(async () => {
    const clearedAtNow = Date.now();

    setChatsClearedAt(clearedAtNow);
    setConversations([]);

    const result = await replaceRemote({
      users,
      customers,
      conversations: [],
      clearedAt: clearedAtNow,
      bot: botConfig,
    });

    return result;
  }, [users, customers, botConfig, setConversations, replaceRemote]);

  /* Il connect vero passa anche l'utente corrente per l'heartbeat. */
  const connect = useCallback(
    async (config) => connectRemoteBase(config),
    [connectRemoteBase],
  );

  /* ==================== CONTESTO ==================== */

  const value = useMemo(
    () => ({
      users,
      customers,
      conversations,
      session,
      clientSession,
      remoteConfig,
      remoteStatus,
      remoteError,
      lastSyncAt,
      connect,
      disconnectRemote,
      login,
      startSession,
      logout,
      startClientSession,
      logoutClient,
      registerCustomer,
      createOperator,
      toggleOperatorActive,
      deleteOperator,
      setOperatorOnline,
      updateStaffProfile,
      chatsClearedAt,
      botConfig,
      updateBotConfig,
      clearAllConversations,
      ...conversationActions,
      sendCustomerMessage,
      createConversationForCustomer,
    }),
    [
      users,
      customers,
      conversations,
      session,
      clientSession,
      remoteConfig,
      remoteStatus,
      remoteError,
      lastSyncAt,
      connect,
      disconnectRemote,
      login,
      startSession,
      logout,
      startClientSession,
      logoutClient,
      registerCustomer,
      createOperator,
      toggleOperatorActive,
      deleteOperator,
      setOperatorOnline,
      updateStaffProfile,
      chatsClearedAt,
      botConfig,
      updateBotConfig,
      clearAllConversations,
      conversationActions,
      sendCustomerMessage,
      createConversationForCustomer,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}
