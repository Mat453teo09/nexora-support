import { useCallback, useEffect, useMemo, useState } from "react";

import { dataStore } from "../data/storage";
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
  } = useRemoteSync({
    users,
    customers,
    conversations,
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
      ...conversationActions,
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
      conversationActions,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}
