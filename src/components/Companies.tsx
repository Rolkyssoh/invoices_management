import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Building2, AlertCircle, Upload } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from "../types";
import { validateRequired, validateEmail } from "../types";
import { SearchBar, DataTable, TableCell, ActionCell, FormModal } from "./shared";
import PageHeader from "./shared/PageHeader";

export default function Companies() {
  const { companyId, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const canEdit = isAdmin || isManager;
  const canDelete = isAdmin;
  const canCreate = isAdmin;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<CreateCompanyRequest>({
    name: "",
    logo_url: "",
    address: "",
    phone1: "",
    phone2: "",
    phone3: "",
    ice: "",
    capital: "",
    tax_pro_number: "",
    register_number: "",
    rib_number: "",
    email: "",
    tax_number: "",
    currency: "EUR",
  });
  const [showOptionalPhones, setShowOptionalPhones] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, [companyId]);

  // Cleanup object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const loadCompanies = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      const data = await api.companies.getAll();
      // Admins see all companies, managers and users see only their company
      if (isAdmin) {
        setCompanies(data);
      } else {
        setCompanies(data.filter(c => c.id === companyId));
      }
    } catch (error) {
      console.error("Error loading companies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    
    if (!validateRequired(formData.name)) {
      newErrors.push("Le nom de l'entreprise est requis");
    }
    if (!validateRequired(formData.email)) {
      newErrors.push("L'email est requis");
    } else if (!validateEmail(formData.email)) {
      newErrors.push("L'email n'est pas valide");
    }
    if (!validateRequired(formData.address)) {
      newErrors.push("L'adresse est requise");
    }
    if (!validateRequired(formData.phone1)) {
      newErrors.push("Le téléphone 1 est requis");
    }
    if (!validateRequired(formData.tax_number)) {
      newErrors.push("L'Identification Fiscale (IF) est requis");
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Use object URL for preview (works better with Tauri CSP)
      const objectUrl = URL.createObjectURL(file);
      setLogoPreview(objectUrl);
    }
  };

  const uploadLogo = async (companyId: string): Promise<string> => {
    if (!logoFile) return formData.logo_url;
    
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
    });
    reader.readAsDataURL(logoFile);
    const base64 = await base64Promise;
    
    const logoPath = await invoke<string>("upload_company_logo", {
      companyId,
      imageBase64: base64,
    });
    return logoPath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      let logoUrl = formData.logo_url;
      
      if (editingCompany) {
        // Upload logo if changed
        if (logoFile) {
          logoUrl = await uploadLogo(editingCompany.id);
        }
        await api.companies.update(editingCompany.id, { ...formData, logo_url: logoUrl } as UpdateCompanyRequest);
      } else {
        // Create company first to get ID
        const newCompany = await api.companies.create(formData);
        // Then upload logo with the new company ID
        if (logoFile) {
          logoUrl = await uploadLogo(newCompany.id);
          await api.companies.update(newCompany.id, { ...formData, logo_url: logoUrl } as UpdateCompanyRequest);
        }
      }
      
      setShowModal(false);
      setEditingCompany(null);
      resetForm();
      await loadCompanies();
    } catch (error) {
      console.error("Error saving company:", error);
      setErrors(["Une erreur est survenue lors de l'enregistrement"]);
    }
  };

  const handleEdit = async (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      logo_url: company.logo_url,
      address: company.address,
      phone1: company.phone1,
      phone2: company.phone2,
      phone3: company.phone3,
      ice: company.ice,
      capital: company.capital || "",
      tax_pro_number: company.tax_pro_number,
      register_number: company.register_number,
      rib_number: company.rib_number,
      email: company.email,
      tax_number: company.tax_number,
      currency: company.currency,
    });
    setShowOptionalPhones(!!company.phone2 || !!company.phone3);
    
    // Load logo as base64 for preview if it's a local file
    if (company.logo_url && !company.logo_url.startsWith('http')) {
      try {
        const logoBase64 = await invoke<string>('get_company_logo_base64', { logoPath: company.logo_url });
        setLogoPreview(logoBase64);
      } catch {
        setLogoPreview(null);
      }
    } else {
      setLogoPreview(company.logo_url || null);
    }
    
    setLogoFile(null);
    setErrors([]);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    // Prevent deleting own company
    if (id === companyId) {
      alert("Vous ne pouvez pas supprimer votre propre entreprise");
      return;
    }
    
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette entreprise ?")) return;
    
    try {
      await api.companies.delete(id);
      await loadCompanies();
    } catch (error) {
      console.error("Error deleting company:", error);
      alert("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      logo_url: "",
      address: "",
      phone1: "",
      phone2: "",
      phone3: "",
      ice: "",
      capital: "",
      tax_pro_number: "",
      register_number: "",
      rib_number: "",
      email: "",
      tax_number: "",
      currency: "EUR",
    });
    setShowOptionalPhones(false);
    setLogoFile(null);
    setLogoPreview(null);
    setErrors([]);
  };

  const openCreateModal = () => {
    setEditingCompany(null);
    resetForm();
    setShowModal(true);
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tax_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Entreprises"
        subtitle={isAdmin ? "Gérez toutes les entreprises" : "Votre entreprise"}
        actionLabel={canCreate ? "Nouvelle entreprise" : undefined}
        onAction={canCreate ? openCreateModal : undefined}
        actionIcon={canCreate ? <Plus size={18} /> : undefined}
      />

      {/* Search */}
      <SearchBar
        placeholder="Rechercher une entreprise..."
        value={searchTerm}
        onChange={setSearchTerm}
      />

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-300" />
            <p className="text-gray-500 mt-4">
              {searchTerm ? "Aucune entreprise trouvée" : "Aucune entreprise pour le moment"}
            </p>
            {!searchTerm && canCreate && (
              <button onClick={openCreateModal} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm rounded-lg font-medium transition-all duration-200 inline-flex items-center gap-2 cursor-pointer mt-4">
                <Plus size={18} />
                <span>Créer une entreprise</span>
              </button>
            )}
          </div>
        ) : (
          <DataTable headers={["Nom", "Email", "Téléphone", "IF", "Capital", "Devise", "Actions"]}>
            {filteredCompanies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50/80">
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.email}</TableCell>
                <TableCell>{company.phone1}</TableCell>
                <TableCell>{company.tax_number}</TableCell>
                <TableCell>{company.capital || '-'}</TableCell>
                <TableCell>{company.currency}</TableCell>
                <ActionCell>
                  <div className="flex items-center gap-2">
                    {/* Edit: Admins can edit all, managers can edit their own company, users are read-only */}
                    {canEdit && company.id === companyId && (
                      <button
                        onClick={() => handleEdit(company)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                        title="Modifier"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {/* Delete: Only admins can delete, and not their own company */}
                    {canDelete && company.id !== companyId && (
                      <button
                        onClick={() => handleDelete(company.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </ActionCell>
              </tr>
            ))}
          </DataTable>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <FormModal
          title={editingCompany ? "Modifier l'entreprise" : "Nouvelle entreprise"}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          submitLabel={editingCompany ? "Enregistrer" : "Créer"}
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
                <label className="text-sm font-medium text-gray-700">Nom de l'entreprise *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                  placeholder="Ex: Ma Société SARL"
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
                    placeholder="contact@entreprise.com"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Téléphone 1 *</label>
                  <input
                    type="tel"
                    value={formData.phone1}
                    onChange={(e) => setFormData({ ...formData, phone1: e.target.value })}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>
              </div>

              {/* Optional phone numbers toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOptionalPhones(!showOptionalPhones)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showOptionalPhones ? '- Masquer les téléphones optionnels' : '+ Ajouter d\'autres téléphones'}
                </button>
              </div>

              {showOptionalPhones && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">Téléphone 2</label>
                    <input
                      type="tel"
                      value={formData.phone2}
                      onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                      placeholder="+33 1 23 45 67 90"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">Téléphone 3</label>
                    <input
                      type="tel"
                      value={formData.phone3}
                      onChange={(e) => setFormData({ ...formData, phone3: e.target.value })}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                      placeholder="+33 1 23 45 67 91"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Adresse *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                  placeholder="123 Rue Principale, 75000 Paris"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">ICE</label>
                <input
                  type="text"
                  value={formData.ice}
                  onChange={(e) => setFormData({ ...formData, ice: e.target.value })}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                  placeholder="001234567890123"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Identification Fiscale (IF) *</label>
                  <input
                    type="text"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                    placeholder="FR12345678901"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Capital social</label>
                  <input
                    type="text"
                    value={formData.capital}
                    onChange={(e) => setFormData({ ...formData, capital: e.target.value })}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                    placeholder="1000000 DH"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">N° Taxe Professionnelle</label>
                  <input
                    type="text"
                    value={formData.tax_pro_number}
                    onChange={(e) => setFormData({ ...formData, tax_pro_number: e.target.value })}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                    placeholder="25115921"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">N° Registre</label>
                  <input
                    type="text"
                    value={formData.register_number}
                    onChange={(e) => setFormData({ ...formData, register_number: e.target.value })}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                    placeholder="196607"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">RIB</label>
                  <input
                    type="text"
                    value={formData.rib_number}
                    onChange={(e) => setFormData({ ...formData, rib_number: e.target.value })}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                    placeholder="007 810 0001599000004223 09"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Devise</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF (Fr)</option>
                    <option value="MAD">MAD (Ma)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Logo</label>
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="w-16 h-16 object-contain border border-gray-200 rounded-lg"
                    />
                  )}
                  <label className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-all text-sm">
                    <Upload size={16} />
                    <span>{logoFile ? logoFile.name : 'Choisir un fichier'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
        </FormModal>
      )}
    </div>
  );
}
