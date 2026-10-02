import { useRef, useState } from "react";
import { Send } from "lucide-react";

import {
  AttachmentPicker,
  AttachmentView,
} from "../components/Attachment";
import { useStore } from "../store/useStore";
import { useStickyScroll } from "../utils/useStickyScroll";
import { formatTime } from "../utils/format";

/**
 * Lato cliente: chat di supporto stile WhatsApp con lo staff NEXORA.
 */
function ClientApp() {
  const {
    clientSession,
    conversations,
    users,
    sendCustomerMessage,
    logoutClient,
  } = useStore();

  const [draft, setDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState(null);

  const messagesContainerRef = useRef(null);

  const conversation = conversations.find(
    (item) => item.customerId === clientSession.id,
  );

  const assignedOperator = conversation?.assignedTo
    ? users.find((user) => user.id === conversation.assignedTo)
    : null;

  const messages = conversation?.messages ?? [];

  const isResolved = conversation?.status === "resolved";

  const lastStaffMessage = [...messages]
    .reverse()
    .find((message) => message.authorType === "operator");

  useStickyScroll(messagesContainerRef, messages.length);

  function handleSend() {
    const text = draft.trim();

    if (!text && !pendingAttachment) return;

    sendCustomerMessage(clientSession.id, {
      senderId: clientSession.id,
      senderName: clientSession.name,
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

  return (
    <div className="client-app">
      <main className="client-chat">
        <header className="client-header">
          <div className="client-brand-avatar">N</div>

          <div className="client-header-info">
            <strong>NEXORA Support</strong>

            <span className={lastStaffMessage ? "online" : ""}>
              {isResolved
                ? "Conversazione risolta"
                : assignedOperator
                  ? `${
                      assignedOperator.online ? "● " : "○ "
                    }${assignedOperator.displayName}${
                      assignedOperator.online ? " è online" : " sta rispondendo"
                    }`
                  : lastStaffMessage
                    ? `${lastStaffMessage.authorName} ti sta assistendo`
                    : "In attesa di un operatore"}
            </span>
          </div>

          <button className="client-exit" onClick={logoutClient}>
            Esci
          </button>
        </header>

        <div className="client-messages" ref={messagesContainerRef}>
          <div className="client-system-chip">
            Chat avviata • Un operatore NEXORA ti risponderà qui
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`client-message ${
                message.authorType === "customer" ? "mine" : "staff"
              }`}
            >
              <div className="client-bubble">
                {message.authorType !== "customer" && (
                  <div className="client-bubble-name">{message.authorName}</div>
                )}

                {message.attachment && (
                  <AttachmentView attachment={message.attachment} />
                )}

                <p>{message.text}</p>

                <span className="client-time">{formatTime(message.time)}</span>
              </div>
            </div>
          ))}
        </div>

        {isResolved && (
          <div className="client-resolved-banner">
            Conversazione segnata come risolta dallo staff. Scrivi un messaggio
            per riaprirla.
          </div>
        )}

        <div className="client-input-bar">
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
            conversationId={conversation?.id ?? clientSession.id}
            onUploaded={setPendingAttachment}
          />

          <input
            placeholder={
              isResolved
                ? "Scrivi per riaprire la conversazione..."
                : "Scrivi un messaggio..."
            }
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            className="client-send"
            onClick={handleSend}
            title="Invia"
            disabled={!draft.trim() && !pendingAttachment}
          >
            <Send size={18} />
          </button>
        </div>
      </main>
    </div>
  );
}

export default ClientApp;
