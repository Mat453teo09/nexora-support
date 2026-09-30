import { useCallback } from "react";

/**
 * Azioni sulle conversazioni (assegnazione, stato, note, messaggi).
 * Usa il setter condiviso così ogni modifica si propaga alle altre tab.
 */
export function useConversationActions(setConversations) {
  const updateConversationById = useCallback(
    (conversationId, updater) => {
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId ? updater(conversation) : conversation,
        ),
      );
    },
    [setConversations],
  );

  const assignConversation = useCallback(
    (conversationId, operatorId) => {
      updateConversationById(conversationId, (conversation) => ({
        ...conversation,
        assignedTo: operatorId || null,
      }));
    },
    [updateConversationById],
  );

  const setConversationStatus = useCallback(
    (conversationId, status) => {
      updateConversationById(conversationId, (conversation) => ({
        ...conversation,
        status,
      }));
    },
    [updateConversationById],
  );

  const toggleResolved = useCallback(
    (conversationId) => {
      updateConversationById(conversationId, (conversation) => ({
        ...conversation,
        status: conversation.status === "open" ? "resolved" : "open",
      }));
    },
    [updateConversationById],
  );

  const setConversationNotes = useCallback(
    (conversationId, notes) => {
      updateConversationById(conversationId, (conversation) => ({
        ...conversation,
        notes,
      }));
    },
    [updateConversationById],
  );

  const markConversationRead = useCallback(
    (conversationId) => {
      updateConversationById(conversationId, (conversation) => ({
        ...conversation,
        unread: 0,
      }));
    },
    [updateConversationById],
  );

  const sendStaffMessage = useCallback(
    (conversationId, { authorId, authorName, text }) => {
      updateConversationById(conversationId, (conversation) => ({
        ...conversation,
        status: "open",
        messages: [
          ...conversation.messages,
          {
            id: `msg-${crypto.randomUUID()}`,
            authorType: "operator",
            authorId,
            authorName,
            text,
            time: Date.now(),
          },
        ],
      }));
    },
    [updateConversationById],
  );

  const sendCustomerMessage = useCallback(
    (customerId, { senderId, senderName, text }) => {
      setConversations((previous) => {
        const existing = previous.find(
          (conversation) => conversation.customerId === customerId,
        );

        const newMessage = {
          id: `msg-${crypto.randomUUID()}`,
          authorType: "customer",
          authorId: senderId,
          authorName: senderName,
          text,
          time: Date.now(),
        };

        if (!existing) {
          return [
            ...previous,
            {
              id: `conv-${crypto.randomUUID()}`,
              customerId,
              assignedTo: null,
              status: "open",
              unread: 1,
              notes: "",
              messages: [newMessage],
            },
          ];
        }

        return previous.map((conversation) =>
          conversation.customerId === customerId
            ? {
                ...conversation,
                status: "open",
                unread: conversation.unread + 1,
                messages: [...conversation.messages, newMessage],
              }
            : conversation,
        );
      });
    },
    [setConversations],
  );

  /**
   * Crea la conversazione di un cliente se non esiste già.
   */
  const createConversationForCustomer = useCallback(
    (customer) => {
      setConversations((previous) => {
        if (previous.some((item) => item.customerId === customer.id)) {
          return previous;
        }

        return [
          ...previous,
          {
            id: `conv-${crypto.randomUUID()}`,
            customerId: customer.id,
            assignedTo: null,
            status: "open",
            unread: 0,
            notes: "",
            messages: [],
          },
        ];
      });
    },
    [setConversations],
  );

  return {
    updateConversationById,
    assignConversation,
    setConversationStatus,
    toggleResolved,
    setConversationNotes,
    markConversationRead,
    sendStaffMessage,
    sendCustomerMessage,
    createConversationForCustomer,
  };
}
