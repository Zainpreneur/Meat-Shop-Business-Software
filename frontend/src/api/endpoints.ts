import { api } from "./client";
import type {
  Category,
  Customer,
  DashboardSummary,
  Expense,
  Product,
  Purchase,
  Sale,
  Supplier,
  User,
} from "../types";

// ---- Auth ----
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>("/auth/login", { email, password }).then((r) => r.data),
  me: () => api.get<User>("/auth/me").then((r) => r.data),
};

// ---- Users ----
export const usersApi = {
  list: () => api.get<User[]>("/users").then((r) => r.data),
  create: (data: { name: string; email: string; password: string; role: string }) =>
    api.post<User>("/users", data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; role: string; active: boolean; password: string }>) =>
    api.put<User>(`/users/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/users/${id}`),
};

// ---- Categories ----
export const categoriesApi = {
  list: () => api.get<Category[]>("/categories").then((r) => r.data),
  create: (name: string) => api.post<Category>("/categories", { name }).then((r) => r.data),
  update: (id: string, name: string) => api.put<Category>(`/categories/${id}`, { name }).then((r) => r.data),
  remove: (id: string) => api.delete(`/categories/${id}`),
};

// ---- Products ----
export const productsApi = {
  list: (params?: { search?: string; categoryId?: string; lowStock?: boolean; active?: boolean }) =>
    api.get<Product[]>("/products", { params }).then((r) => r.data),
  get: (id: string) => api.get<Product>(`/products/${id}`).then((r) => r.data),
  create: (data: Partial<Product>) => api.post<Product>("/products", data).then((r) => r.data),
  update: (id: string, data: Partial<Product>) => api.put<Product>(`/products/${id}`, data).then((r) => r.data),
  adjustStock: (id: string, quantity: number, reason: string) =>
    api.post<Product>(`/products/${id}/adjust-stock`, { quantity, reason }).then((r) => r.data),
  remove: (id: string) => api.delete(`/products/${id}`),
};

// ---- Suppliers ----
export const suppliersApi = {
  list: (search?: string) => api.get<Supplier[]>("/suppliers", { params: { search } }).then((r) => r.data),
  get: (id: string) => api.get<Supplier & { purchases: Purchase[] }>(`/suppliers/${id}`).then((r) => r.data),
  create: (data: Partial<Supplier>) => api.post<Supplier>("/suppliers", data).then((r) => r.data),
  update: (id: string, data: Partial<Supplier>) => api.put<Supplier>(`/suppliers/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/suppliers/${id}`),
};

// ---- Purchases ----
export const purchasesApi = {
  list: (params?: { status?: string; supplierId?: string }) =>
    api.get<Purchase[]>("/purchases", { params }).then((r) => r.data),
  get: (id: string) => api.get<Purchase>(`/purchases/${id}`).then((r) => r.data),
  create: (data: { supplierId: string; notes?: string; items: { productId: string; quantity: number; unitCost: number }[] }) =>
    api.post<Purchase>("/purchases", data).then((r) => r.data),
  receive: (id: string) => api.post<Purchase>(`/purchases/${id}/receive`).then((r) => r.data),
  cancel: (id: string) => api.post<Purchase>(`/purchases/${id}/cancel`).then((r) => r.data),
};

// ---- Customers ----
export const customersApi = {
  list: (search?: string) => api.get<Customer[]>("/customers", { params: { search } }).then((r) => r.data),
  get: (id: string) => api.get<Customer & { sales: Sale[] }>(`/customers/${id}`).then((r) => r.data),
  create: (data: Partial<Customer>) => api.post<Customer>("/customers", data).then((r) => r.data),
  update: (id: string, data: Partial<Customer>) => api.put<Customer>(`/customers/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/customers/${id}`),
};

// ---- Sales ----
export const salesApi = {
  list: (params?: { from?: string; to?: string; customerId?: string; status?: string }) =>
    api.get<Sale[]>("/sales", { params }).then((r) => r.data),
  get: (id: string) => api.get<Sale>(`/sales/${id}`).then((r) => r.data),
  create: (data: {
    customerId?: string | null;
    discount?: number;
    tax?: number;
    paymentMethod: string;
    notes?: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
  }) => api.post<Sale>("/sales", data).then((r) => r.data),
  refund: (id: string) => api.post<Sale>(`/sales/${id}/refund`).then((r) => r.data),
};

// ---- Expenses ----
export const expensesApi = {
  list: (params?: { from?: string; to?: string; category?: string }) =>
    api.get<Expense[]>("/expenses", { params }).then((r) => r.data),
  create: (data: { category: string; description: string; amount: number; expenseDate?: string }) =>
    api.post<Expense>("/expenses", data).then((r) => r.data),
  update: (id: string, data: Partial<{ category: string; description: string; amount: number; expenseDate: string }>) =>
    api.put<Expense>(`/expenses/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/expenses/${id}`),
};

// ---- Dashboard ----
export const dashboardApi = {
  summary: () => api.get<DashboardSummary>("/dashboard/summary").then((r) => r.data),
};
