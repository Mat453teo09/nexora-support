import { useState } from "react";
import { KeyRound, Shield, ShieldCheck } from "lucide-react";

import { useStore } from "../store/useStore";
import { OWNER_DISPLAY_NAME } from "../data/owner";

/**
 * Profilo dell'owner: unico punto in cui può cambiare la propria password.
 * Il nome visualizzato dell'owner è fisso per progetto ("Sofy_2012").
 */
function ProfilePage() {
  const { session, users, updateStaffProfile } = useStore();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [feedback, setFeedback] = useState(null);

  const account = users.find((user) => user.id === session.id);

  function handleSubmit(event) {
    event.preventDefault();

    if (password.trim().length < 6) {
      setFeedback({
        type: "error",
        text: "La password deve avere almeno 6 caratteri.",
      });

      return;
    }

    if (password !== confirm) {
      setFeedback({ type: "error", text: "Le due password non coincidono." });

      return;
    }

    updateStaffProfile(session.id, { password: password.trim() });

    setPassword("");
    setConfirm("");
    setFeedback({ type: "success", text: "Password aggiornata correttamente." });
  }

  return (
    <main className="management-page">
      <div className="page-header">
        <div>
          <h2>Il mio profilo</h2>

          <p>Gestisci il tuo account OWNER</p>
        </div>
      </div>

      <div className="owner-banner">
        <div className="owner-icon">
          <Shield size={25} />
        </div>

        <div>
          <strong>{OWNER_DISPLAY_NAME}</strong>

          <span>OWNER • Accesso completo</span>
        </div>
      </div>

      <div className="settings-card profile-card">
        <div className="settings-icon">
          <ShieldCheck size={22} />
        </div>

        <div>
          <h3>Account</h3>

          <p>Username usato per l'accesso al pannello</p>

          <strong>{account?.username ?? session.username}</strong>
        </div>
      </div>

      <form className="operator-form" onSubmit={handleSubmit}>
        <h3>
          <KeyRound size={16} /> Cambia password
        </h3>

        <div className="form-grid">
          <label>
            Nuova password (min. 6 caratteri)
            <input
              type="password"
              placeholder="Nuova password"
              value={password}
              autoComplete="new-password"
              onChange={(event) => {
                setPassword(event.target.value);
                setFeedback(null);
              }}
            />
          </label>

          <label>
            Conferma nuova password
            <input
              type="password"
              placeholder="Ripeti la nuova password"
              value={confirm}
              autoComplete="new-password"
              onChange={(event) => {
                setConfirm(event.target.value);
                setFeedback(null);
              }}
            />
          </label>
        </div>

        {feedback && (
          <div className={feedback.type === "error" ? "login-error" : "form-success"}>
            {feedback.text}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="primary-button">
            <KeyRound size={16} />
            Aggiorna password
          </button>
        </div>
      </form>
    </main>
  );
}

export default ProfilePage;
