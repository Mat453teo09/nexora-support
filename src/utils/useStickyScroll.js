import { useEffect } from "react";

import { scrollToBottom } from "./scroll";

/**
 * Quanto siamo vicini al fondo perché la chat si consideri "incollata"
 * agli ultimi messaggi.
 */
const NEAR_BOTTOM_PX = 120;

/**
 * Mantiene la chat incollata al fondo mentre arrivano messaggi e immagini.
 *
 * Lo scorrimento avviene quando cambiano i messaggi e, tramite un
 * ResizeObserver sulle immagini, quando gli allegati finiscono di caricarsi
 * (il loro spazio nel layout arriva dopo il render: senza questo la chat
 * resta "mezzo scrollato" e sembra non funzionare). ResizeObserver scatta
 * dopo il layout, quindi con le dimensioni finali, ed è supportato da
 * tutti i browser recenti (Safari 13.1+).
 *
 * Se l'utente è risalito per leggere la cronologia non viene riportato
 * giù a forza: basta tornare vicino al fondo per "riancorare" la vista.
 *
 * `dependencyKey` deve essere un valore primitivo (stringa/numero) che
 * cambia quando cambiano i messaggi: così l'effetto non riparte a ogni
 * render, per esempio mentre si scrive nella casella di testo.
 */
export function useStickyScroll(containerRef, dependencyKey) {
  useEffect(() => {
    const container = containerRef.current;

    if (!container) return undefined;

    let pinnedToBottom = true;

    const isNearBottom = () =>
      container.scrollHeight - container.scrollTop - container.clientHeight <
      NEAR_BOTTOM_PX;

    scrollToBottom(container);

    const frame = requestAnimationFrame(() => scrollToBottom(container));

    const handleScroll = () => {
      pinnedToBottom = isNearBottom();
    };

    const handleResize = () => {
      if (pinnedToBottom) {
        scrollToBottom(container);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    const observer = new ResizeObserver(handleResize);

    Array.from(container.querySelectorAll("img")).forEach((image) => {
      observer.observe(image);
    });

    return () => {
      cancelAnimationFrame(frame);

      container.removeEventListener("scroll", handleScroll);

      observer.disconnect();
    };
  }, [containerRef, dependencyKey]);
}
