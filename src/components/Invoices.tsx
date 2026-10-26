import { useState, useEffect } from "react";
import { Plus, FileText, Edit2, Trash2, AlertCircle, Download } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type {
  Invoice,
  Company,
  Client,
  User,
  InvoiceItem,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  CreateInvoiceItemRequest,
  UpdateInvoiceItemRequest,
} from "../types";
import { validateRequired, INVOICE_STATUSES, formatCurrency } from "../types";
import PageHeader from "./shared/PageHeader";
import { SearchBar, DataTable, TableCell, ActionCell, FormModal } from "./shared";
import InvoiceItemsEditor, { type DraftInvoiceItem } from "./invoices/InvoiceItemsEditor";
import InvoicePDF from "./InvoicePDF";
import { pdf } from "@react-pdf/renderer";
import { invoke } from "@tauri-apps/api/core";

export default function Invoices() {
  const { companyId, user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [draftItems, setDraftItems] = useState<DraftInvoiceItem[]>([]);

  const [formData, setFormData] = useState<CreateInvoiceRequest>({
    company_id: companyId || "",
    client_id: "",
    created_by: user?.id || "",
    invoice_number: "",
    status: "draft",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    subtotal: 0,
    tax_rate: 20,
    tax_amount: 0,
    discount: 0,
    total: 0,
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, [companyId, user]);

  const loadData = async () => {
    if (!companyId || !user) return;

    try {
      setIsLoading(true);
      const [invoicesData, companiesData, clientsData, usersData, invoiceItemsData] = await Promise.all([
        api.invoices.getAll(),
        api.companies.getAll(),
        api.clients.getAll(),
        api.users.getAll(),
        api.invoiceItems.getAll(),
      ]);
      // Filter by company_id
      setInvoices(invoicesData.filter(i => i.company_id === companyId));
      setCompanies(companiesData.filter(c => c.id === companyId));
      setClients(clientsData.filter(c => c.company_id === companyId));
      setUsers(usersData.filter(u => u.company_id === companyId));
      // Filter invoice items for this company's invoices
      const companyInvoiceIds = new Set(invoicesData.filter(i => i.company_id === companyId).map(i => i.id));
      setInvoiceItems(invoiceItemsData.filter(item => companyInvoiceIds.has(item.invoice_id)));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateInvoiceTotals = (subtotal: number, taxRate: number, discount: number) => {
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discount;
    return { tax_amount: taxAmount, total };
  };

  const calculateItemsSubtotal = (items: DraftInvoiceItem[]) => {
    return items.reduce((sum, item) => sum + item.total_price_ht, 0);
  };

  const recalculateFromItems = (items: DraftInvoiceItem[], taxRate: number, discount: number) => {
    const subtotal = calculateItemsSubtotal(items);
    const totals = calculateInvoiceTotals(subtotal, taxRate, discount);
    setFormData((prev) => ({ ...prev, subtotal, ...totals }));
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!validateRequired(formData.company_id)) {
      newErrors.push("Veuillez sélectionner une entreprise");
    }
    if (!validateRequired(formData.client_id)) {
      newErrors.push("Veuillez sélectionner un client");
    }
    if (!validateRequired(formData.created_by)) {
      newErrors.push("Veuillez sélectionner un utilisateur");
    }
    if (!validateRequired(formData.invoice_number)) {
      newErrors.push("Le numéro de facture est requis");
    }
    if (!validateRequired(formData.issue_date)) {
      newErrors.push("La date d'émission est requise");
    }
    if (!validateRequired(formData.due_date)) {
      newErrors.push("La date d'échéance est requise");
    }
    if (draftItems.length === 0) {
      newErrors.push("Ajoutez au moins une ligne de facture");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!companyId || !user) {
      setErrors(["Erreur: utilisateur non connecté"]);
      return;
    }

    try {
      // Ensure company_id and created_by are set to current user's values
      const invoiceData = {
        ...formData,
        company_id: companyId,
        created_by: user.id,
      };

      let savedInvoice: Invoice;
      if (editingInvoice) {
        savedInvoice = await api.invoices.update(editingInvoice.id, invoiceData as UpdateInvoiceRequest);
        const existingItems = invoiceItems.filter((item) => item.invoice_id === editingInvoice.id);
        const existingById = new Map(existingItems.map((item) => [item.id, item]));
        const keptIds = new Set<string>();
        const updatePromises: Promise<InvoiceItem>[] = [];
        const createPromises: Promise<InvoiceItem>[] = [];

        for (const item of draftItems) {
          if (item.id && existingById.has(item.id)) {
            keptIds.add(item.id);
            const request: UpdateInvoiceItemRequest = {
              invoice_id: editingInvoice.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price_ht: item.total_price_ht,
            };
            updatePromises.push(api.invoiceItems.update(item.id, request));
          } else {
            const request: CreateInvoiceItemRequest = {
              invoice_id: editingInvoice.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price_ht: item.total_price_ht,
            };
            createPromises.push(api.invoiceItems.create(request));
          }
        }

        const deletePromises = existingItems
          .filter((item) => !keptIds.has(item.id))
          .map((item) => api.invoiceItems.delete(item.id));

        await Promise.all([...updatePromises, ...createPromises, ...deletePromises]);
      } else {
        savedInvoice = await api.invoices.create(invoiceData);
        await Promise.all(
          draftItems.map((item) =>
            api.invoiceItems.create({
              invoice_id: savedInvoice.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price_ht: item.total_price_ht,
            })
          )
        );
      }

      setShowModal(false);
      setEditingInvoice(null);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Error saving invoice:", error);
      setErrors(["Une erreur est survenue lors de l'enregistrement"]);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    const linkedItems: DraftInvoiceItem[] = invoiceItems
      .filter((item) => item.invoice_id === invoice.id)
      .map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price_ht: item.total_price_ht,
      }));
    const subtotal = calculateItemsSubtotal(linkedItems);
    const totals = calculateInvoiceTotals(subtotal, invoice.tax_rate, invoice.discount);

    setEditingInvoice(invoice);
    setFormData({
      company_id: invoice.company_id,
      client_id: invoice.client_id,
      created_by: invoice.created_by,
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      subtotal,
      tax_rate: invoice.tax_rate,
      tax_amount: totals.tax_amount,
      discount: invoice.discount,
      total: totals.total,
      notes: invoice.notes,
    });
    setDraftItems(linkedItems);
    setErrors([]);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette facture ?")) return;

    try {
      await api.invoices.delete(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Erreur lors de la suppression");
    }
  };

  const handleGeneratePdf = async (id: string, invoiceNumber: string) => {
    try {
      const invoice = invoices.find(inv => inv.id === id);
      if (!invoice) {
        alert("Facture non trouvée");
        return;
      }

      const company = companies.find(c => c.id === invoice.company_id);
      const client = clients.find(c => c.id === invoice.client_id);
      const items = invoiceItems.filter(item => item.invoice_id === id);

      if (!company || !client) {
        alert("Informations manquantes pour générer le PDF");
        return;
      }

      // Convert logo to base64 if it's a local file
      let logoUrl = company.logo_url;
      console.log('Original logo_url:', logoUrl);
      if (logoUrl && !logoUrl.startsWith('http')) {
        try {
          logoUrl = await invoke<string>('get_company_logo_base64', { logoPath: logoUrl });
          console.log('Converted logo to base64, length:', logoUrl.length);
        } catch (err) {
          console.error('Failed to convert logo:', err);
          // Keep original value or use empty string
          logoUrl = '';
        }
      }

      const companyWithLogo = { ...company, logo_url: logoUrl };
      console.log('Company with logo:', companyWithLogo);

      // Generate PDF blob
      const blob = await pdf(
        <InvoicePDF
          invoice={invoice}
          items={items}
          company={companyWithLogo}
          client={client}
        />
      ).toBlob();

      // Convert blob to base64 using FileReader
      const pdf_base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Save and open PDF via Tauri command
      await invoke("save_and_open_pdf", {
        filename: `facture_${invoiceNumber}.pdf`,
        pdfBase64: pdf_base64,
      });

      // Update invoice status from draft to sent
      if (invoice.status === "draft") {
        await api.invoices.update(id, { 
          company_id: invoice.company_id,
          client_id: invoice.client_id,
          created_by: invoice.created_by,
          invoice_number: invoice.invoice_number,
          status: "sent",
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          subtotal: invoice.subtotal,
          tax_rate: invoice.tax_rate,
          tax_amount: invoice.tax_amount,
          discount: invoice.discount,
          total: invoice.total,
          notes: invoice.notes
        } as UpdateInvoiceRequest);
        await loadData();
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Erreur lors de la génération du PDF");
    }
  };
  const getUserInitials = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    if (!user?.name) return "XX";
    const nameParts = user.name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  };

  const generateInvoiceNumber = (userId: string): string => {
    if (!userId) return "";
    
    // Compte les factures existantes pour le numéro séquentiel
    const invoiceCount = invoices.length + 1;
    const sequential = invoiceCount.toString().padStart(2, '0');
    
    // Initiales de l'utilisateur
    const initials = getUserInitials(userId);
    
    // Mois précédent et année
    const now = new Date();
    const prevMonth = now.getMonth(); // 0-11, donc janvier (0) donne décembre (11) de l'année précédente
    const year = prevMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const monthStr = (prevMonth === 0 ? 12 : prevMonth).toString().padStart(2, '0');
    const yearStr = year.toString();
    
    return `${sequential}/${initials}/${monthStr}/${yearStr}`;
  };

  const resetForm = () => {
    const currentUserId = user?.id || "";
    const currentCompanyId = companyId || "";
    setFormData({
      company_id: currentCompanyId,
      client_id: clients[0]?.id || "",
      created_by: currentUserId,
      invoice_number: generateInvoiceNumber(currentUserId),
      status: "draft",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      subtotal: 0,
      tax_rate: 20,
      tax_amount: 0,
      discount: 0,
      total: 0,
      notes: "",
    });
    setErrors([]);
    setDraftItems([]);
  };

  const openCreateModal = () => {
    setEditingInvoice(null);
    resetForm();
    setShowModal(true);
  };

  const getCompanyName = (id: string) => {
    return companies.find((c) => c.id === id)?.name || "-";
  };

  const getClientName = (id: string) => {
    return clients.find((c) => c.id === id)?.name || "-";
  };

  const filteredInvoices = invoices.filter(
    (i) =>
      i.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(i.client_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      sent: "bg-blue-100 text-blue-700",
      partially_paid: "bg-yellow-100 text-yellow-700",
      paid: "bg-emerald-100 text-emerald-700",
      overdue: "bg-red-100 text-red-700",
      cancelled: "bg-amber-100 text-amber-700",
    };
    const labels: Record<string, string> = {
      draft: "Brouillon",
      sent: "Envoyée",
      partially_paid: "Payée partiellement",
      paid: "Payée",
      overdue: "En retard",
      cancelled: "Annulée",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex ${classes[status] || classes.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        subtitle="Gérez vos factures"
        actionLabel="Nouvelle facture"
        onAction={openCreateModal}
        actionIcon={<Plus size={18} />}
      />

      <SearchBar
        placeholder="Rechercher une facture..."
        value={searchTerm}
        onChange={setSearchTerm}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <p className="text-gray-500 mt-4">
              {searchTerm ? "Aucune facture trouvée" : "Aucune facture pour le moment"}
            </p>
          </div>
        ) : (
          <DataTable headers={["N° Facture", "Client", "Entreprise", "Statut", "Total", "Échéance", "Actions"]}>
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50/80">
                <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                <TableCell>{getClientName(invoice.client_id)}</TableCell>
                <TableCell>{getCompanyName(invoice.company_id)}</TableCell>
                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(invoice.total, companies[0]?.currency)}</TableCell>
                <TableCell>{new Date(invoice.due_date).toLocaleDateString("fr-FR")}</TableCell>
                <ActionCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGeneratePdf(invoice.id, invoice.invoice_number)}
                      className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                      title="Générer PDF"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(invoice)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(invoice.id)}
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
          title={editingInvoice ? "Modifier la facture" : "Nouvelle facture"}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          submitLabel={editingInvoice ? "Enregistrer" : "Créer"}
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
              <label className="text-sm font-medium text-gray-700">Entreprise *</label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              >
                <option value="">Sélectionner</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Client *</label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              >
                <option value="">Sélectionner</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Créé par *</label>
              <select
                value={formData.created_by}
                onChange={(e) => {
                  const userId = e.target.value;
                  setFormData({ 
                    ...formData, 
                    created_by: userId,
                    invoice_number: generateInvoiceNumber(userId)
                  });
                }}
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
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              >
                {INVOICE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === "draft" ? "Brouillon" :
                     status === "sent" ? "Envoyée" :
                     status === "partially_paid" ? "Payée partiellement" :
                     status === "paid" ? "Payée" :
                     status === "overdue" ? "En retard" :
                     status === "cancelled" ? "Annulée" : status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Numéro de facture *</label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              placeholder="NUM/USER/MONTH"
              // readOnly
              // className="px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-600 w-full text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Date d'émission *</label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Date d'échéance *</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Sous-total</label>
              <input
                type="number"
                step="0.01"
                value={formData.subtotal}
                readOnly
                className="px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-600 w-full text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Taux de TVA (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.tax_rate}
                disabled
                className="px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-600 w-full text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Remise</label>
              <input
                type="number"
                step="0.01"
                value={formData.discount}
                disabled
                className="px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-600 w-full text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Montant TVA calculé</label>
              <input
                type="number"
                step="0.01"
                value={formData.tax_amount}
                readOnly
                className="px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-600 w-full text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Total calculé</label>
              <input
                type="number"
                step="0.01"
                value={formData.total}
                readOnly
                className="px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-600 w-full text-sm"
              />
            </div>
            <div></div>
          </div>

          <InvoiceItemsEditor
            items={draftItems}
            onValidationErrors={setErrors}
            currency={companies.find(c => c.id === formData.company_id)?.currency || 'EUR'}
            onChange={(items) => {
              setDraftItems(items);
              recalculateFromItems(items, formData.tax_rate, formData.discount);
            }}
          />

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
