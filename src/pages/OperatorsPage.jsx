import { useState } from "react";
import {
  Circle,
  Pencil,
  Shield,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { useStore } from "../store/useStore";
import { getInitial } from "../utils/display";
import { formatDate } from "../utils/format";
import { OWNER_DISPLAY_NAME } from "../data/owner";

function OperatorsPage() {
  const {
    users,
    createOperator,
    toggleOperatorActive,
    deleteOperator,
    setOperatorOnline,
    updateStaffProfile,
  } = useStore();

  const [showForm, setShowForm] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState("");
  const [successFeedback, setSuccessFeedback] = useState("");

  const operators = users.filter((user) => user.role === "OPERATOR");

  function handleSubmit(event) {
    event.preventDefault();

    if (!displayName.trim() || !username.trim() || !password.trim()) {
      setFormError("Compila tutti i campi.");

      return;
    }

    if (password.trim().length < 6) {
      setFormError("La password deve avere almeno 6 caratteri.");

      return;
    }

    createOperator({ displayName, username, password: password.trim() });

    setSuccessFeedback(`Operatore "${displayName.trim()}" creato. Comunica tu la password.`);

    setDisplayName("");
    setUsername("");
    setPassword("");
    setFormError("");
    setShowForm(false);
  }

  function handleDelete(operatorId) {
    deleteOperator(operatorId);
    setConfirmDeleteId(null);
  }

  function startEditing(operator) {
    setEditingId(operator.id);
    setEditName(operator.displayName);
    setEditPassword("");
    setEditError("");
  }

  function handleSaveEdit(event) {
    event.preventDefault();

    if (!editName.trim()) {
      setEditError("Il nome non può essere vuoto.");

      return;
    }

    if (editPassword.trim() !== "" && editPassword.trim().length < 6) {
      setEditError("La password deve avere almeno 6 caratteri.");

      return;
    }

    updateStaffProfile(editingId, {
      displayName: editName,
      password: editPassword.trim() || undefined,
    });

    setEditingId(null);
  }

  return (
    <main className="management-page">
      <div className="page-header">
        <div>
          <h2>Operatori</h2>

          <p>
            Gestisci i {operators.length} operatori NEXORA
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setShowForm((previous) => !previous)}
        >
          <UserPlus size={18} />
          Nuovo operatore
        </button>
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

      {successFeedback && <div className="form-success">{successFeedback}</div>}

      {showForm && (
        <form className="operator-form" onSubmit={handleSubmit}>
          <h3>Nuovo operatore</h3>

          <div className="form-grid">
            <label>
              Nome visualizzato
              <input
                placeholder="Es. Mario Rossi"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setFormError("");
                }}
              />
            </label>

            <label>
              Username
              <input
                placeholder="Es. mariorossi"
                value={username}
                autoComplete="off"
                onChange={(event) => {
                  setUsername(event.target.value);
                  setFormError("");
                }}
              />
            </label>

            <label>
              Password (min. 6 caratteri)
              <input
                type="password"
                placeholder="Password operatore"
                value={password}
                autoComplete="new-password"
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFormError("");
                }}
              />
            </label>
          </div>

          {formError && <div className="login-error">{formError}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setShowForm(false);
                setFormError("");
              }}
            >
              Annulla
            </button>

            <button type="submit" className="primary-button">
              <UserPlus size={16} />
              Crea operatore
            </button>
          </div>
        </form>
      )}

      <div className="operators-grid">
        {operators.map((operator) => {
          const isActive = operator.active !== false;

          return (
            <div
              className={`operator-card ${isActive ? "" : "disabled"}`}
              key={operator.id}
            >
              <div className="operator-avatar">
                {getInitial(operator.displayName)}
              </div>

              {editingId === operator.id ? (
                <form className="operator-edit" onSubmit={handleSaveEdit}>
                  <label>
                    Nome visualizzato
                    <input
                      value={editName}
                      onChange={(event) => {
                        setEditName(event.target.value);
                        setEditError("");
                      }}
                    />
                  </label>

                  <label>
                    Nuova password (vuoto = invariata)
                    <input
                      type="password"
                      placeholder="Lascia vuoto per non cambiare"
                      value={editPassword}
                      autoComplete="new-password"
                      onChange={(event) => {
                        setEditPassword(event.target.value);
                        setEditError("");
                      }}
                    />
                  </label>

                  {editError && <div className="login-error">{editError}</div>}

                  <div className="operator-edit-actions">
                    <button type="button" className="ghost-button" onClick={() => setEditingId(null)}>
                      <X size={14} />
                      Annulla
                    </button>

                    <button type="submit" className="primary-button small">
                      Salva
                    </button>
                  </div>
                </form>
              ) : (
                <div className="operator-info">
                  <strong>{operator.displayName}</strong>

                  <span>
                    @{operator.username} • OPERATOR
                  </span>

                  <div className="operator-credentials">
                    Password: nascosta (usa la matita per cambiarla)
                  </div>

                  <div className="operator-status">
                    <Circle
                      size={8}
                      fill={operator.online ? "#4ade80" : "none"}
                      color={operator.online ? "#4ade80" : "#4a5160"}
                    />

                    {operator.online ? "Online" : "Offline"}

                    <span className="operator-since">
                      dal {formatDate(operator.createdAt)}
                    </span>
                  </div>
                </div>
              )}

              <div className="operator-actions">
                {editingId !== operator.id && (
                  <>
                    <button
                      className="icon-button"
                      title="Modifica nome e password"
                      onClick={() => startEditing(operator)}
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      className={`icon-button presence ${operator.online ? "success" : "offline"}`}
                      title={
                        operator.online
                          ? "Segna come offline"
                          : "Segna come online"
                      }
                      onClick={() => setOperatorOnline(operator.id, !operator.online)}
                    >
                      <Circle
                        size={9}
                        fill={operator.online ? "#4ade80" : "none"}
                        color={operator.online ? "#4ade80" : "#4a5160"}
                      />
                    </button>
                  </>
                )}

                <button
                  className={`icon-button ${isActive ? "danger" : "success"}`}
                  title={isActive ? "Disattiva operatore" : "Attiva operatore"}
                  onClick={() => toggleOperatorActive(operator.id)}
                >
                  {isActive ? (
                    <ToggleRight size={19} />
                  ) : (
                    <ToggleLeft size={19} />
                  )}
                </button>

                {confirmDeleteId === operator.id ? (
                  <button
                    className="icon-button danger confirm"
                    title="Conferma eliminazione"
                    onClick={() => handleDelete(operator.id)}
                  >
                    <Trash2 size={17} />
                    Confermi?
                  </button>
                ) : (
                  <button
                    className="icon-button danger"
                    title="Elimina operatore"
                    onClick={() => setConfirmDeleteId(operator.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {operators.length === 0 && (
        <div className="empty-list">
          Nessun operatore presente. Creane uno con "Nuovo operatore".
        </div>
      )}
    </main>
  );
}

export default OperatorsPage;
