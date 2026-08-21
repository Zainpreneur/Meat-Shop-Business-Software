export type Role = "ADMIN" | "MANAGER" | "CASHIER";
export type Unit = "KG" | "GRAM" | "PIECE" | "DOZEN";
export type PurchaseStatus = "PENDING" | "RECEIVED" | "CANCELLED";
export type SaleStatus = "COMPLETED" | "REFUNDED" | "CANCELLED";
export type PaymentMethod = "CASH" | "CARD" | "MOBILE_MONEY" | "CREDIT" | "BANK_TRANSFER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  category?: Category | null;
  unit: Unit;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  reorderLevel: number;
  imageUrl?: string | null;
  active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  _count?: { purchases: number };
}

export interface PurchaseItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  reference: string;
  supplierId: string;
  supplier?: Supplier;
  user?: { id: string; name: string };
  status: PurchaseStatus;
  orderDate: string;
  receivedAt?: string | null;
  totalAmount: number;
  notes?: string | null;
  items: PurchaseItem[];
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  creditBalance: number;
  _count?: { sales: number };
}

export interface SaleItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  reference: string;
  customerId?: string | null;
  customer?: Customer | null;
  user?: { id: string; name: string };
  saleDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  notes?: string | null;
  items: SaleItem[];
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  user?: { id: string; name: string };
}

export interface DashboardSummary {
  todayRevenue: number;
  todayOrders: number;
  monthRevenue: number;
  monthOrders: number;
  monthExpenseTotal: number;
  monthProfit: number;
  totalProducts: number;
  lowStockCount: number;
  revenueTrend: { date: string; revenue: number }[];
  topProducts: { productId: string; name: string; unit: Unit; quantity: number; revenue: number }[];
  lowStockProducts: Product[];
  recentSales: Sale[];
}
