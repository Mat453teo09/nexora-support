import { useMemo } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  MessageSquare,
  Users,
} from "lucide-react";

import { useStore } from "../store/useStore";
import { getDisplayName } from "../utils/display";

function formatDuration(ms) {
  if (!ms || ms <= 0) return "—";

  const minutes = Math.round(ms / 60_000);

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

/**
 * Statistiche del pannello, visibili solo all'owner:
 * volumi, tempi di risposta e performance per operatore.
 */
function StatsPage() {
  const { users, conversations } = useStore();

  const stats = useMemo(() => {
    const open = conversations.filter((item) => item.status === "open");
    const resolved = conversations.filter((item) => item.status === "resolved");

    const totalMessages = conversations.reduce(
      (sum, item) => sum + item.messages.length,
      0,
    );

    const customerMessages = conversations.reduce(
      (sum, item) =>
        sum + item.messages.filter((m) => m.authorType === "customer").length,
      0,
    );

    // Tempo di prima risposta: dal primo messaggio cliente alla
    // prima risposta dello staff.
    let firstResponseSum = 0;
    let firstResponseCount = 0;

    // Tempo di risoluzione: dall'apertura (primo messaggio) alla risoluzione.
    let resolutionSum = 0;
    let resolutionCount = 0;

    conversations.forEach((conversation) => {
      const firstCustomer = conversation.messages.find(
        (message) => message.authorType === "customer",
      );

      const firstStaff = conversation.messages.find(
        (message) => message.authorType === "operator",
      );

      if (firstCustomer && firstStaff && firstStaff.time > firstCustomer.time) {
        firstResponseSum += firstStaff.time - firstCustomer.time;
        firstResponseCount += 1;
      }

      if (
        conversation.status === "resolved" &&
        firstCustomer &&
        conversation.resolvedAt
      ) {
        resolutionSum += conversation.resolvedAt - firstCustomer.time;
        resolutionCount += 1;
      }
    });

    // Performance per membro dello staff.
    const perOperator = {};

    users
      .filter((user) => user.role === "OPERATOR" || user.role === "OWNER")
      .forEach((user) => {
        perOperator[user.id] = {
          name: getDisplayName(user),
          role: user.role,
          assigned: 0,
          resolved: 0,
          messages: 0,
        };
      });

    conversations.forEach((conversation) => {
      if (conversation.assignedTo && perOperator[conversation.assignedTo]) {
        perOperator[conversation.assignedTo].assigned += 1;

        if (conversation.status === "resolved") {
          perOperator[conversation.assignedTo].resolved += 1;
        }
      }

      conversation.messages.forEach((message) => {
        if (message.authorType === "operator" && perOperator[message.authorId]) {
          perOperator[message.authorId].messages += 1;
        }
      });
    });

    const operatorList = Object.values(perOperator).sort(
      (a, b) => b.messages - a.messages,
    );

    return {
      total: conversations.length,
      open: open.length,
      resolved: resolved.length,
      totalMessages,
      customerMessages,
      avgFirstResponse:
        firstResponseCount > 0 ? firstResponseSum / firstResponseCount : null,
      avgResolution:
        resolutionCount > 0 ? resolutionSum / resolutionCount : null,
      operatorList,
    };
  }, [users, conversations]);

  const cards = [
    {
      icon: MessageSquare,
      label: "Conversazioni totali",
      value: stats.total,
      detail: `${stats.open} aperte • ${stats.resolved} risolte`,
    },
    {
      icon: BarChart3,
      label: "Messaggi scambiati",
      value: stats.totalMessages,
      detail: `${stats.customerMessages} dai clienti`,
    },
    {
      icon: Clock,
      label: "Tempo medio 1ª risposta",
      value: formatDuration(stats.avgFirstResponse),
      detail: "dal messaggio del cliente alla risposta",
    },
    {
      icon: CheckCircle2,
      label: "Tempo medio risoluzione",
      value: formatDuration(stats.avgResolution),
      detail: "dall'apertura alla risoluzione",
    },
  ];

  return (
    <main className="management-page">
      <div className="page-header">
        <div>
          <h2>Statistiche</h2>

          <p>Andamento del supporto NEXORA</p>
        </div>
      </div>

      <div className="stats-grid">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div className="stats-card" key={card.label}>
              <div className="stats-icon">
                <Icon size={20} />
              </div>

              <div>
                <span className="stats-label">{card.label}</span>

                <strong className="stats-value">{card.value}</strong>

                <span className="stats-detail">{card.detail}</span>
              </div>
            </div>
          );
        })}
      </div>

      <h3 className="stats-subtitle">
        <Users size={16} />
        Performance staff
      </h3>

      <div className="stats-table-card">
        {stats.operatorList.length === 0 && (
          <div className="empty-list">Nessun dato disponibile.</div>
        )}

        {stats.operatorList.map((operator) => {
          const rate =
            operator.assigned > 0
              ? Math.round((operator.resolved / operator.assigned) * 100)
              : null;

          return (
            <div className="stats-row" key={operator.name}>
              <strong>{operator.name}</strong>

              {operator.role === "OWNER" && (
                <span className="status-chip open">OWNER</span>
              )}

              <div className="stats-row-values">
                <span>
                  <strong>{operator.assigned}</strong> assegnate
                </span>

                <span>
                  <strong>{operator.resolved}</strong> risolte
                  {rate !== null && ` (${rate}%)`}
                </span>

                <span>
                  <strong>{operator.messages}</strong> messaggi
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {stats.total === 0 && (
        <p className="stats-empty-hint">
          Le statistiche si popolano man mano che arrivano conversazioni e
          messaggi.
        </p>
      )}
    </main>
  );
}

export default StatsPage;
