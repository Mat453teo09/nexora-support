import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  MessageSquare,
  UserCheck,
  Send,
  UserCircle,
} from "lucide-react";

import {
  AttachmentPicker,
  AttachmentView,
} from "./Attachment";
import { useStore } from "../store/useStore";
import { getDisplayName, getInitial } from "../utils/display";
import { formatRelativeDay, formatTime } from "../utils/format";
import { scrollToBottom } from "../utils/scroll";

function Chat({ conversation, customer, onHighlightProfile }) {
  const { session, users, assignConversation, toggleResolved, sendStaffMessage } =
    useStore();

  const [draft, setDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState(null);

  const messagesRef = useRef(null);

  useEffect(() => {
    const container = messagesRef.current;

    scrollToBottom(container);

    const frame = requestAnimationFrame(() => scrollToBottom(container));

    // Le immagini degli allegati arrivano dopo il render: quando caricano,
    // riportiamo la vista in fondo (solo se l'utente è già vicino ai
    // messaggi nuovi, così può risalire la cronologia in tranquillità).
    const images = container ? Array.from(container.querySelectorAll("img")) : [];

    const handleImageLoad = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;

      if (distanceFromBottom < 120) {
        scrollToBottom(container);
      }
    };

    images.forEach((image) => {
      if (!image.complete) {
        image.addEventListener("load", handleImageLoad, { once: true });
      }
    });

    return () => {
      cancelAnimationFrame(frame);

      images.forEach((image) =>
        image.removeEventListener("load", handleImageLoad),
      );
    };
  }, [conversation?.id, conversation?.messages.length]);

  if (!conversation || !customer) {
    return (
      <main className="chat chat-empty">
        <div className="empty-chat">
          <MessageSquare size={40} />
          <h3>Nessuna conversazione selezionata</h3>
          <p>Seleziona una conversazione dalla lista per iniziare.</p>
        </div>
      </main>
    );
  }

  const operatorDisplayName = getDisplayName(session);

  const assignedUser = users.find(
    (user) => user.id === conversation.assignedTo,
  );

  const assignedName = assignedUser
    ? getDisplayName(assignedUser)
    : "Non assegnata";

  const lastMessage =
    conversation.messages.length > 0
      ? conversation.messages[conversation.messages.length - 1]
      : null;

  function handleSend() {
    const text = draft.trim();

    if (!text && !pendingAttachment) return;

    sendStaffMessage(conversation.id, {
      authorId: session.id,
      authorName: operatorDisplayName,
      text,
      attachment: pendingAttachment ?? undefined,
    });

    setDraft("");
    setPendingAttachment(null);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleAssignToMe() {
    assignConversation(conversation.id, session.id);
  }

  const isAssignedToMe = conversation.assignedTo === session.id;

  return (
    <main className="chat">
      <header className="chat-header">
        <div className="chat-user">
          <div className="avatar">{getInitial(customer.name)}</div>

          <div>
            <strong>{customer.name}</strong>

            <span className="online">● Online</span>
          </div>
        </div>

        <div className="chat-actions">
          <button
            className={`action-button ${isAssignedToMe ? "mine" : ""}`}
            title={
              isAssignedToMe
                ? "Conversazione assegnata a te"
                : "Assegna a me"
            }
            onClick={handleAssignToMe}
          >
            <UserCheck size={20} />
          </button>

          <button
            className="action-button"
            title="Segna come risolta"
            onClick={() => toggleResolved(conversation.id)}
          >
            <CheckCircle2 size={20} />
          </button>

          <button
            className="action-button"
            title="Mostra profilo cliente"
            onClick={onHighlightProfile}
          >
            <UserCircle size={20} />
          </button>
        </div>
      </header>

      <div className="chat-info">
        <span>Assegnata a:</span>

        <strong>{assignedName}</strong>

        <span className="separator">•</span>

        <span>
          {lastMessage
            ? `${formatRelativeDay(lastMessage.time)}, ${formatTime(lastMessage.time)}`
            : "Nessun messaggio"}
        </span>
      </div>

      <div className="messages" ref={messagesRef}>
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`message ${
              message.authorType === "customer" ? "customer" : "operator"
            }`}
          >
            {message.authorType === "customer" && (
              <div className="message-avatar">
                {getInitial(message.authorName)}
              </div>
            )}

            <div>
              <div className="message-name">{message.authorName}</div>

              <div className="bubble">
                {message.attachment && (
                  <AttachmentView attachment={message.attachment} />
                )}
                {message.text}
              </div>

              <span className="message-time">{formatTime(message.time)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="message-box">
        {pendingAttachment && (
          <div className="pending-attachment">
            <span>{pendingAttachment.name}</span>

            <button
              type="button"
              title="Rimuovi allegato"
              onClick={() => setPendingAttachment(null)}
            >
              ×
            </button>
          </div>
        )}

        <AttachmentPicker
          conversationId={conversation.id}
          onUploaded={setPendingAttachment}
        />

        <input
          placeholder="Scrivi un messaggio..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          className="send"
          onClick={handleSend}
          title="Invia"
          disabled={!draft.trim() && !pendingAttachment}
        >
          <Send size={18} />
        </button>
      </div>
    </main>
  );
}

export default Chat;
