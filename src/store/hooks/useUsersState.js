import { useCallback, useEffect, useRef, useState } from "react";

import {
  OWNER_ACCOUNT,
  initialCustomers,
  initialOperators,
} from "../../data/initialData";
import {
  dataStore,
  readItem,
  writeItem,
} from "../../data/storage";
import { normalizePhone } from "../../utils/phone";

/**
 * Password ufficiali degli account predefiniti, per id.
 * Se i dati salvati contengono password diverse (dati vecchi),
 * vengono allineate automaticamente SOLO la prima volta: dopo,
 * l'owner è libero di cambiarle dal pannello e restano persistite.
 */
const SEED_PASSWORDS_BY_ID = Object.fromEntries(
  [OWNER_ACCOUNT, ...initialOperators].map((user) => [user.id, user.password]),
);

const ALIGN_FLAG_KEY = "nexora_support_passwords_aligned_v1";

function alignSeedPasswords(users) {
  if (readItem(ALIGN_FLAG_KEY)) return users;

  let changed = false;

  const migrated = users.map((user) => {
    const officialPassword = SEED_PASSWORDS_BY_ID[user.id];

    if (officialPassword && user.password !== officialPassword) {
      changed = true;

      return { ...user, password: officialPassword };
    }

    return user;
  });

  writeItem(ALIGN_FLAG_KEY, true);

  return changed ? migrated : users;
}

/**
 * Migrazione one-time all'aggiornamento "produzione":
 * - tutti gli operatori tornano attivi;
 * - le chat e i clienti demo vengono eliminati.
 * Non tocca gli account creati dall'owner dopo l'installazione.
 */
const PROD_MIGRATION_FLAG_KEY = "nexora_support_prod_migration_v1";

function runProdMigration() {
  if (readItem(PROD_MIGRATION_FLAG_KEY)) return;

  const users = readItem(dataStore.keys.users);

  if (Array.isArray(users)) {
    const migrated = users.map((user) =>
      user.role === "OPERATOR" && user.active === false
        ? { ...user, active: true }
        : user,
    );

    dataStore.saveUsers(migrated);
  }

  dataStore.saveConversations([]);
  dataStore.saveCustomers([]);

  writeItem(PROD_MIGRATION_FLAG_KEY, true);
}

/**
 * Stato di utenti (staff) e clienti con persistenza automatica
 * e sincronizzazione in tempo reale tra schede: quando l'owner modifica
 * un account (nome, password, attivazione), le altre schede lo vedono subito.
 */
export function useUsersState() {
  const [users, setUsers] = useState(() => {
    runProdMigration();

    const loaded = alignSeedPasswords(
      dataStore.loadUsers([OWNER_ACCOUNT, ...initialOperators]),
    );

    dataStore.saveUsers(loaded);

    return loaded;
  });
  const [customers, setCustomers] = useState(() =>
    dataStore.loadCustomers(initialCustomers),
  );

  const lastSavedUsersRef = useRef(JSON.stringify(users));

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== dataStore.keys.users) return;

      if (!event.newValue || event.newValue === lastSavedUsersRef.current) {
        return;
      }

      try {
        const incoming = JSON.parse(event.newValue);

        if (!Array.isArray(incoming)) return;

        lastSavedUsersRef.current = event.newValue;
        setUsers(incoming);
      } catch {
        // Dato corrotto: ignoriamo.
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const persistUsers = useCallback((nextUsers) => {
    lastSavedUsersRef.current = JSON.stringify(nextUsers);
    setUsers(nextUsers);
    dataStore.saveUsers(nextUsers);
  }, []);

  const updateUserById = useCallback(
    (userId, updater) => {
      persistUsers(
        users.map((user) => (user.id === userId ? updater(user) : user)),
      );
    },
    [users, persistUsers],
  );

  const createOperator = useCallback(
    ({ displayName, username, password }) => {
      const base = String(username).trim().toLowerCase().replace(/\s+/g, "");
      let finalUsername = base;
      let suffix = 2;

      while (
        users.some(
          (user) => user.username.toLowerCase() === finalUsername.toLowerCase(),
        )
      ) {
        finalUsername = `${base}${suffix}`;
        suffix += 1;
      }

      const newUser = {
        id: `operator-${crypto.randomUUID()}`,
        username: finalUsername,
        password,
        displayName: displayName.trim(),
        role: "OPERATOR",
        active: true,
        online: false,
        createdAt: Date.now(),
      };

      persistUsers([...users, newUser]);

      return newUser;
    },
    [users, persistUsers],
  );

  const toggleOperatorActive = useCallback(
    (userId) => {
      updateUserById(userId, (user) => ({ ...user, active: !user.active }));
    },
    [updateUserById],
  );

  const deleteOperator = useCallback(
    (userId) => {
      persistUsers(users.filter((user) => user.id !== userId));
    },
    [users, persistUsers],
  );

  const setOperatorOnline = useCallback(
    (userId, online) => {
      updateUserById(userId, (user) => ({
        ...user,
        online: Boolean(online),
      }));
    },
    [updateUserById],
  );

  /**
   * Aggiorna profilo di un membro dello staff (solo OWNER):
   * nome visualizzato e/o password.
   */
  const updateStaffProfile = useCallback(
    (userId, { displayName, password }) => {
      updateUserById(userId, (user) => ({
        ...user,
        ...(displayName !== undefined &&
          displayName.trim() !== "" && {
            displayName: displayName.trim(),
          }),
        ...(password !== undefined &&
          password.trim() !== "" && { password: password.trim() }),
      }));
    },
    [updateUserById],
  );

  /**
   * Registra un cliente se non esiste (match per numero di telefono)
   * e restituisce quello già presente in caso di match.
   */
  const registerCustomer = useCallback(
    (customer) => {
      const existing = customers.find(
        (candidate) =>
          normalizePhone(candidate.phone) === normalizePhone(customer.phone),
      );

      if (existing) return existing;

      const nextCustomers = [...customers, customer];

      dataStore.saveCustomers(nextCustomers);
      setCustomers(nextCustomers);

      return customer;
    },
    [customers],
  );

  return {
    users,
    customers,
    createOperator,
    toggleOperatorActive,
    deleteOperator,
    setOperatorOnline,
    updateStaffProfile,
    registerCustomer,
  };
}
