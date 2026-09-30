/**
 * Costanti e helper per lo stato e l'assegnazione delle conversazioni.
 */

export const CONVERSATION_STATUS = {
  open: "open",
  resolved: "resolved",
};

export const STATUS_LABELS = {
  open: "Aperta",
  resolved: "Risolta",
};

export const STATUS_FILTERS = [
  { value: "all", label: "Tutte" },
  { value: "unassigned", label: "Non assegnate" },
  { value: "mine", label: "Mie" },
];

/**
 * Filtra le conversazioni per testo di ricerca (nome cliente, testo
 * dell'ultimo messaggio, numero) e per filtro rapido.
 */
export function filterConversations({
  conversations,
  customers,
  query,
  statusFilter,
  currentUserId,
}) {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();

  const byId = new Map(customers.map((customer) => [customer.id, customer]));

  return conversations.filter((conversation) => {
    const customer = byId.get(conversation.customerId) ?? {
      name: "Cliente sconosciuto",
      phone: "",
    };

    if (statusFilter === "unassigned" && conversation.assignedTo) return false;

    if (statusFilter === "mine" && conversation.assignedTo !== currentUserId) {
      return false;
    }

    if (!normalizedQuery) return true;

    const lastMessage = conversation.messages[conversation.messages.length - 1];

    const haystack = [
      customer.name,
      customer.phone,
      lastMessage?.text ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
