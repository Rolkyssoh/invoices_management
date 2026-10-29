import { useState, useEffect } from "react";
import { Building2, Users, UserCircle, FileText, CreditCard, TrendingUp, TrendingDown } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type { Company, Invoice, User } from "../types";
import { formatCurrency } from "../types";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color: string;
}

function StatCard({ title, value, icon: Icon, trend, trendValue, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend === "up" ? "text-emerald-600" : 
              trend === "down" ? "text-red-600" : "text-gray-500"
            }`}>
              {trend === "up" ? <TrendingUp size={16} /> : 
               trend === "down" ? <TrendingDown size={16} /> : null}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { companyId, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    companies: 0,
    users: 0,
    clients: 0,
    invoices: 0,
    payments: 0,
    totalRevenue: 0,
    totalTaxAmount: 0,
    netRevenue: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [companyId, isAdmin]);

  const loadDashboardData = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      const [_companies, users, clients, invoices, payments] = await Promise.all([
        api.companies.getAll(),
        isAdmin ? api.users.getAll() : Promise.resolve<User[]>([]),
        api.clients.getAll(),
        api.invoices.getAll(),
        api.payments.getAll(),
      ]);

      // Filter by company_id
      const companyUsers = users.filter(u => u.company_id === companyId);
      const companyClients = clients.filter(c => c.company_id === companyId);
      const companyInvoices = invoices.filter(i => i.company_id === companyId);

      setCompany(_companies.find(c => c.id === companyId) || null);
      
      // Get invoice IDs for this company to filter payments
      const companyInvoiceIds = new Set(companyInvoices.map(i => i.id));
      const companyPayments = payments.filter(p => companyInvoiceIds.has(p.invoice_id));

      const totalRevenue = companyPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalTaxAmount = companyInvoices.reduce((sum, invoice) => sum + invoice.tax_amount, 0);
      // Le revenu net est la somme des montants hors taxe des factures
      const netRevenue = companyInvoices.reduce((sum, invoice) => sum + invoice.subtotal, 0);

      setStats({
        companies: 1, // Only show 1 for the current company
        users: companyUsers.length,
        clients: companyClients.length,
        invoices: companyInvoices.length,
        payments: companyPayments.length,
        totalRevenue,
        totalTaxAmount,
        netRevenue,
      });

      // Get 5 most recent invoices for this company
      const sorted = companyInvoices
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      setRecentInvoices(sorted);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-screen overflow-y-auto pb-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="text-gray-600 mt-1">Vue d'ensemble de votre activité</p>
      </div>

      {/* Stats Grid - First Row */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${isAdmin ? "xl:grid-cols-5" : "xl:grid-cols-3"}`}>
        {isAdmin && (
          <>
            <StatCard
              title="Entreprises"
              value={stats.companies}
              icon={Building2}
              color="bg-blue-600"
            />
            <StatCard
              title="Utilisateurs"
              value={stats.users}
              icon={Users}
              color="bg-purple-600"
            />
          </>
        )}
        <StatCard
          title="Clients"
          value={stats.clients}
          icon={UserCircle}
          color="bg-emerald-600"
        />
        <StatCard
          title="Factures"
          value={stats.invoices}
          icon={FileText}
          color="bg-amber-600"
        />
        <StatCard
          title="Paiements"
          value={stats.payments}
          icon={CreditCard}
          color="bg-cyan-600"
        />
      </div>

      {/* Stats Grid - Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-4">
        <StatCard
          title="TVA totale"
          value={formatCurrency(stats.totalTaxAmount, company?.currency)}
          icon={TrendingDown}
          color="bg-orange-600"
        />
        <StatCard
          title="Revenus nets"
          value={formatCurrency(stats.netRevenue, company?.currency)}
          icon={TrendingUp}
          color="bg-green-600"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Factures récentes</h3>
        {recentInvoices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune facture pour le moment</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200 text-xs uppercase tracking-wider">N° Facture</th>
                  <th className="px-4 py-3 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200 text-xs uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200 text-xs uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200 text-xs uppercase tracking-wider">Date d'émission</th>
                  <th className="px-4 py-3 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200 text-xs uppercase tracking-wider">Date d'échéance</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 border-b border-gray-100 font-medium">{invoice.invoice_number}</td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex ${
                        invoice.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                        invoice.status === "sent" ? "bg-blue-100 text-blue-700" :
                        invoice.status === "partially_paid" ? "bg-yellow-100 text-yellow-700" :
                        invoice.status === "overdue" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {invoice.status === "partially_paid" ? "Payée partiellement" :
                         invoice.status === "paid" ? "Payée" :
                         invoice.status === "sent" ? "Envoyée" :
                         invoice.status === "overdue" ? "En retard" :
                         invoice.status === "draft" ? "Brouillon" :
                         invoice.status === "cancelled" ? "Annulée" : invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 font-medium">{formatCurrency(invoice.total, company?.currency)}</td>
                    <td className="px-4 py-3 border-b border-gray-100">{new Date(invoice.issue_date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 border-b border-gray-100">{new Date(invoice.due_date).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
