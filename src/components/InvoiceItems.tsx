import { useState, useEffect } from "react";
import { ListTodo } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type { InvoiceItem, Invoice, Company } from "../types";
import { formatCurrency } from "../types";
import PageHeader from "./shared/PageHeader";
import { SearchBar, DataTable, TableCell } from "./shared";

export default function InvoiceItems() {
  const { companyId } = useAuth();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      const [itemsData, invoicesData, companiesData] = await Promise.all([
        api.invoiceItems.getAll(),
        api.invoices.getAll(),
        api.companies.getAll(), 
      ]);
      // Filter invoices by company
      const companyInvoices = invoicesData.filter(i => i.company_id === companyId);
      setInvoices(companyInvoices);
      // Filter items for company's invoices
      const companyInvoiceIds = new Set(companyInvoices.map(i => i.id));
      setItems(itemsData.filter(item => companyInvoiceIds.has(item.invoice_id)));
      // Get company for currency
      const userCompany = companiesData.find(c => c.id === companyId);
      setCompany(userCompany || null);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInvoiceNumber = (id: string) => {
    return invoices.find((i) => i.id === id)?.invoice_number || "-";
  };

  const filteredItems = items.filter(
    (item) =>
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getInvoiceNumber(item.invoice_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lignes de facture"
        subtitle="Consultez les articles et services facturés"
      />

      <SearchBar
        placeholder="Rechercher une ligne..."
        value={searchTerm}
        onChange={setSearchTerm}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <ListTodo className="mx-auto h-12 w-12 text-gray-300" />
            <p className="text-gray-500 mt-4">
              {searchTerm ? "Aucune ligne trouvée" : "Aucune ligne de facture pour le moment"}
            </p>
          </div>
        ) : (
          <DataTable headers={["Facture", "Description", "Qté", "Prix unitaire", "Total HT"]}>
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/80">
                <TableCell className="font-medium">{getInvoiceNumber(item.invoice_id)}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(item.unit_price, company?.currency)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(item.total_price_ht, company?.currency)}</TableCell>
              </tr>
            ))}
          </DataTable>
        )}
      </div>
    </div>
  );
}
