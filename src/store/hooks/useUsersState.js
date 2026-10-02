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
import { hashPassword } from "../../utils/hash";
import { uuid } from "../../utils/uuid";
import { normalizePhone } from "../../utils/phone";
import { PRESENCE_TTL_MS } from "../../data/remoteSync";

/**
 * Hash ufficiali degli account predefiniti, per id.
 */
const SEED_HASHES_BY_ID = Object.fromEntries(
  [OWNER_ACCOUNT, ...initialOperators].map((user) => [user.id, user.passwordHash]),
);

/** Username → id canonico degli account predefiniti. */
const CANONICAL_IDS_BY_USERNAME = new Map(
  [OWNER_ACCOUNT, ...initialOperators].map((user) => [user.username, user.id]),
);

/**
 * Elimina i duplicati per username (possono arrivare da dati vecchi con
 * id diversi uniti dal cloud): per gli account predefiniti vince sempre la
 * versione con l'id canonico, per i custom la prima con passwordHash.
 */
function dedupeUsers(users) {
  if (!Array.isArray(users) || users.length === 0) return users;

  const indexByUsername = new Map();
  const result = [];

  users.forEach((user) => {
    if (!user?.username) return;

    const key = String(user.username).toLowerCase();
    const canonicalId = CANONICAL_IDS_BY_USERNAME.get(key);
    const candidate = canonicalId ? { ...user, id: canonicalId } : user;
    const existingIndex = indexByUsername.get(key);

    if (existingIndex === undefined) {
      indexByUsername.set(key, result.length);
      result.push(candidate);

      return;
    }

    const current = result[existingIndex];

    const preferCandidate =
      (!current.passwordHash && candidate.passwordHash) ||
      (canonicalId && current.id !== canonicalId);

    if (preferCandidate) {
      result[existingIndex] = candidate;
    }
  });

  return result;
}

/**
 * Migrazioni one-time dei dati salvati.
 */
const ALIGNED_FLAG = "nexora_support_passwords_aligned_v3";
const PROD_MIGRATION_FLAG = "nexora_support_prod_migration_v1";
const LEGACY_PLAINTEXT_FLAG = "nexora_support_legacy_plaintext_v1";

/**
 * Converte i dati vecchi (password in chiaro o vecchi hash senza hash uniforme)
 * al formato attuale: passwordHash per tutti gli account predefiniti.
 */
function migrateUsers(users) {
  if (readItem(ALIGNED_FLAG)) return users;

  const migrated = users.map((user) => {
    const officialHash = SEED_HASHES_BY_ID[user.id];

    if (officialHash && user.passwordHash !== officialHash) {
      return { ...user, passwordHash: officialHash, password: undefined };
    }

    return user;
  });

  writeItem(ALIGNED_FLAG, true);

  return migrated;
}

/**
 * Migrazione "produzione": operatori tutti attivi, chat e clienti demo eliminati.
 */
function runProdMigration() {
  if (readItem(PROD_MIGRATION_FLAG)) return;

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

  writeItem(PROD_MIGRATION_FLAG, true);
}

/**
 * Stato di utenti (staff) e clienti con persistenza automatica
 * e sincronizzazione in tempo reale tra schede: quando l'owner modifica
 * un account (nome, password, attivazione), le altre schede lo vedono subito.
 */
export function useUsersState() {
  const [users, setUsers] = useState(() => {
    runProdMigration();

    const loaded = dedupeUsers(
      migrateUsers(dataStore.loadUsers([OWNER_ACCOUNT, ...initialOperators])),
    );

    dataStore.saveUsers(loaded);

    return loaded;
  });

  const [customers, setCustomers] = useState(() =>
    dataStore.loadCustomers(initialCustomers),
  );

  const lastSavedUsersRef = useRef(JSON.stringify(users));

  /*
   * Conversione one-time degli account creati prima dell'introduzione
   * dell'hash: avevano la password in chiaro nel campo `password`.
   * La convertiamo in passwordHash senza perdere le credenziali scelte.
   */
  useEffect(() => {
    if (readItem(LEGACY_PLAINTEXT_FLAG)) return undefined;

    let cancelled = false;

    (async () => {
      const stored = dataStore.loadUsers([OWNER_ACCOUNT, ...initialOperators]);

      const needsConversion = stored.some(
        (user) =>
          !SEED_HASHES_BY_ID[user.id] &&
          !user.passwordHash &&
          typeof user.password === "string" &&
          user.password !== "",
      );

      if (!needsConversion) {
        writeItem(LEGACY_PLAINTEXT_FLAG, true);

        return;
      }

      const converted = await Promise.all(
        stored.map(async (user) => {
          if (SEED_HASHES_BY_ID[user.id]) {
            return {
              ...user,
              passwordHash: SEED_HASHES_BY_ID[user.id],
              password: undefined,
            };
          }

          if (
            !user.passwordHash &&
            typeof user.password === "string" &&
            user.password !== ""
          ) {
            return {
              ...user,
              passwordHash: await hashPassword(user.password),
              password: undefined,
            };
          }

          return user;
        }),
      );

      if (cancelled) return;

      lastSavedUsersRef.current = JSON.stringify(converted);
      dataStore.saveUsers(converted);
      setUsers(converted);
      writeItem(LEGACY_PLAINTEXT_FLAG, true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
    async ({ displayName, username, password }) => {
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

      const passwordHash = await hashPassword(password);

      const newUser = {
        id: `operator-${uuid()}`,
        username: finalUsername,
        passwordHash,
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
   * nome visualizzato e/o password (che viene hashata).
   */
  const updateStaffProfile = useCallback(
    async (userId, { displayName, password }) => {
      const passwordHash =
        password !== undefined && password.trim() !== ""
          ? await hashPassword(password.trim())
          : undefined;

      updateUserById(userId, (user) => ({
        ...user,
        ...(displayName !== undefined &&
          displayName.trim() !== "" && {
            displayName: displayName.trim(),
          }),
        ...(passwordHash && { passwordHash }),
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

  /* Riferimento sempre aggiornato all'ultimo stato utenti (usato da
     applyPresence per leggere lo stato più recente senza attendere il render). */
  const usersRef = useRef(users);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  /**
   * Applica la presenza remota (chi è online secondo gli heartbeat del cloud)
   * senza toccare il resto dello stato: legge lo stato utenti più recente
   * invece dello snapshot del render, così non sovrascrive dati appena
   * arrivati dalla sincronizzazione.
   */
  const applyPresence = useCallback((presence) => {
    if (!presence || typeof presence !== "object") return;

    const now = Date.now();
    let changed = false;

    const next = usersRef.current.map((user) => {
      const entry = presence[user.id];

      if (!entry) return user;

      const fresh =
        Boolean(entry.online) && now - entry.lastSeen < PRESENCE_TTL_MS;

      if (fresh === user.online) return user;

      changed = true;

      return { ...user, online: fresh };
    });

    if (!changed) return;

    usersRef.current = next;
    lastSavedUsersRef.current = JSON.stringify(next);
    dataStore.saveUsers(next);
    setUsers(next);
  }, []);

  /**
   * Applica utenti remoti (sync multi-dispositivo): sostituisce lo stato
   * e lo salva in locale, senza toccare il flag di migrazione.
   */
  const applyUsers = useCallback((nextUsers) => {
    if (!Array.isArray(nextUsers) || nextUsers.length === 0) return;

    const deduped = dedupeUsers(nextUsers);

    lastSavedUsersRef.current = JSON.stringify(deduped);
    dataStore.saveUsers(deduped);
    setUsers(deduped);
  }, []);

  /**
   * Applica clienti remoti (sync multi-dispositivo), con persistenza.
   */
  const applyCustomers = useCallback((nextCustomers) => {
    if (!Array.isArray(nextCustomers)) return;

    dataStore.saveCustomers(nextCustomers);
    setCustomers(nextCustomers);
  }, []);

  return {
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
  };
}
