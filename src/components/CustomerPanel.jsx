import { useState } from "react";
import { CheckCircle2, Lock, RotateCcw } from "lucide-react";

import { useStore } from "../store/useStore";
import {
  getDisplayName,
  getInitial,
} from "../utils/display";
import { STATUS_LABELS } from "../utils/conversations";
import { formatRelativeDay, formatTime, getLastMessage } from "../utils/format";

function CustomerPanel({ conversation, customer, highlight = false }) {
  const { users, session, assignConversation, toggleResolved, setConversationNotes } =
    useStore();

  const [notesDraft, setNotesDraft] = useState(null);

  const isOwner = session.role === "OWNER";

  if (!conversation || !customer) {
    return (
      <aside className="customer-panel customer-panel-empty">
        <div className="customer-title">
          <h3>Cliente</h3>
        </div>

        <p className="empty-note">
          Seleziona una conversazione per vedere i dettagli del cliente.
        </p>
      </aside>
    );
  }

  const operators = users.filter(
    (user) => user.role === "OPERATOR" && user.active !== false,
  );

  const isResolved = conversation.status === "resolved";

  const assignedUser = users.find(
    (user) => user.id === conversation.assignedTo,
  );

  const assignedUserDisplayName = assignedUser
    ? getDisplayName(assignedUser)
    : "Non assegnata";

  const lastMessage = getLastMessage(conversation);

  const notes =
    notesDraft !== null ? notesDraft : conversation.notes || "";

  function handleNotesChange(event) {
    setNotesDraft(event.target.value);
  }

  function handleNotesBlur() {
    if (notesDraft === null) return;

    setConversationNotes(conversation.id, notesDraft);
    setNotesDraft(null);
  }

  return (
    <aside className={`customer-panel ${highlight ? "highlighted" : ""}`}>
      <div className="customer-title">
        <h3>Cliente</h3>
      </div>

      <div className="customer-profile">
        <div className="large-avatar">{getInitial(customer.name)}</div>

        <h3>{customer.name}</h3>

        <span>Cliente</span>
      </div>

      <div className="customer-section">
        <h4>Informazioni</h4>

        <div className="info-row">
          <span>Numero</span>

          <strong>{customer.phone}</strong>
        </div>

        <div className="info-row">
          <span>Operatore assegnato</span>

          {isOwner ? (
            <select
              className="assign-select"
              value={conversation.assignedTo ?? ""}
              onChange={(event) =>
                assignConversation(conversation.id, event.target.value)
              }
            >
              <option value="">Non assegnata</option>

              {operators.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {getDisplayName(operator)}
                  {operator.online ? " • online" : " • offline"}
                </option>
              ))}
            </select>
          ) : (
            <strong className="assigned-static">
              <Lock size={11} style={{ marginRight: 4 }} />
              {assignedUserDisplayName}
            </strong>
          )}
        </div>

        <div className="info-row">
          <span>Stato</span>

          <strong className={`status ${isResolved ? "status-resolved" : ""}`}>
            {STATUS_LABELS[conversation.status]}
          </strong>
        </div>

        {lastMessage && (
          <div className="info-row">
            <span>Ultimo messaggio</span>

            <strong>
              {formatRelativeDay(lastMessage.time)}, {formatTime(lastMessage.time)}
            </strong>
          </div>
        )}

        <button
          className={`resolve-button ${isResolved ? "reopen" : ""}`}
          onClick={() => toggleResolved(conversation.id)}
        >
          {isResolved ? (
            <>
              <RotateCcw size={15} />
              Riapri conversazione
            </>
          ) : (
            <>
              <CheckCircle2 size={15} />
              Segna come risolta
            </>
          )}
        </button>
      </div>

      <div className="customer-section">
        <h4>Note interne</h4>

        <textarea
          className="note-editor"
          placeholder="Aggiungi una nota interna..."
          value={notes}
          onChange={handleNotesChange}
          onBlur={handleNotesBlur}
          rows={4}
        />
      </div>
    </aside>
  );
}

export default CustomerPanel;
