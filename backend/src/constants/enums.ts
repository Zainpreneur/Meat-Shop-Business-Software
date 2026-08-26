// SQLite has no native enum support in Prisma, so enum-like fields are stored
// as plain strings in the schema. These const objects give the app the same
// type-safe, autocomplete-friendly enum experience Prisma would otherwise
// generate, and are the single source of truth for valid string values.

export const Role = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Unit = {
  KG: "KG",
  GRAM: "GRAM",
  PIECE: "PIECE",
  DOZEN: "DOZEN",
} as const;
export type Unit = (typeof Unit)[keyof typeof Unit];

export const PurchaseStatus = {
  PENDING: "PENDING",
  RECEIVED: "RECEIVED",
  CANCELLED: "CANCELLED",
} as const;
export type PurchaseStatus = (typeof PurchaseStatus)[keyof typeof PurchaseStatus];

export const SaleStatus = {
  COMPLETED: "COMPLETED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
} as const;
export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus];

export const PaymentMethod = {
  CASH: "CASH",
  CARD: "CARD",
  MOBILE_MONEY: "MOBILE_MONEY",
  CREDIT: "CREDIT",
  BANK_TRANSFER: "BANK_TRANSFER",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const StockMovementType = {
  PURCHASE_IN: "PURCHASE_IN",
  SALE_OUT: "SALE_OUT",
  ADJUSTMENT: "ADJUSTMENT",
  WASTAGE: "WASTAGE",
  RETURN_IN: "RETURN_IN",
} as const;
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];

function enumValues<T extends Record<string, string>>(e: T): [string, ...string[]] {
  const values = Object.values(e);
  return values as [string, ...string[]];
}

export const roleValues = enumValues(Role);
export const unitValues = enumValues(Unit);
export const purchaseStatusValues = enumValues(PurchaseStatus);
export const saleStatusValues = enumValues(SaleStatus);
export const paymentMethodValues = enumValues(PaymentMethod);
export const stockMovementTypeValues = enumValues(StockMovementType);
