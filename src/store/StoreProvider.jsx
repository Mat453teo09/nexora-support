import { useCallback, useEffect, useMemo, useState } from "react";

import { dataStore } from "../data/storage";
import { authenticateUser } from "../utils/auth";
import { StoreContext } from "./storeContext";
import { useConversationActions } from "./hooks/useConversationActions";
import { useConversationsState } from "./hooks/useConversationsState";
import { useUsersState } from "./hooks/useUsersState";

export function StoreProvider({ children }) {
  const {
    users,
    customers,
    createOperator,
    toggleOperatorActive,
    deleteOperator,
    updateStaffProfile,
    setOperatorOnline,
    registerCustomer,
  } = useUsersState();

  const [conversations, setConversations] = useConversationsState();

  const conversationActions = useConversationActions(setConversations);

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

  const value = useMemo(
    () => ({
      users,
      customers,
      conversations,
      session,
      clientSession,
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
