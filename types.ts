export enum PaymentStatus {
  PAID = "Paid",
  PARTIAL = "Partial",
  UNPAID = "Unpaid",
}

export enum DeliveryStatus {
  PENDING = "Pending",
  SCHEDULED = "Scheduled",
  DELIVERED = "Delivered",
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  type: "Regular" | "VIP" | "New" | "Individual" | "Contractor";
  walletBalance: number;
  totalDues: number;
  lastActive: string;
  email?: string;
  address?: string;
  total_purchases?: number;
  outstanding_balance?: number;
  wallet_balance?: number;
}

export interface Product {
  id: string;
  name: string;
  type: "Brick" | "Material";
  stock: number;
  rate: number;
  unit: string;
}

export interface SaleItem {
  productId?: string;
  productName?: string;
  name?: string;
  quantity: number;
  rate?: number;
  price?: number;
  amount: number;
  item_name?: string;
  unit_price?: number;
  total_price?: number;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  items: SaleItem[];
  totalAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  paymentType?:
    | "Cash"
    | "Credit"
    | "Advance + Cash"
    | "Full Advance"
    | "Dues + Cash";
  paymentMode?: string;
  advancePaid?: number;
  dueAmount?: number;
  balanceDue?: number;
  status?: string;
  notes?: string;
  sale_date?: string;
  original_id?: string;
  product_name?: string;
  category?: string;
  due_date?: string;
  discount_type?: string;
  discount_value?: number;
}

export interface Expense {
  id: string;
  category: "Fuel" | "Maintenance" | "Salary" | "Raw Material" | "Other";
  amount: number;
  description: string;
  date: string;
}

export interface Delivery {
  id: string;
  saleId: string;
  customerName: string;
  address: string;
  status: DeliveryStatus;
  truckNumber?: string;
  driverName?: string;
  date: string;
}

// --- New Types for Accounts System ---

export interface Location {
  id: string;
  name: string;
}

export type CategoryType = "PEOPLE" | "LEDGER";

export interface Category {
  id: string;
  name: string;
  locationId: string;
  type: CategoryType;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT"; // Credit: Wallet +, Debit: Due +
}

export interface Account {
  id: string;
  name: string;
  walletBalance: number;
  dueBalance: number;
  joiningDate: string;
  categoryId: string;
  locationId: string;
  transactions: Transaction[];
}

export interface NewAccount {
  name: string;
  walletBalance: number;
  dueBalance: number;
  joiningDate: string;
}

export type BulkImportMode = "ACCOUNTS" | "TRANSACTIONS";

export interface BulkTransactionData {
  name: string; // Can be empty if importing to specific account
  amount: number;
  date: string;
  note: string;
}

// Store Context Types
export interface StoreContextType {
  customers: Customer[];
  sales: Sale[];
  deliveries: Delivery[];
  products: Product[];
  expenses: Expense[];
  addCustomer: (customer: Customer) => Promise<Customer>;
  addSale: (sale: Sale) => Promise<Sale>;
  deleteSale: (saleId: string) => Promise<boolean>;
  refreshCustomers: () => Promise<void>;
  refreshSales: () => Promise<void>;
  isLoading: boolean;
}
