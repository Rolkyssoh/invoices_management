import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, UserCircle, AlertCircle } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type { Client, Company, CreateClientRequest, UpdateClientRequest } from "../types";
import { validateRequired, validateEmail } from "../types";
import { ActionCell, DataTable, FormModal, SearchBar, TableCell } from "./shared";
import PageHeader from "./shared/PageHeader";

export default function Clients() {
  const { companyId } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState<CreateClientRequest>({
    company_id: companyId || "",
    name: "",
    email: "",
    phone: "",
    address: "",
    tax_number: "",
  });

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      const [clientsData, companiesData] = await Promise.all([
        api.clients.getAll(),
        api.companies.getAll(),
      ]);
      // Filter clients by company_id
      setClients(clientsData.filter(c => c.company_id === companyId));
      // Only show current user's company
      setCompanies(companiesData.filter(c => c.id === companyId));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!validateRequired(formData.company_id)) {
      newErrors.push("Veuillez sélectionner une entreprise");
    }
    if (!validateRequired(formData.name)) {
      newErrors.push("Le nom du client est requis");
    }
    if (!validateRequired(formData.email)) {
      newErrors.push("L'email est requis");
    } else if (!validateEmail(formData.email)) {
      newErrors.push("L'email n'est pas valide");
    }
    if (!validateRequired(formData.phone)) {
      newErrors.push("Le téléphone est requis");
    }
    if (!validateRequired(formData.address)) {
      newErrors.push("L'adresse est requise");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!companyId) {
      setErrors(["Erreur: utilisateur non connecté"]);
      return;
    }

    try {
      // Ensure company_id is set to the current user's company
      const dataWithCompany = {
        ...formData,
        company_id: companyId,
      };

      if (editingClient) {
        await api.clients.update(editingClient.id, dataWithCompany as UpdateClientRequest);
      } else {
        await api.clients.create(dataWithCompany);
      }

      setShowModal(false);
      setEditingClient(null);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Error saving client:", error);
      setErrors(["Une erreur est survenue lors de l'enregistrement"]);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      company_id: client.company_id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      tax_number: client.tax_number,
    });
    setErrors([]);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return;

    try {
      await api.clients.delete(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      company_id: companyId || "",
      name: "",
      email: "",
      phone: "",
      address: "",
      tax_number: "",
    });
    setErrors([]);
  };

  const openCreateModal = () => {
    setEditingClient(null);
    resetForm();
    setShowModal(true);
  };

  const getCompanyName = (id: string) => {
    return companies.find((c) => c.id === id)?.name || "-";
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tax_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle="Gérez vos clients"
        actionLabel="Nouveau client"
        onAction={openCreateModal}
        actionIcon={<Plus size={18} />}
      />

      <SearchBar
        placeholder="Rechercher un client..."
        value={searchTerm}
        onChange={setSearchTerm}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <UserCircle className="mx-auto h-12 w-12 text-gray-300" />
            <p className="text-gray-500 mt-4">
              {searchTerm ? "Aucun client trouvé" : "Aucun client pour le moment"}
            </p>
          </div>
        ) : (
          <DataTable headers={["Nom", "Entreprise", "Email", "Téléphone", "IF", "Actions"]}>
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50/80">
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{getCompanyName(client.company_id)}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>{client.tax_number || "-"}</TableCell>
                <ActionCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(client)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
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
          title={editingClient ? "Modifier le client" : "Nouveau client"}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          submitLabel={editingClient ? "Enregistrer" : "Créer"}
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

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Entreprise *</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                >
                  <option value="">Sélectionner une entreprise</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Nom du client *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                  placeholder="Ex: Jean Dupont"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                    placeholder="client@email.com"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Téléphone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Adresse *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                  placeholder="Adresse complète"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Identification Fiscale(IF)</label>
                <input
                  type="text"
                  value={formData.tax_number}
                  onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                  placeholder="FR12345678901"
                />
              </div>
        </FormModal>
      )}
    </div>
  );
}
