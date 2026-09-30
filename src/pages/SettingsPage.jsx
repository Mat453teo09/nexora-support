import { MessageSquare, Shield, Users, RefreshCw } from "lucide-react";

import { useStore } from "../store/useStore";
import { OWNER_DISPLAY_NAME } from "../data/owner";
import { storageKeys } from "../data/storage";

function SettingsPage() {
  const { users, conversations } = useStore();

  const operatorCount = users.filter((user) => user.role === "OPERATOR").length;

  const activeCount = users.filter(
    (user) => user.role === "OPERATOR" && user.active !== false,
  ).length;

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
            I dati sono salvati in locale (localStorage). Potranno essere
            spostati su un database in futuro senza modifiche alla UI.
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
