/**
 * Hash delle password (SHA-256 con salt applicativo).
 *
 * Le password non vengono mai salvate in chiaro: nel sistema esiste
 * solo l'hash. Al login si confronta l'hash della password inserita.
 */

const SALT = "nexora:v1";

export async function hashPassword(password) {
  const data = new TextEncoder().encode(`${SALT}:${password}`);

  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  const computed = await hashPassword(password);

  return computed === storedHash;
}
