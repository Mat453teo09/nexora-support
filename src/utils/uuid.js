/**
 * Identificativo univoco compatibile con tutti i browser.
 *
 * crypto.randomUUID esiste solo da Safari 15.4 (e solo in contesti
 * sicuri): su Safari più vecchi l'app smetteva di funzionare in modo
 * silenzioso. Questa funzione lo usa quando disponibile e altrimenti
 * genera un UUID v4 con crypto.getRandomValues (supportato ovunque).
 */
export function uuid() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    return ("" + 1e7 + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (char) =>
      (
        Number(char) ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(char) / 4)))
      ).toString(16),
    );
  }

  // Ultima riserva per browser molto vecchi, senza Web Crypto.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.trunc(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });
}
