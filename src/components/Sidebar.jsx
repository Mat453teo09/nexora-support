import {
  BarChart3,
  CheckCircle2,
  Inbox,
  LogOut,
  MessageSquare,
  Settings,
  UserCog,
  Users,
} from "lucide-react";

import { getDisplayName, getInitial } from "../utils/display";
import { useStore } from "../store/useStore";

const ALL_NAV_ITEMS = [
  { key: "inbox", label: "Inbox", icon: Inbox, ownerOnly: false },
  {
    key: "conversations",
    label: "Conversazioni",
    icon: MessageSquare,
    ownerOnly: false,
  },
  { key: "operators", label: "Operatori", icon: Users, ownerOnly: true },
  { key: "resolved", label: "Risolte", icon: CheckCircle2, ownerOnly: false },
  {
    key: "stats",
    label: "Statistiche",
    icon: BarChart3,
    ownerOnly: true,
  },
  { key: "settings", label: "Impostazioni", icon: Settings, ownerOnly: true },
  {
    key: "profile",
    label: "Il mio profilo",
    icon: UserCog,
    ownerOnly: true,
  },
];

function Sidebar({ currentPage, onNavigate, onLogout }) {
  const { session, conversations, users, setOperatorOnline } = useStore();

  const openConversations = conversations.filter(
    (conversation) => conversation.status === "open",
  );

  const activeOperators = users.filter(
    (user) => user.role === "OPERATOR" && user.active !== false,
  );

  const me = users.find((user) => user.id === session.id);

  const isOnline = Boolean(me?.online);

  const isOwner = session.role === "OWNER";

  const visibleItems = ALL_NAV_ITEMS.filter(
    (item) => isOwner || !item.ownerOnly,
  );

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">N</div>

        <div>
          <h1>NEXORA</h1>
          <span>SUPPORT</span>
        </div>
      </div>

      <nav>
        {visibleItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              className={`nav-item ${currentPage === item.key ? "active" : ""}`}
              onClick={() => onNavigate(item.key)}
            >
              <Icon size={20} />
              {item.label}

              {item.key === "inbox" && openConversations.length > 0 && (
                <span className="badge">{openConversations.length}</span>
              )}

              {item.key === "operators" && (
                <span className="badge badge-neutral">
                  {activeOperators.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="user-card">
          <div className={`avatar ${isOwner ? "owner" : ""}`}>
            {getInitial(getDisplayName(session))}
          </div>

          <div className="user-info">
            <strong>{getDisplayName(session)}</strong>

            <span>{session.role === "OWNER" ? "OWNER" : "OPERATOR"}</span>
          </div>

          <button
            className={`presence-dot ${isOnline ? "online-dot" : "offline-dot"}`}
            title={
              isOnline
                ? "Sei online: clicca per andare offline"
                : "Sei offline: clicca per andare online"
            }
            onClick={() => setOperatorOnline(session.id, !isOnline)}
          />
        </div>

        <button className="logout" onClick={onLogout}>
          <LogOut size={18} />
          Esci
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
