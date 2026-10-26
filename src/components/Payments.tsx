import { useState, useEffect } from "react";
import { Plus, CreditCard, Edit2, Trash2, AlertCircle } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type { Payment, Invoice, User, Company, CreatePaymentRequest, UpdatePaymentRequest } from "../types";
import { validateRequired, PAYMENT_METHODS, formatCurrency } from "../types";
import PageHeader from "./shared/PageHeader";
import { SearchBar, DataTable, TableCell, ActionCell, FormModal } from "./shared";

export default function Payments() {
  const { companyId, user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState<CreatePaymentRequest>({
    invoice_id: "",
    recorded_by: user?.id || "",
    amount: 0,
    method: "bank_transfer",
    payment_date: new Date().toISOString().split("T")[0],
    reference: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, [companyId, user]);

  const loadData = async () => {
    if (!companyId || !user) return;

    try {
      setIsLoading(true);
      const [paymentsData, invoicesData, usersData, companiesData] = await Promise.all([
        api.payments.getAll(),
        api.invoices.getAll(),
        api.users.getAll(),
        api.companies.getAll(),
      ]);
      // Filter invoices by company (all statuses)
      const companyInvoices = invoicesData.filter(i => i.company_id === companyId);
      setInvoices(companyInvoices);
      // Filter payments for company's invoices
      const companyInvoiceIds = new Set(companyInvoices.map(i => i.id));
      setPayments(paymentsData.filter(p => companyInvoiceIds.has(p.invoice_id)));
      // Filter users by company
      setUsers(usersData.filter(u => u.company_id === companyId));
      // Filter companies
      setCompanies(companiesData.filter(c => c.id === companyId));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInvoiceTotalPaid = (invoiceId: string): number => {
    return payments
      .filter(p => p.invoice_id === invoiceId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!validateRequired(formData.invoice_id)) {
      newErrors.push("Veuillez sélectionner une facture");
    }
    if (!validateRequired(formData.recorded_by)) {
      newErrors.push("Veuillez sélectionner un utilisateur");
    }
    if (formData.amount <= 0) {
      newErrors.push("Le montant doit être supérieur à 0");
    }
    if (!validateRequired(formData.payment_date)) {
      newErrors.push("La date de paiement est requise");
    }

    // Validate amount against invoice total
    const selectedInvoice = invoices.find(i => i.id === formData.invoice_id);
    if (selectedInvoice) {
      const alreadyPaid = editingPayment 
        ? getInvoiceTotalPaid(formData.invoice_id) - editingPayment.amount
        : getInvoiceTotalPaid(formData.invoice_id);
      const remainingAmount = selectedInvoice.total - alreadyPaid;
      
      if (formData.amount > remainingAmount) {
        newErrors.push(`Le montant ne peut pas dépasser le reste à payer (${formatCurrency(remainingAmount, companies[0]?.currency)})`);
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const updateInvoiceStatus = async (invoiceId: string, newPaymentAmount: number, oldPaymentAmount?: number): Promise<void> => {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    // Calculate new total paid: existing total + new amount - old amount (if editing)
    const currentTotalPaid = getInvoiceTotalPaid(invoiceId);
    const oldAmount = oldPaymentAmount || 0;
    const newTotalPaid = currentTotalPaid - oldAmount + newPaymentAmount;
    
    let newStatus: string;

    if (newTotalPaid >= invoice.total) {
      newStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newStatus = 'partially_paid';
    } else {
      newStatus = invoice.status;
    }

    if (newStatus !== invoice.status) {
      await api.invoices.update(invoiceId, {
        company_id: invoice.company_id,
        client_id: invoice.client_id,
        created_by: invoice.created_by,
        invoice_number: invoice.invoice_number,
        status: newStatus,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        subtotal: invoice.subtotal,
        tax_rate: invoice.tax_rate,
        tax_amount: invoice.tax_amount,
        discount: invoice.discount,
        total: invoice.total,
        notes: invoice.notes,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!user) {
      setErrors(["Erreur: utilisateur non connecté"]);
      return;
    }

    try {
      // Ensure recorded_by is set to current user
      const paymentData = {
        ...formData,
        recorded_by: user.id,
      };

      if (editingPayment) {
        await api.payments.update(editingPayment.id, paymentData as UpdatePaymentRequest);
      } else {
        await api.payments.create(paymentData);
      }

      // Update invoice status based on payments
      await updateInvoiceStatus(formData.invoice_id, formData.amount, editingPayment?.amount);

      setShowModal(false);
      setEditingPayment(null);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Error saving payment:", error);
      setErrors(["Une erreur est survenue lors de l'enregistrement"]);
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      invoice_id: payment.invoice_id,
      recorded_by: payment.recorded_by,
      amount: payment.amount,
      method: payment.method,
      payment_date: payment.payment_date,
      reference: payment.reference,
      notes: payment.notes,
    });
    setErrors([]);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce paiement ?")) return;

    try {
      const payment = payments.find(p => p.id === id);
      const invoiceId = payment?.invoice_id;
      
      await api.payments.delete(id);
      
      // Update invoice status after deletion
      if (invoiceId) {
        await updateInvoiceStatus(invoiceId, 0, payment?.amount);
      }
      
      await loadData();
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_id: invoices[0]?.id || "",
      recorded_by: users[0]?.id || "",
      amount: 0,
      method: "bank_transfer",
      payment_date: new Date().toISOString().split("T")[0],
      reference: "",
      notes: "",
    });
    setErrors([]);
  };

  const openCreateModal = () => {
    setEditingPayment(null);
    resetForm();
    setShowModal(true);
  };

  const getInvoiceNumber = (id: string) => {
    return invoices.find((i) => i.id === id)?.invoice_number || "-";
  };

  const getInvoiceStatus = (id: string) => {
    return invoices.find((i) => i.id === id)?.status || "sent";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: "soldé",
      partially_paid: "soldé partiellement",
      sent: "impayé",
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      paid: "bg-green-100 text-green-700",
      partially_paid: "bg-amber-100 text-amber-700",
      sent: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ml-2 ${classes[status] || classes.sent}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  const getUserName = (id: string) => {
    return users.find((u) => u.id === id)?.name || "-";
  };

  const filteredPayments = payments.filter(
    (p) =>
      getInvoiceNumber(p.invoice_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserName(p.recorded_by).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Espèces",
      card: "Carte",
      bank_transfer: "Virement",
      check: "Chèque",
      other: "Autre",
    };
    return labels[method] || method;
  };

  const getMethodBadge = (method: string) => {
    const classes: Record<string, string> = {
      cash: "bg-green-100 text-green-700",
      card: "bg-blue-100 text-blue-700",
      bank_transfer: "bg-purple-100 text-purple-700",
      check: "bg-amber-100 text-amber-700",
      other: "bg-gray-100 text-gray-700",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex ${classes[method] || classes.other}`}>
        {getMethodLabel(method)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        subtitle="Gérez les paiements reçus"
        actionLabel="Nouveau paiement"
        onAction={openCreateModal}
        actionIcon={<Plus size={18} />}
      />

      <SearchBar
        placeholder="Rechercher un paiement..."
        value={searchTerm}
        onChange={setSearchTerm}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-300" />
            <p className="text-gray-500 mt-4">
              {searchTerm ? "Aucun paiement trouvé" : "Aucun paiement pour le moment"}
            </p>
          </div>
        ) : (
          <DataTable headers={["Facture", "Montant", "Méthode", "Date", "Référence", "Enregistré par", "Actions"]}>
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50/80">
                <TableCell className="font-medium">
                  {getInvoiceNumber(payment.invoice_id)}
                  {getStatusBadge(getInvoiceStatus(payment.invoice_id))}
                </TableCell>
                <TableCell className="font-medium text-emerald-600">{formatCurrency(payment.amount, companies[0]?.currency)}</TableCell>
                <TableCell>{getMethodBadge(payment.method)}</TableCell>
                <TableCell>{new Date(payment.payment_date).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>{payment.reference || "-"}</TableCell>
                <TableCell>{getUserName(payment.recorded_by)}</TableCell>
                <ActionCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(payment)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(payment.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </ActionCell>
              </tr>
            ))}
          </DataTable>
        )}
      </div>

      {showModal && (
        <FormModal
          title={editingPayment ? "Modifier le paiement" : "Nouveau paiement"}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          submitLabel={editingPayment ? "Enregistrer" : "Créer"}
        >
          {errors.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg space-y-1">
              {errors.map((error, i) => (
                <div key={i} className="flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Facture *</label>
              <select
                value={formData.invoice_id}
                onChange={(e) => setFormData({ ...formData, invoice_id: e.target.value })}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              >
                <option value="">Sélectionner</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - {formatCurrency(invoice.total, companies[0]?.currency)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Enregistré par *</label>
              <select
                value={formData.recorded_by}
                onChange={(e) => setFormData({ ...formData, recorded_by: e.target.value })}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              >
                <option value="">Sélectionner</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Montant *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Méthode de paiement *</label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {getMethodLabel(method)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Date de paiement *</label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Référence</label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                placeholder="N° de transaction, chèque..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              placeholder="Notes additionnelles..."
            />
          </div>
        </FormModal>
      )}
    </div>
  );
}
