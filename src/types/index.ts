// ERP Invoices - TypeScript Types
// Types matching Rust backend structs

export interface Company {
  id: string;
  name: string;
  logo_url: string;
  address: string;
  phone1: string;
  phone2: string;
  phone3: string;
  ice: string
  capital: string | null;
  tax_pro_number: string
  register_number: string
  rib_number: string
  email: string;
  tax_number: string;
  currency: string;
  created_at: string;
}

export interface CreateCompanyRequest {
  name: string;
  logo_url: string;
  address: string;
  phone1: string;
  phone2?: string;
  phone3?: string;
  ice?: string;
  capital?: string;
  tax_pro_number?: string;
  register_number?: string;
  rib_number?: string;
  email: string;
  tax_number: string;
  currency: string;
}

export interface UpdateCompanyRequest {
  name: string;
  logo_url: string;
  address: string;
  phone1: string;
  phone2?: string;
  phone3?: string;
  ice?: string;
  capital?: string;
  tax_pro_number?: string;
  register_number?: string;
  rib_number?: string;
  email: string;
  tax_number: string;
  currency: string;
}

export interface User {
  id: string;
  company_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  is_first_login: boolean;
  created_at: string;
}

export interface CreateUserRequest {
  company_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  is_first_login?: boolean;
}

export interface UpdateUserRequest {
  company_id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  is_active: boolean;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tax_number: string;
  created_at: string;
}

export interface CreateClientRequest {
  company_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tax_number: string;
}

export interface UpdateClientRequest {
  company_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tax_number: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  client_id: string;
  created_by: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total: number;
  notes: string;
  created_at: string;
}

export interface CreateInvoiceRequest {
  company_id: string;
  client_id: string;
  created_by: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total: number;
  notes: string;
}

export interface UpdateInvoiceRequest {
  company_id: string;
  client_id: string;
  created_by: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total: number;
  notes: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price_ht: number;
}

export interface CreateInvoiceItemRequest {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price_ht: number;
}

export interface UpdateInvoiceItemRequest {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price_ht: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  recorded_by: string;
  amount: number;
  method: string;
  payment_date: string;
  reference: string;
  notes: string;
  created_at: string;
}

export interface CreatePaymentRequest {
  invoice_id: string;
  recorded_by: string;
  amount: number;
  method: string;
  payment_date: string;
  reference: string;
  notes: string;
}

export interface UpdatePaymentRequest {
  invoice_id: string;
  recorded_by: string;
  amount: number;
  method: string;
  payment_date: string;
  reference: string;
  notes: string;
}

// Authentication types
export interface LoggedInUser {
  id: string;
  company_id: string;
  name: string;
  email: string;
  role: string;
  is_first_login: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user: LoggedInUser | null;
  message: string;
}

export interface AuthStatus {
  is_authenticated: boolean;
  user: LoggedInUser | null;
}

// First time setup types
export interface InitialSetupResponse {
  needs_setup: boolean;
  default_email: string | null;
  default_password: string | null;
}

export interface UpdateDefaultUserRequest {
  user_name: string;
  user_email: string;
  user_password: string;
}

export interface UpdateDefaultCompanyRequest {
  company_name: string;
  company_address: string;
  company_phone1: string;
  company_capital?: string;
  company_ice?: string;
  company_email: string;
  company_tax_number: string;
  company_currency: string;
}

// Utility types
export type Entity = 'companies' | 'users' | 'clients' | 'invoices' | 'invoice-items' | 'payments';

export const INVOICE_STATUSES = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'] as const;
export const USER_ROLES = ['admin', 'manager', 'user'] as const;
export const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'check', 'other'] as const;
export type InvoiceStatus = typeof INVOICE_STATUSES[number];
export type UserRole = typeof USER_ROLES[number];
export type PaymentMethod = typeof PAYMENT_METHODS[number];

// Utility functions
export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const getInitials = (name: string): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    partially_paid: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-red-100 text-red-700',
  };
  return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-700';
};

export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
};

export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const getDueDate = (days: number = 30): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateRequired = (value: string): boolean => {
  return value?.trim().length > 0;
};

export const generateId = (): string => {
  return crypto.randomUUID();
};
