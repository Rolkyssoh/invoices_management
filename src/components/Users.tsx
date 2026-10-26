import { useState, useEffect } from "react";
import { Plus, Users as UsersIcon, Edit2, Trash2, AlertCircle, Check, XCircle } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type { User, Company, CreateUserRequest, UpdateUserRequest, UserRole } from "../types";
import { validateRequired, validateEmail, USER_ROLES } from "../types";
import PageHeader from "./shared/PageHeader";
import { SearchBar, DataTable, TableCell, ActionCell, FormModal } from "./shared";

export default function Users() {
  const { companyId, user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";
  const canCreate = isAdmin || isManager;
  const canEdit = isAdmin || isManager;
  const canDelete = (targetUser: User) => {
    if (isAdmin) return true;
    if (isManager) return targetUser.role === "user" && targetUser.company_id === companyId;
    return false;
  };
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState<CreateUserRequest & { password: string }>({
    company_id: "",
    name: "",
    email: "",
    password_hash: "",
    password: "",
    role: "user",
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, [companyId, currentUser]);

  const loadData = async () => {
    if (!companyId || !currentUser) return;

    try {
      setIsLoading(true);
      const [usersData, companiesData] = await Promise.all([
        api.users.getAll(),
        api.companies.getAll(),
      ]);
      // Filter users by company_id (admins see all, others see only their company)
      if (isAdmin) {
        setUsers(usersData);
        setCompanies(companiesData);
      } else {
        setUsers(usersData.filter(u => u.company_id === companyId));
        setCompanies(companiesData.filter(c => c.id === companyId));
      }
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
      newErrors.push("Le nom est requis");
    }
    if (!validateRequired(formData.email)) {
      newErrors.push("L'email est requis");
    } else if (!validateEmail(formData.email)) {
      newErrors.push("L'email n'est pas valide");
    }
    if (!editingUser && !validateRequired(formData.password)) {
      newErrors.push("Le mot de passe est requis");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (!companyId) {
        setErrors(["Erreur: utilisateur non connecté"]);
        return;
      }

      // For non-admins, use current user's company; admins can select any company from the form
      const effectiveCompanyId = isAdmin ? formData.company_id : companyId;

      if (editingUser) {
        const updateData: UpdateUserRequest = {
          company_id: effectiveCompanyId,
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          is_active: formData.is_active,
        };
        await api.users.update(editingUser.id, updateData);
      } else {
        const createData: CreateUserRequest = {
          company_id: effectiveCompanyId,
          name: formData.name,
          email: formData.email,
          password_hash: formData.password,
          role: formData.role,
          is_active: formData.is_active,
        };
        await api.users.create(createData);
      }

      setShowModal(false);
      setEditingUser(null);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Error saving user:", error);
      setErrors(["Une erreur est survenue lors de l'enregistrement"]);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      company_id: user.company_id,
      name: user.name,
      email: user.email,
      password_hash: "",
      password: "",
      role: user.role as UserRole,
      is_active: user.is_active,
    });
    setErrors([]);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;

    try {
      await api.users.delete(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      company_id: companies[0]?.id || "",
      name: "",
      email: "",
      password_hash: "",
      password: "",
      role: "user",
      is_active: true,
    });
    setErrors([]);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const getCompanyName = (id: string) => {
    return companies.find((c) => c.id === id)?.name || "-";
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        subtitle={isAdmin ? "Gérez tous les utilisateurs" : "Gérez les utilisateurs de votre entreprise"}
        actionLabel={canCreate ? "Nouvel utilisateur" : undefined}
        onAction={canCreate ? openCreateModal : undefined}
        actionIcon={canCreate ? <Plus size={18} /> : undefined}
      />

      <SearchBar
        placeholder="Rechercher un utilisateur..."
        value={searchTerm}
        onChange={setSearchTerm}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-300" />
            <p className="text-gray-500 mt-4">
              {searchTerm ? "Aucun utilisateur trouvé" : "Aucun utilisateur pour le moment"}
            </p>
          </div>
        ) : (
          <DataTable headers={["Nom", "Entreprise", "Email", "Rôle", "Statut", "Actions"]}>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/80">
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{getCompanyName(user.company_id)}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex ${
                    user.role === "admin" ? "bg-purple-100 text-purple-700" :
                    user.role === "manager" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>
                  {user.is_active ? (
                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                      <Check size={14} /> Actif
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-500 text-xs font-medium">
                      <XCircle size={14} /> Inactif
                    </span>
                  )}
                </TableCell>
                <ActionCell>
                  <div className="flex items-center gap-2">
                    {/* Edit: Admins and managers can edit users in their company */}
                    {canEdit && (isAdmin || user.company_id === companyId) && user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                        title="Modifier"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {/* Delete: Based on role permissions, cannot delete self */}
                    {canDelete(user) && user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(user.id)}
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

      {showModal && (
        <FormModal
          title={editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          submitLabel={editingUser ? "Enregistrer" : "Créer"}
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

          {/* Company selection: Admins can choose any, managers are limited to their company */}
          {isAdmin && (
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
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Nom complet *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              placeholder="Ex: Jean Dupont"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              placeholder="utilisateur@email.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Rôle *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              >
                {/* Managers can only create regular users, admins can create any role */}
                {isAdmin ? (
                  USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role === "admin" ? "Administrateur" :
                      role === "manager" ? "Manager" : "Utilisateur"}
                    </option>
                  ))
                ) : (
                  <option value="user">Utilisateur</option>
                )}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Statut</label>
              <select
                value={formData.is_active ? "true" : "false"}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "true" })}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              >
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Mot de passe {editingUser && "(laisser vide pour ne pas changer)"}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm"
              placeholder={editingUser ? "••••••••" : "Entrez un mot de passe"}
            />
          </div>
        </FormModal>
      )}
    </div>
  );
}
