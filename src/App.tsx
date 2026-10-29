import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Sidebar, { ADMIN_ONLY_TABS } from "./components/Sidebar";
import { AccessDenied } from "./components/shared";
import Dashboard from "./components/Dashboard";
import Companies from "./components/Companies";
import Clients from "./components/Clients";
import Users from "./components/Users";
import Invoices from "./components/Invoices";
import InvoiceItems from "./components/InvoiceItems";
import Payments from "./components/Payments";
import Login from "./components/Login";
import FirstTimeSetup from "./components/FirstTimeSetup";
import CompanySetup from "./components/CompanySetup";
import "./App.css";

function AppContent() {
  const { isAuthenticated, isLoading, needsInitialSetup, initialSetupData, completeSetup, isFirstLogin, completeFirstLogin, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Send non-admins back to the dashboard if they land on an admin-only tab
  useEffect(() => {
    if (!isAdmin && ADMIN_ONLY_TABS.includes(activeTab)) {
      setActiveTab("dashboard");
    }
  }, [isAdmin, activeTab]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show first time setup if needed
  if (needsInitialSetup && initialSetupData) {
    return (
      <FirstTimeSetup
        defaultEmail={initialSetupData.default_email || "admin@default.com"}
        defaultPassword={initialSetupData.default_password || "admin123"}
        onComplete={completeSetup}
      />
    );
  }

  // Show company setup if first login
  if (isAuthenticated && isFirstLogin) {
    return <CompanySetup onComplete={completeFirstLogin} />;
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "companies":
        return isAdmin ? <Companies /> : <AccessDenied />;
      case "users":
        return isAdmin ? <Users /> : <AccessDenied />;
      case "clients":
        return <Clients />;
      case "invoices":
        return <Invoices />;
      case "invoice-items":
        return <InvoiceItems />;
      case "payments":
        return <Payments />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex justify-between bg-gray-50">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <main className="lg:ml-64 min-h-screen fixed right-0 left-0">
        <div className="p-4 lg:p-8 pt-2 lg:pt-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
export { useAuth };
