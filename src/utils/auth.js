/**
 * Helper per l'autenticazione degli utenti del sistema.
 */

export function normalizeUsername(username) {
  return String(username ?? "").trim().toLowerCase();
}

/**
 * Trova l'utente corrispondente alle credenziali.
 * Restituisce null se non esiste o se l'account è disattivato.
 */
export function authenticateUser(users, username, password) {
  const normalized = normalizeUsername(username);

  const user = users.find(
    (candidate) => normalizeUsername(candidate.username) === normalized,
  );

  if (!user) return null;
  if (user.password !== password) return null;
  if (user.active === false) return null;

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}
