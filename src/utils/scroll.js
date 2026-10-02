/**
 * Scorre un contenitore scorrevole fino in fondo (ultimi messaggi).
 *
 * Usato da Chat e ClientApp: così la chat parte sempre dai messaggi
 * più recenti e li segue quando ne arrivano di nuovi, su ogni browser.
 */
export function scrollToBottom(element) {
  if (!element) return;

  element.scrollTop = element.scrollHeight;
}
