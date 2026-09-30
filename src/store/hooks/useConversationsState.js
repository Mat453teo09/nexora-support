import { useEffect, useRef, useState } from "react";

import { dataStore } from "../../data/storage";

/**
 * Stato conversazioni con sincronizzazione in tempo reale tra tab.
 * Si scrive solo quando i dati cambiano davvero e si accetta un evento
 * di storage solo se diverso dall'ultimo valore salvato: così le schede
 * si aggiornano a vicenda senza loop di eco.
 */
export function useConversationsState() {
  const [conversations, setConversations] = useState(() =>
    dataStore.loadConversations([]),
  );

  const lastSavedRef = useRef(JSON.stringify(conversations));

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== dataStore.keys.conversations) return;

      if (!event.newValue || event.newValue === lastSavedRef.current) return;

      try {
        const incoming = JSON.parse(event.newValue);

        if (!Array.isArray(incoming)) return;

        lastSavedRef.current = event.newValue;
        setConversations(incoming);
      } catch {
        // Dato corrotto: ignoriamo.
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const serialized = JSON.stringify(conversations);

    if (serialized === lastSavedRef.current) return;

    lastSavedRef.current = serialized;
    dataStore.saveConversations(conversations);
  }, [conversations]);

  return [conversations, setConversations];
}
