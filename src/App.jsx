import { useEffect, useMemo, useState } from "react";

import "./App.css";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import ConversationList from "./components/ConversationList";
import Chat from "./components/Chat";
import CustomerPanel from "./components/CustomerPanel";
import OperatorsPage from "./pages/OperatorsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import StatsPage from "./pages/StatsPage";
import ClientApp from "./pages/ClientApp";
import HomePage from "./pages/HomePage";
import { StoreProvider } from "./store/StoreProvider";
import { useStore } from "./store/useStore";

function AppContent() {
  const {
    session,
    clientSession,
    conversations,
    customers,
    markConversationRead,
    startSession,
    logout,
  } = useStore();

  const [currentPage, setCurrentPage] = useState("inbox");
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loginMode, setLoginMode] = useState("staff");
  const [profileHighlight, setProfileHighlight] = useState(false);
  const [showHome, setShowHome] = useState(true);

  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  useEffect(() => {
    if (activeConversationId) {
      markConversationRead(activeConversationId);
    }
  }, [activeConversationId, markConversationRead]);

  /* ==================== ROUTING CLIENTE ==================== */

  if (clientSession) {
    return <ClientApp />;
  }

  /* ==================== HOMEPUBBLICA ==================== */

  if (showHome && !session) {
    return (
      <HomePage
        onStaffLogin={() => setShowHome(false)}
        onClientChat={() => {
          setLoginMode("client");
          setShowHome(false);
        }}
      />
    );
  }

  /* ==================== LOGIN A DUE MODALITÀ ==================== */

  if (!session) {
    return (
      <Login
        clientMode={loginMode === "client"}
        onBack={() => setShowHome(true)}
        onLogin={(value) => {
          if (value === "client") {
            setLoginMode("client");

            return;
          }

          if (value === null) {
            setLoginMode("staff");

            return;
          }

          startSession(value);
        }}
      />
    );
  }

  /* ==================== PANNELLO STAFF ==================== */

  function handleLogout() {
    setActiveConversationId(null);
    setCurrentPage("inbox");
    logout();
    setShowHome(true);
  }

  function handleSelectConversation(conversationId) {
    setActiveConversationId(conversationId);
  }

  const managementPages = {
    operators: <OperatorsPage />,
    settings: <SettingsPage />,
    profile: <ProfilePage />,
    stats: <StatsPage />,
  };

  const isManagementPage = Boolean(managementPages[currentPage]);

  if (isManagementPage) {
    return (
      <div className="app">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          onLogout={handleLogout}
        />

        {managementPages[currentPage]}
      </div>
    );
  }

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );

  const activeCustomer = activeConversation
    ? customersById.get(activeConversation.customerId)
    : null;

  const view = currentPage === "resolved" ? "resolved" : "inbox";

  return (
    <div className="app">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />

      <ConversationList
        view={view}
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
      />

      <Chat
        conversation={activeConversation}
        customer={activeCustomer}
        onHighlightProfile={() => {
          setProfileHighlight(true);
          window.setTimeout(() => setProfileHighlight(false), 1600);
        }}
      />

      <CustomerPanel
        conversation={activeConversation}
        customer={activeCustomer}
        highlight={profileHighlight}
      />
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}

export default App;
