import { invoke } from "@tauri-apps/api/core";
import type {
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  InvoiceItem,
  CreateInvoiceItemRequest,
  UpdateInvoiceItemRequest,
  Payment,
  CreatePaymentRequest,
  UpdatePaymentRequest,
  LoginRequest,
  LoginResponse,
  AuthStatus,
  InitialSetupResponse,
  UpdateDefaultUserRequest,
  UpdateDefaultCompanyRequest,
} from "../types";

// Companies API
export const companyApi = {
  create: async (request: CreateCompanyRequest): Promise<Company> => {
    return await invoke("create_company", { request });
  },

  getAll: async (): Promise<Company[]> => {
    return await invoke("get_all_companies");
  },

  getById: async (id: string): Promise<Company | null> => {
    return await invoke("get_company_by_id", { id });
  },

  update: async (id: string, request: UpdateCompanyRequest): Promise<Company> => {
    return await invoke("update_company", { id, request });
  },

  delete: async (id: string): Promise<boolean> => {
    return await invoke("delete_company", { id });
  },
};

// Users API
export const userApi = {
  create: async (request: CreateUserRequest): Promise<User> => {
    return await invoke("create_user", { request });
  },

  getAll: async (): Promise<User[]> => {
    return await invoke("get_all_users");
  },

  getById: async (id: string): Promise<User | null> => {
    return await invoke("get_user_by_id", { id });
  },

  update: async (id: string, request: UpdateUserRequest): Promise<User> => {
    return await invoke("update_user", { id, request });
  },

  delete: async (id: string): Promise<boolean> => {
    return await invoke("delete_user", { id });
  },
};

// Clients API
export const clientApi = {
  create: async (request: CreateClientRequest): Promise<Client> => {
    return await invoke("create_client", { request });
  },

  getAll: async (): Promise<Client[]> => {
    return await invoke("get_all_clients");
  },

  getById: async (id: string): Promise<Client | null> => {
    return await invoke("get_client_by_id", { id });
  },

  update: async (id: string, request: UpdateClientRequest): Promise<Client> => {
    return await invoke("update_client", { id, request });
  },

  delete: async (id: string): Promise<boolean> => {
    return await invoke("delete_client", { id });
  },
};

// Invoices API
export const invoiceApi = {
  create: async (request: CreateInvoiceRequest): Promise<Invoice> => {
    return await invoke("create_invoice", { request });
  },

  getAll: async (): Promise<Invoice[]> => {
    return await invoke("get_all_invoices");
  },

  getById: async (id: string): Promise<Invoice | null> => {
    return await invoke("get_invoice_by_id", { id });
  },

  update: async (id: string, request: UpdateInvoiceRequest): Promise<Invoice> => {
    return await invoke("update_invoice", { id, request });
  },

  delete: async (id: string): Promise<boolean> => {
    return await invoke("delete_invoice", { id });
  },
};

// Invoice Items API
export const invoiceItemApi = {
  create: async (request: CreateInvoiceItemRequest): Promise<InvoiceItem> => {
    return await invoke("create_invoice_item", { request });
  },

  getAll: async (): Promise<InvoiceItem[]> => {
    return await invoke("get_all_invoice_items");
  },

  getById: async (id: string): Promise<InvoiceItem | null> => {
    return await invoke("get_invoice_item_by_id", { id });
  },

  update: async (id: string, request: UpdateInvoiceItemRequest): Promise<InvoiceItem> => {
    return await invoke("update_invoice_item", { id, request });
  },

  delete: async (id: string): Promise<boolean> => {
    return await invoke("delete_invoice_item", { id });
  },
};

// Payments API
export const paymentApi = {
  create: async (request: CreatePaymentRequest): Promise<Payment> => {
    return await invoke("create_payment", { request });
  },

  getAll: async (): Promise<Payment[]> => {
    return await invoke("get_all_payments");
  },

  getById: async (id: string): Promise<Payment | null> => {
    return await invoke("get_payment_by_id", { id });
  },

  update: async (id: string, request: UpdatePaymentRequest): Promise<Payment> => {
    return await invoke("update_payment", { id, request });
  },

  delete: async (id: string): Promise<boolean> => {
    return await invoke("delete_payment", { id });
  },
};

// Authentication API
export const authApi = {
  login: async (request: LoginRequest): Promise<LoginResponse> => {
    return await invoke("login", { request });
  },

  logout: async (): Promise<boolean> => {
    return await invoke("logout");
  },

  checkAuth: async (): Promise<AuthStatus> => {
    return await invoke("check_auth");
  },

  getCurrentUserCompanyId: async (): Promise<string | null> => {
    return await invoke("get_current_user_company_id");
  },

  checkInitialSetup: async (): Promise<InitialSetupResponse> => {
    return await invoke("check_initial_setup");
  },

  updateDefaultUser: async (request: UpdateDefaultUserRequest): Promise<boolean> => {
    return await invoke("update_default_user", { request });
  },

  updateDefaultCompany: async (request: UpdateDefaultCompanyRequest): Promise<boolean> => {
    return await invoke("update_default_company", { request });
  },
};

// Export all APIs
export const api = {
  companies: companyApi,
  users: userApi,
  clients: clientApi,
  invoices: invoiceApi,
  invoiceItems: invoiceItemApi,
  payments: paymentApi,
  auth: authApi,
};

export default api;
