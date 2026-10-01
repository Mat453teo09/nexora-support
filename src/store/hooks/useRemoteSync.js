import { useCallback, useEffect, useRef, useState } from "react";

import {
  POLL_INTERVAL_MS,
  fetchPresence,
  fetchRemoteState,
  isRemoteConfigured,
  loadRemoteConfig,
  mergeStates,
  pushPresence,
  pushRemoteState,
  saveRemoteConfig,
} from "../../data/remoteSync";

/**
 * Sincronizzazione multi-dispositivo via Supabase.
 *
 * - Al primo collegamento: se il cloud è vuoto carica lo stato locale,
 *   altrimenti unisce lo stato remoto a quello locale.
 * - Push: ogni modifica locale viene pubblicata (con piccolo ritardo
 *   di accumulo) sul cloud.
 * - Poll: ogni pochi secondi scarica lo stato remoto e lo fonde con
 *   quello locale: i messaggi si uniscono per id, nessuna perdita.
 * - Presenza: heartbeat periodico del personale collegato, con scadenza
 *   automatica (TTL): chi chiude il browser torna offline da solo.
 */
export function useRemoteSync({
  users,
  customers,
  conversations,
  session,
  applyRemote,
  applyRemotePresence,
}) {
  const [config, setConfig] = useState(loadRemoteConfig);
  const [connection, setConnection] = useState("idle");
  const [lastError, setLastError] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  /* Lo stato visibile è "idle" quando il cloud non è configurato. */
  const configured = isRemoteConfigured(config);
  const status = configured ? connection : "idle";

  /* Riferimenti sempre aggiornati all'ultimo stato (sincronizzati in effect). */
  const localRef = useRef({ users, customers, conversations });
  const sessionRef = useRef(session);

  useEffect(() => {
    localRef.current = { users, customers, conversations };
    sessionRef.current = session;
  });

  const lastRemoteJsonRef = useRef("");
  const lastPushedRef = useRef("");

  const connect = useCallback(
    async (nextConfig) => {
      saveRemoteConfig(nextConfig);
      const saved = loadRemoteConfig();

      setConfig(saved);
      setConnection("connecting");
      setLastError(null);

      try {
        const remote = await fetchRemoteState(saved);

        if (remote) {
          const merged = mergeStates(localRef.current, remote);

          lastRemoteJsonRef.current = JSON.stringify(remote);
          applyRemote(merged);
        } else {
          await pushRemoteState(saved, localRef.current);
        }

        lastPushedRef.current = JSON.stringify(localRef.current);
        setConnection("online");
        setLastSyncAt(Date.now());

        return { ok: true };
      } catch (error) {
        setConnection("error");
        setLastError(String(error?.message ?? error));

        return { ok: false, error: String(error?.message ?? error) };
      }
    },
    [applyRemote],
  );

  const disconnect = useCallback(() => {
    saveRemoteConfig({ url: "", anonKey: "" });
    setConfig(loadRemoteConfig());
    setConnection("idle");
    setLastError(null);
    lastRemoteJsonRef.current = "";
    lastPushedRef.current = "";
  }, []);

  /* Polling: scarica stato e presenza, pubblica l'heartbeat dello staff. */
  useEffect(() => {
    if (!isRemoteConfigured(config)) {
      return undefined;
    }

    let cancelled = false;

    async function run() {
      try {
        const [remote, presence] = await Promise.all([
          fetchRemoteState(config),
          fetchPresence(config),
        ]);

        if (cancelled) return;

        if (remote) {
          const json = JSON.stringify(remote);

          if (json !== lastRemoteJsonRef.current) {
            lastRemoteJsonRef.current = json;
            applyRemote(mergeStates(localRef.current, remote));
          }
        }

        /* Presenza: solo il pallino online/offline, senza toccare il resto.
           Usa un callback dedicato che legge lo stato più recente, così non
           sovrascrive conversazioni/clienti appena arrivati dal cloud. */
        if (presence && applyRemotePresence) {
          applyRemotePresence(presence);
        }

        /* Heartbeat del personale a ogni tick: nei browser le schede in
           background rallentano i timer (fino a 1 tick al minuto), quindi
           l'heartbeat deve viaggiare con il polling per non far sembrare
           offline chi ha solo la finestra in secondo piano. */
        const currentSession = sessionRef.current;

        if (currentSession?.id) {
          pushPresence(config, currentSession.id, true).catch(() => {});
        }

        setConnection("online");
        setLastError(null);
        setLastSyncAt(Date.now());
      } catch (error) {
        if (!cancelled) {
          setConnection("error");
          setLastError(String(error?.message ?? error));
        }
      }
    }

    run();

    const interval = setInterval(run, POLL_INTERVAL_MS);

    /* Al ritorno della scheda in primo piano scarica subito lo stato
       aggiornato (senza aspettare il prossimo tick del polling). */
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        run();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };    }, [config, applyRemote, applyRemotePresence]);

  /* Push debounced: ogni modifica locale raggiunge il cloud. */
  useEffect(() => {
    if (!isRemoteConfigured(config)) return;

    const serialized = JSON.stringify({ users, customers, conversations });

    if (serialized === lastPushedRef.current) return;

    const timer = setTimeout(async () => {
      lastPushedRef.current = serialized;

      try {
        await pushRemoteState(config, { users, customers, conversations });
      } catch (error) {
        setConnection("error");
        setLastError(String(error?.message ?? error));
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [config, users, customers, conversations]);

  return {
    remoteConfig: config,
    remoteStatus: status,
    remoteError: lastError,
    lastSyncAt,
    connect,
    disconnect,
  };
}
