import { 
  Building2, 
  Users, 
  UserCircle, 
  FileText, 
  ListTodo, 
  CreditCard,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  User
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface SidebarComponentProps extends SidebarProps {
  onLogout: () => void;
  userName: string;
  userRole: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "companies", label: "Entreprises", icon: Building2, adminOnly: true },
  { id: "users", label: "Utilisateurs", icon: Users, adminOnly: true },
  { id: "clients", label: "Clients", icon: UserCircle },
  { id: "invoices", label: "Factures", icon: FileText },
  { id: "invoice-items", label: "Lignes de facture", icon: ListTodo },
  { id: "payments", label: "Paiements", icon: CreditCard },
];

export const ADMIN_ONLY_TABS = menuItems.filter((item) => item.adminOnly).map((item) => item.id);

function SidebarContent({ activeTab, setActiveTab, isOpen, setIsOpen, onLogout, userName, userRole }: SidebarComponentProps) {
  const visibleItems = menuItems.filter((item) => !item.adminOnly || userRole === "admin");

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg border border-gray-200"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="text-white" size={20} />
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-900">ERP Invoices</h1>
                <p className="text-xs text-gray-500">Gestion de factures</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium w-full text-left transition-all ${
                    isActive 
                      ? "bg-blue-50 text-blue-600" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-blue-600" : "text-gray-500"} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-gray-200 space-y-3">
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-3 py-2 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut size={18} />
              <span>Déconnexion</span>
            </button>
            <p className="text-xs text-gray-500 text-center pt-2">
              © 2024 ERP Invoices
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default function Sidebar(props: SidebarProps) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    if (confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
      await logout();
    }
  };

  return (
    <SidebarContent
      {...props}
      onLogout={handleLogout}
      userName={user?.name || "Utilisateur"}
      userRole={user?.role || "user"}
    />
  );
}
