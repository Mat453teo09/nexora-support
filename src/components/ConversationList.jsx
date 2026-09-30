import { useMemo, useState } from "react";
import { Bell, CheckCircle2, Search } from "lucide-react";

import { useStore } from "../store/useStore";
import { getDisplayName } from "../utils/display";
import { formatListTimestamp, getLastMessage } from "../utils/format";
import { getInitial } from "../utils/display";
import {
  STATUS_FILTERS,
  STATUS_LABELS,
  filterConversations,
} from "../utils/conversations";

function ConversationList({ view, activeId, onSelect }) {
  const { conversations, customers, users, session } = useStore();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const usersById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const source = view === "resolved"
    ? conversations.filter((conversation) => conversation.status === "resolved")
    : conversations.filter((conversation) => conversation.status === "open");

  const visible = useMemo(
    () =>
      filterConversations({
        conversations: source,
        customers,
        query,
        statusFilter,
        currentUserId: session.id,
      }),
    [source, customers, query, statusFilter, session.id],
  );

  const counts = {
    all: source.length,
    unassigned: source.filter((conversation) => !conversation.assignedTo).length,
    mine: source.filter((conversation) => conversation.assignedTo === session.id)
      .length,
  };

  function renderRow(conversation) {
    const customer = customersById.get(conversation.customerId) ?? {
      name: "Cliente sconosciuto",
      phone: "",
    };

    const lastMessage = getLastMessage(conversation);

    const assignedUser = conversation.assignedTo
      ? usersById.get(conversation.assignedTo)
      : null;

    const isResolved = conversation.status === "resolved";

    return (
      <button
        key={conversation.id}
        className={`conversation ${conversation.id === activeId ? "selected" : ""}`}
        onClick={() => onSelect(conversation.id)}
      >
        <div className="avatar">{getInitial(customer.name)}</div>

        <div className="conversation-content">
          <div className="conversation-top">
            <strong>{customer.name}</strong>

            <span>
              {lastMessage ? formatListTimestamp(lastMessage.time) : ""}
            </span>
          </div>

          <div className="conversation-bottom">
            <p>
              {lastMessage
                ? lastMessage.text
                : "Nessun messaggio"}
            </p>

            {conversation.unread > 0 && (
              <span className="unread">{conversation.unread}</span>
            )}

            {isResolved && (
              <CheckCircle2 size={14} className="resolved-icon" />
            )}
          </div>

          <div className="conversation-meta">
            <span className={`status-chip ${isResolved ? "resolved" : "open"}`}>
              {STATUS_LABELS[conversation.status]}
            </span>

            <span className="assigned-chip">
              {assignedUser
                ? `→ ${getDisplayName(assignedUser)}`
                : "Non assegnata"}
            </span>
          </div>
          <div className="conversation-phone">{customer.phone}</div>
        </div>
      </button>
    );
  }

  return (
    <section className="conversations">
      <div className="section-header">
        <div>
          <h2>{view === "resolved" ? "Risolte" : "Inbox"}</h2>

          <p>
            {visible.length} conversazione
            {visible.length === 1 ? "" : "i"}
          </p>
        </div>

        <Bell size={20} />
      </div>

      <div className="search">
        <Search size={18} />

        <input
          placeholder="Cerca cliente, testo o numero..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="filters">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            className={`filter ${statusFilter === filter.value ? "active" : ""}`}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
            <span className="filter-count">{counts[filter.value] ?? 0}</span>
            </button>
        ))}
      </div>

      <div className="conversation-list">
        {visible.length === 0 && (
          <div className="empty-list">
            Nessuna conversazione trovata
          </div>
        )}

        {visible.map(renderRow)}
      </div>
    </section>
  );
}
export default ConversationList;
