import { useCallback, useEffect, useRef, useState } from "react";

import {
  PUSH_DEBOUNCE_MS,
  currentPollIntervalMs,
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
  clearedAt,
  bot,
  session,
  applyRemote,
  applyRemotePresence,
}) {
  const [config, setConfig] = useState(loadRemoteConfig);
  const [connection, setConnection] = useState("idle");
  const [lastError, setLastError] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  /* Il push resta bloccato finché non è arrivato il primo stato remoto:
     pubblicare lo stato locale prima del primo pull sovrascriverebbe il
     cloud con dati vecchi (es. chat già cancellate da un altro dispositivo). */
  const [syncReady, setSyncReady] = useState(false);

  /* Lo stato visibile è "idle" quando il cloud non è configurato. */
  const configured = isRemoteConfigured(config);
  const status = configured ? connection : "idle";

  /* Riferimenti sempre aggiornati all'ultimo stato (sincronizzati in effect). */
  const localRef = useRef({ users, customers, conversations, clearedAt, bot });
  const sessionRef = useRef(session);

  useEffect(() => {
    localRef.current = { users, customers, conversations, clearedAt, bot };
    sessionRef.current = session;
  });

  const lastRemoteJsonRef = useRef("");
  const lastPushedRef = useRef("");

  /* Alzato durante un push immediato (es. cancellazione chat): il polling
     non applica stati remoti finché la scrittura non è conclusa, così un
     vecchio stato in arrivo non riporta in vita dati appena cancellati. */
  const holdingRef = useRef(false);

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

  /**
   * Scrittura immediata dello stato sul cloud, senza attendere il debounce.
   * Usata dalla cancellazione chat: pubblica subito lo stato vuoto e blocca
   * il polling finché non è arrivato, evitando che i vecchi dati rimbalzino.
   */
  const replaceRemote = useCallback(
    async (state) => {
      if (!isRemoteConfigured(config)) return { ok: true, skipped: true };

      holdingRef.current = true;

      try {
        await pushRemoteState(config, state);

        const json = JSON.stringify(state);

        lastPushedRef.current = json;
        lastRemoteJsonRef.current = json;

        return { ok: true };
      } catch (error) {
        setConnection("error");
        setLastError(String(error?.message ?? error));

        return { ok: false, error: String(error?.message ?? error) };
      } finally {
        holdingRef.current = false;
      }
    },
    [config],
  );

  /* Polling: scarica stato e presenza, pubblica l'heartbeat dello staff. */
  useEffect(() => {
    if (!isRemoteConfigured(config)) {
      return undefined;
    }

    let cancelled = false;

    async function run() {
      /* Un push immediato è in corso: non applicare il remoto adesso. */
      if (holdingRef.current) return;

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
        setSyncReady(true);
      } catch (error) {
        if (!cancelled) {
          setConnection("error");
          setLastError(String(error?.message ?? error));
        }
      }
    }

    run();

    /* Polling adattivo: ogni ciclo riprogramma l'intervallo in base alla
       visibilità (1,5s in primo piano, 10s in background). */
    let timerId = null;

    function schedule() {
      timerId = setTimeout(async () => {
        if (cancelled) return;

        await run();

        if (!cancelled) schedule();
      }, currentPollIntervalMs());
    }

    schedule();

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
      clearTimeout(timerId);
      document.removeEventListener("visibilitychange", onVisible);
    };    }, [config, applyRemote, applyRemotePresence]);

  /* Push debounced: ogni modifica locale raggiunge il cloud in fretta. */
  useEffect(() => {
    if (!isRemoteConfigured(config)) return;

    /* Il cloud non è ancora stato letto: niente push, altrimenti i dati
       locali (magari superati) sovrascriverebbero quelli remoti. */
    if (!syncReady) return;

    const serialized = JSON.stringify({
      users,
      customers,
      conversations,
      clearedAt,
      bot,
    });

    if (serialized === lastPushedRef.current) return;

    const timer = setTimeout(async () => {
      lastPushedRef.current = serialized;

      try {
        await pushRemoteState(config, {
          users,
          customers,
          conversations,
          clearedAt,
          bot,
        });
      } catch (error) {
        setConnection("error");
        setLastError(String(error?.message ?? error));
      }
    }, PUSH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [config, syncReady, users, customers, conversations, clearedAt, bot]);

  return {
    remoteConfig: config,
    remoteStatus: status,
    remoteError: lastError,
    lastSyncAt,
    connect,
    disconnect,
    replaceRemote,
  };
}
