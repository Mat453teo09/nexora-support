/**
 * Normalizza un numero di telefono per il confronto:
 * rimuove spazi, trattini, parentesi e punti.
 */
export function normalizePhone(phone) {
  return String(phone ?? "")
    .replace(/[\s()\-.]/g, "")
    .toLowerCase();
}
