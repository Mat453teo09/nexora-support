/**
 * Selettore dell'etichetta da mostrare per un utente del sistema.
 * Regola assoluta: l'OWNER si chiama SEMPRE "Sofy_2012".
 */

import { OWNER_DISPLAY_NAME } from "../data/owner";

export function getDisplayName(user) {
  if (!user) return "";

  if (user.role === "OWNER") return OWNER_DISPLAY_NAME;

  return user.displayName || user.username;
}

/** Iniziale per gli avatar. */
export function getInitial(name) {
  const first = String(name ?? "").trim().charAt(0);

  return first ? first.toUpperCase() : "?";
}
