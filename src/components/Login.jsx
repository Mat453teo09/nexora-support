import { useState } from "react";
import { ArrowLeft, Headset, Lock, Shield, User } from "lucide-react";

import { useStore } from "../store/useStore";

function Login({ onLogin, onBack, clientMode = false }) {
  const {
    registerCustomer,
    startClientSession,
    createConversationForCustomer,
  } = useStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  function handleStaffLogin(event) {
    event.preventDefault();

    // Rilegiamo gli utenti dallo storage: così usano subito nome/password
    // modificati dall'owner in un'altra scheda.
    const storedUsers = JSON.parse(
      window.localStorage.getItem("nexora_support_users") || "[]",
    );

    const candidate = storedUsers.find(
      (item) =>
        String(item.username ?? "").trim().toLowerCase() ===
        username.trim().toLowerCase(),
    );

    const validPassword = candidate && candidate.password === password;
    const isActive = candidate && candidate.active !== false;

    if (!candidate || !validPassword || !isActive) {
      setError("Username o password non corretti, oppure account disattivato.");

      return;
    }

    onLogin({
      id: candidate.id,
      username: candidate.username,
      displayName: candidate.displayName,
      role: candidate.role,
      online: true,
    });
  }

  function handleClientLogin(event) {
    event.preventDefault();

    const displayName = name.trim();
    const phoneNumber = phone.trim();

    if (!displayName || !phoneNumber) {
      setError("Inserisci nome e numero per accedere alla chat.");

      return;
    }

    if (phoneNumber.replace(/\D/g, "").length < 8) {
      setError("Il numero di telefono non è valido.");

      return;
    }

    const customer = registerCustomer({
      id: `customer-${phoneNumber.replace(/[^0-9]/g, "")}`,
      name: displayName,
      phone: phoneNumber,
    });

    createConversationForCustomer(customer);
    startClientSession(customer);
  }

  return (
    <div className="login-page">
      {onBack && (
        <button className="login-back" onClick={onBack}>
          <ArrowLeft size={15} />
          Torna alla home
        </button>
      )}

      <div className="login-card">
        <div className="login-logo">N</div>

        <h1>NEXORA</h1>

        <p className="login-subtitle">
          {clientMode ? "SUPPORTO CLIENTI" : "SUPPORT PANEL"}
        </p>

        {clientMode ? (
          <form onSubmit={handleClientLogin}>
            <label>Il tuo nome</label>

            <div className="login-input">
              <User size={18} />

              <input
                type="text"
                placeholder="Es. Luca"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
              />
            </div>

            <label>Il tuo numero</label>

            <div className="login-input">
              <Headset size={18} />

              <input
                type="tel"
                placeholder="Es. +39 333 123 4567"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError("");
                }}
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button className="login-button" type="submit">
              <Headset size={18} />
              Apri la chat
            </button>
          </form>
        ) : (
          <form onSubmit={handleStaffLogin}>
            <label>Username</label>

            <div className="login-input">
              <User size={18} />

              <input
                type="text"
                placeholder="Inserisci username"
                value={username}
                autoComplete="username"
                onChange={(event) => {
                  setUsername(event.target.value);
                  setError("");
                }}
              />
            </div>

            <label>Password</label>

            <div className="login-input">
              <Lock size={18} />

              <input
                type="password"
                placeholder="Inserisci password"
                value={password}
                autoComplete="current-password"
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button className="login-button" type="submit">
              <Shield size={18} />
              Accedi
            </button>
          </form>
        )}

        {clientMode ? (
          <div className="login-footer">
            Sei uno staff?{" "}
            <button
              type="button"
              className="login-switch"
              onClick={() => onLogin(null)}
            >
              Accedi come staff
            </button>
            <br />
            NEXORA Support — assistenza clienti
          </div>
        ) : (
          <div className="login-footer">
            Sei un cliente?{" "}
            <button
              type="button"
              className="login-switch"
              onClick={() => onLogin("client")}
            >
              Apri la chat di supporto
            </button>
            <br />
            NEXORA Support — sistema di assistenza
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
