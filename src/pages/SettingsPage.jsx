import { useState } from "react";
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Loader2,
  MessageSquare,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";

import { useStore } from "../store/useStore";
import { OWNER_DISPLAY_NAME } from "../data/owner";
import { storageKeys } from "../data/storage";

function formatSyncTime(timestamp) {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const STATUS_LABELS = {
  idle: { text: "Non collegato", icon: CloudOff, className: "offline" },
  connecting: { text: "Connessione…", icon: Loader2, className: "connecting" },
  online: { text: "Sincronizzato", icon: CheckCircle2, className: "online" },
  error: { text: "Errore di connessione", icon: CloudOff, className: "error" },
};

function SettingsPage() {
  const {
    users,
    conversations,
    remoteConfig,
    remoteStatus,
    remoteError,
    lastSyncAt,
    connect,
    disconnectRemote,
  } = useStore();

  const [url, setUrl] = useState(remoteConfig?.url ?? "");
  const [anonKey, setAnonKey] = useState(remoteConfig?.anonKey ?? "");
  const [formError, setFormError] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const operatorCount = users.filter((user) => user.role === "OPERATOR").length;

  const activeCount = users.filter(
    (user) => user.role === "OPERATOR" && user.active !== false,
  ).length;

  const statusInfo = STATUS_LABELS[remoteStatus] ?? STATUS_LABELS.idle;
  const StatusIcon = statusInfo.icon;

  async function handleConnect() {
    setFormError(null);

    if (!url.trim() || !anonKey.trim()) {
      setFormError("Inserisci sia l'URL del progetto che la chiave anon.");

      return;
    }

    setConnecting(true);

    const result = await connect({ url, anonKey });

    setConnecting(false);

    if (!result.ok) {
      setFormError(
        `Connessione fallita: ${result.error}. Controlla URL, chiave e di aver eseguito supabase-setup.sql.`,
      );
    }
  }

  function handleDisconnect() {
    setUrl("");
    setAnonKey("");
    setFormError(null);
    disconnectRemote();
  }

  function handleResetData() {
    const confirmed = window.confirm(
      "Questo cancellerà tutti i dati salvati (operatori, conversazioni, sessione) e ripristinerà i dati iniziali. Continuare?",
    );

    if (!confirmed) return;

    Object.values(storageKeys).forEach((key) => {
      window.localStorage.removeItem(key);
    });

    window.location.reload();
  }

  return (
    <main className="management-page">
      <div className="page-header">
        <div>
          <h2>Impostazioni</h2>

          <p>Configurazione NEXORA Support</p>
        </div>
      </div>

      <div className="settings-card remote-card">
        <div className="settings-icon">
          <Cloud size={22} />
        </div>

        <div className="remote-body">
          <h3>Sync multi-dispositivo (cloud)</h3>

          <p>
            Sul sito pubblicato la sincronizzazione tra tutti i dispositivi e
            browser è attiva di serie (chat, operatori e presenza in tempo
            reale). In sviluppo puoi collegare un progetto Supabase diverso:
            senza cloud i dati restano in questo browser.
          </p>

          <div className={`remote-status ${statusInfo.className}`}>
            <StatusIcon size={16} className={remoteStatus === "connecting" ? "spin" : ""} />
            {statusInfo.text}
            {remoteStatus === "online" && lastSyncAt
              ? ` • ultimo sync ${formatSyncTime(lastSyncAt)}`
              : ""}
          </div>

          {remoteError && (
            <p className="remote-error">{remoteError}</p>
          )}

          {remoteStatus === "idle" || remoteStatus === "error" ? (
            <div className="remote-form">
              <input
                type="text"
                placeholder="https://xxxx.supabase.co"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />

              <input
                type="password"
                placeholder="Chiave anon (anon public key)"
                value={anonKey}
                onChange={(event) => setAnonKey(event.target.value)}
              />

              <button
                className="ghost-button"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? "Collegamento…" : "Collega cloud"}
              </button>
            </div>
          ) : (
            <button className="ghost-button danger" onClick={handleDisconnect}>
              Scollega cloud (torna solo locale)
            </button>
          )}

          {formError && <p className="remote-error">{formError}</p>}

          <details className="remote-help">
            <summary>Come creare il progetto Supabase (2 minuti)</summary>

            <ol>
              <li>
                Crea un account gratuito su{" "}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  supabase.com
                </a>{" "}
                e premi <strong>New project</strong>.
              </li>

              <li>
                Apri <strong>SQL Editor</strong>, incolla il contenuto del file{" "}
                <code>supabase-setup.sql</code> (nella cartella del progetto) e
                premi <strong>Run</strong>.
              </li>

              <li>
                In <strong>Project Settings → API</strong> copia{" "}
                <strong>Project URL</strong> e <strong>anon public key</strong>{" "}
                e incollali qui sopra.
              </li>

              <li>
                Premi <strong>Collega cloud</strong>: da quel momento ogni
                dispositivo (PC, telefono, altro browser) vede le stesse chat
                in tempo reale.
              </li>
            </ol>
          </details>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-icon">
          <Shield size={22} />
        </div>

        <div>
          <h3>Account Owner</h3>

          <p>Account amministratore principale</p>

          <strong>{OWNER_DISPLAY_NAME}</strong>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-icon">
          <Users size={22} />
        </div>

        <div>
          <h3>Operatori</h3>

          <p>
            {operatorCount} operatori totali • {activeCount} attivi
          </p>

          <strong>{operatorCount} operatori</strong>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-icon">
          <MessageSquare size={22} />
        </div>

        <div>
          <h3>Conversazioni</h3>

          <p>Conversazioni presenti nel sistema</p>

          <strong>{conversations.length} conversazioni</strong>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-icon">
          <MessageSquare size={22} />
        </div>

        <div>
          <h3>WhatsApp</h3>

          <p>Collegamento WhatsApp (in arrivo)</p>

          <strong className="not-connected">Non collegato</strong>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-icon">
          <RefreshCw size={22} />
        </div>

        <div>
          <h3>Dati locali</h3>

          <p>
            Reset completo: operatori torna ai 14 predefiniti, conversazioni e
            clienti vengono svuotati (solo su questo browser; se il cloud è
            collegato, il push successivo ripristinerà questi dati ovunque).
          </p>

          <button className="ghost-button danger" onClick={handleResetData}>
            Ripristina dati iniziali
          </button>
        </div>
      </div>
    </main>
  );
}

export default SettingsPage;
