import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  Account,
  Category,
  Location,
  Transaction,
  NewAccount,
  BulkTransactionData,
  CategoryType,
  Customer,
  Product,
  Sale,
  Expense,
  Delivery,
  SaleItem,
  PaymentStatus,
  DeliveryStatus,
} from "../types";

// Define PaymentStatus values locally if they're not available as values from the types file
const PaymentStatusValues = {
  PENDING: "PENDING" as PaymentStatus,
  PARTIAL: "PARTIAL" as PaymentStatus,
  PAID: "PAID" as PaymentStatus,
};

interface AccountsContextType {
  // Existing properties
  locations: Location[];
  categories: Category[];
  accounts: Account[];
  isLoading: boolean;

  // New business properties
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  deliveries: Delivery[];
  dashboardStats: any;

  // Existing methods
  addLocation: (name: string) => void;
  addCategory: (locationId: string, name: string, type: CategoryType) => void;
  addAccount: (
    categoryId: string,
    locationId: string,
    account: NewAccount
  ) => void;
  addBulkAccounts: (
    categoryId: string,
    locationId: string,
    accountsData: NewAccount[]
  ) => void;
  addBulkTransactions: (
    categoryId: string,
    locationId: string,
    data: BulkTransactionData[],
    type: "CREDIT" | "DEBIT",
    targetAccountId?: string
  ) => void;
  deleteAccount: (accountId: string) => void;
  deleteCategory: (categoryId: string) => void;
  deleteBulkAccounts: (accountIds: string[]) => void;
  addTransaction: (
    accountId: string,
    transaction: Omit<Transaction, "id">
  ) => void;
  deleteTransaction: (accountId: string, transactionId: string) => void;
  updateTransaction: (accountId: string, transaction: Transaction) => void;

  // New business methods
  addCustomer: (customer: Omit<Customer, "id">) => Promise<void>;
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  addSale: (sale: Omit<Sale, "id">) => Promise<void>;
  addExpense: (expense: Omit<Expense, "id">) => Promise<void>;
  updateDeliveryStatus: (deliveryId: string, status: DeliveryStatus) => void;
  refreshDashboard: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshSales: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
}

const AccountsContext = createContext<AccountsContextType | undefined>(
  undefined
);

const API_URL = "https://brickbook-backend.vercel.app/api";

export const AccountsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New business states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>({});

  // Fetch All Initial Data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);

      // Fetch main data (your existing structure)
      const dataResponse = await fetch(`${API_URL}/data`);
      const data = await dataResponse.json();

      setLocations(data.locations || []);
      setCategories(data.categories || []);
      setAccounts(data.accounts || []);

      // Fetch new business data
      await fetchBusinessData();
    } catch (err) {
      console.error("Failed to connect to backend:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBusinessData = async () => {
    try {
      // Fetch dashboard stats
      await refreshDashboard();

      // Fetch customers
      await refreshCustomers();

      // Fetch inventory/products
      await refreshProducts();

      // Fetch sales
      await refreshSales();

      // Fetch expenses
      await refreshExpenses();
    } catch (error) {
      console.error("Error fetching business data:", error);
    }
  };

  const refreshDashboard = async () => {
    try {
      const statsResponse = await fetch(`${API_URL}/dashboard/stats`);
      const stats = await statsResponse.json();
      setDashboardStats(stats);
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    }
  };

  const refreshCustomers = async () => {
    try {
      const response = await fetch(`${API_URL}/customers`);
      const customersData = await response.json();
      setCustomers(
        customersData.map((customer: any) => ({
          id: customer.id.toString(),
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          walletBalance: customer.wallet_balance || 0,
          totalDues: customer.outstanding_balance || 0,
          lastActive:
            customer.created_at?.split("T")[0] ||
            new Date().toISOString().split("T")[0],
          type: "Regular", // You can customize this based on your business logic
        }))
      );
    } catch (error) {
      console.error("Error refreshing customers:", error);
    }
  };

  const refreshProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/inventory`);
      const inventoryData = await response.json();
      setProducts(
        inventoryData.map((item: any) => ({
          id: item.id.toString(),
          name: item.product_name,
          type: item.category,
          stock: item.quantity,
          rate: item.price,
          unit: "pc", // Default unit
        }))
      );
    } catch (error) {
      console.error("Error refreshing products:", error);
    }
  };

  const refreshSales = async () => {
    try {
      const response = await fetch(`${API_URL}/sales`);
      const salesData = await response.json();
      setSales(
        salesData.map((sale: any) => ({
          id: sale.id.toString(),
          customerId: sale.customer_id?.toString(),
          customerName: sale.customer_name,
          date:
            sale.sale_date?.split("T")[0] ||
            new Date().toISOString().split("T")[0],
          items: [], // You'll need to fetch sale items separately or enhance the API
          totalAmount: sale.total_amount,
          paidAmount: sale.paid_amount,
          paymentStatus:
            sale.balance_due === 0
              ? PaymentStatusValues.PAID
              : sale.paid_amount > 0
              ? PaymentStatusValues.PARTIAL
              : PaymentStatusValues.PENDING,
          deliveryStatus: DeliveryStatus.PENDING, // You can map this from your database
        }))
      );
    } catch (error) {
      console.error("Error refreshing sales:", error);
    }
  };

  const refreshExpenses = async () => {
    try {
      const response = await fetch(`${API_URL}/expenses`);
      const expensesData = await response.json();
      setExpenses(
        expensesData.map((expense: any) => ({
          id: expense.id.toString(),
          category: expense.category,
          amount: expense.amount,
          description: expense.description,
          date:
            expense.expense_date?.split("T")[0] ||
            new Date().toISOString().split("T")[0],
        }))
      );
    } catch (error) {
      console.error("Error refreshing expenses:", error);
    }
  };

  // --- YOUR EXISTING METHODS (Keep them exactly as they were) ---

  const addLocation = async (name: string) => {
    const newLocation: Location = { id: `loc_${Date.now()}`, name };
    setLocations((prev) => [...prev, newLocation]);
    try {
      await fetch(`${API_URL}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLocation),
      });
    } catch (error) {
      console.error("Error adding location", error);
    }
  };

  const addCategory = async (
    locationId: string,
    name: string,
    type: CategoryType
  ) => {
    const newCatId = `cat_${Date.now()}`;
    const newCategory: Category = { id: newCatId, name, locationId, type };
    setCategories((prev) => [...prev, newCategory]);

    // Handle Ledger Auto-Account Creation Logic
    let newAccount: Account | null = null;
    if (type === "LEDGER") {
      newAccount = {
        id: `acc_ledger_${Date.now()}`,
        name: `${name} Ledger`,
        walletBalance: 0,
        dueBalance: 0,
        joiningDate: new Date().toISOString().split("T")[0],
        categoryId: newCatId,
        locationId,
        transactions: [],
      };
      setAccounts((prev) => [...prev, newAccount]);
    }

    try {
      await fetch(`${API_URL}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });

      if (newAccount) {
        await fetch(`${API_URL}/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAccount),
        });
      }
    } catch (error) {
      console.error("Error adding category", error);
    }
  };

  const addAccount = async (
    categoryId: string,
    locationId: string,
    accountData: NewAccount
  ) => {
    const newAccount: Account = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...accountData,
      categoryId,
      locationId,
      transactions: [],
    };

    setAccounts((prev) => [...prev, newAccount]);

    try {
      await fetch(`${API_URL}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });
    } catch (error) {
      console.error("Error adding account", error);
    }
  };

  const addBulkAccounts = async (
    categoryId: string,
    locationId: string,
    accountsData: NewAccount[]
  ) => {
    const newAccounts: Account[] = accountsData.map((data) => ({
      id: `acc_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}_${Math.random()}`,
      name: data.name.trim(),
      walletBalance: data.walletBalance || 0,
      dueBalance: data.dueBalance || 0,
      joiningDate: data.joiningDate || new Date().toISOString().split("T")[0],
      categoryId,
      locationId,
      transactions: [],
    }));

    setAccounts((prev) => [...prev, ...newAccounts]);

    try {
      await fetch(`${API_URL}/accounts/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccounts),
      });
    } catch (error) {
      console.error("Error bulk adding accounts", error);
    }
  };

  const addBulkTransactions = async (
    categoryId: string,
    locationId: string,
    data: BulkTransactionData[],
    type: "CREDIT" | "DEBIT",
    targetAccountId?: string
  ) => {
    const timestamp = Date.now();

    // Prepare transaction payloads
    const txPayloads: any[] = [];

    // Optimistic Update
    setAccounts((prev) => {
      const updatedAccounts = [...prev];

      data.forEach((item, index) => {
        let accountIndex = -1;

        if (targetAccountId) {
          accountIndex = updatedAccounts.findIndex(
            (acc) => acc.id === targetAccountId
          );
        } else {
          accountIndex = updatedAccounts.findIndex(
            (acc) =>
              acc.categoryId === categoryId &&
              acc.name.toLowerCase() === item.name.toLowerCase().trim()
          );
        }

        if (accountIndex !== -1) {
          const acc = updatedAccounts[accountIndex];
          const amount = item.amount || 0;

          let updatedWallet = acc.walletBalance;
          let updatedDue = acc.dueBalance;

          if (type === "CREDIT") {
            updatedWallet += amount;
          } else {
            if (updatedWallet >= amount) {
              updatedWallet -= amount;
            } else {
              updatedDue += amount - updatedWallet;
              updatedWallet = 0;
            }
          }

          const description = targetAccountId
            ? item.name
              ? `${item.name} - ${item.note}`
              : item.note || "Bulk Entry"
            : item.note || "Bulk Entry";

          const newTx = {
            id: `tx_${timestamp}_${index}`,
            accountId: acc.id,
            date: item.date || new Date().toISOString().split("T")[0],
            description: description,
            amount: amount,
            type: type,
          };

          txPayloads.push(newTx);

          updatedAccounts[accountIndex] = {
            ...acc,
            walletBalance: updatedWallet,
            dueBalance: updatedDue,
            transactions: [newTx, ...acc.transactions],
          };
        }
      });
      return updatedAccounts;
    });

    // Send to Backend
    try {
      await fetch(`${API_URL}/transactions/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: txPayloads }),
      });
    } catch (error) {
      console.error("Error bulk adding transactions", error);
    }
  };

  const deleteAccount = async (accountId: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    try {
      await fetch(`${API_URL}/accounts/${accountId}`, { method: "DELETE" });
    } catch (error) {
      console.error("Error deleting account", error);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    // Optimistic update
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setAccounts((prev) => prev.filter((a) => a.categoryId !== categoryId));

    try {
      await fetch(`${API_URL}/categories/${categoryId}`, { method: "DELETE" });
    } catch (error) {
      console.error("Error deleting category", error);
    }
  };

  const deleteBulkAccounts = async (accountIds: string[]) => {
    setAccounts((prev) => prev.filter((a) => !accountIds.includes(a.id)));
    try {
      await fetch(`${API_URL}/accounts/delete-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: accountIds }),
      });
    } catch (error) {
      console.error("Error bulk deleting accounts", error);
    }
  };

  const addTransaction = async (
    accountId: string,
    transaction: Omit<Transaction, "id">
  ) => {
    const newTx = { ...transaction, id: `tx_${Date.now()}` };

    // Optimistic Update
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === accountId) {
          let updatedWallet = acc.walletBalance;
          let updatedDue = acc.dueBalance;

          if (transaction.type === "CREDIT") {
            updatedWallet += transaction.amount;
          } else {
            if (updatedWallet >= transaction.amount) {
              updatedWallet -= transaction.amount;
            } else {
              updatedDue += transaction.amount - updatedWallet;
              updatedWallet = 0;
            }
          }

          return {
            ...acc,
            walletBalance: updatedWallet,
            dueBalance: updatedDue,
            transactions: [newTx, ...acc.transactions],
          };
        }
        return acc;
      })
    );

    // API Call
    try {
      await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, ...newTx }),
      });
    } catch (error) {
      console.error("Error adding transaction", error);
    }
  };

  const deleteTransaction = async (
    accountId: string,
    transactionId: string
  ) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === accountId) {
          const tx = acc.transactions.find((t) => t.id === transactionId);
          if (!tx) return acc;

          let updatedWallet = acc.walletBalance;
          let updatedDue = acc.dueBalance;

          // Reverse Logic
          if (tx.type === "CREDIT") {
            updatedWallet -= tx.amount;
          } else {
            updatedDue -= tx.amount;
            if (updatedDue < 0) {
              updatedWallet += Math.abs(updatedDue);
              updatedDue = 0;
            }
          }

          const remainingTxs = acc.transactions.filter(
            (t) => t.id !== transactionId
          );
          return {
            ...acc,
            walletBalance: updatedWallet,
            dueBalance: updatedDue,
            transactions: remainingTxs,
          };
        }
        return acc;
      })
    );

    try {
      await fetch(`${API_URL}/transactions/${accountId}/${transactionId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error deleting transaction", error);
    }
  };

  const updateTransaction = (accountId: string, transaction: Transaction) => {
    console.warn(
      "Update Transaction not fully implemented in backend sync yet."
    );
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === accountId) {
          return {
            ...acc,
            transactions: acc.transactions.map((t) =>
              t.id === transaction.id ? transaction : t
            ),
          };
        }
        return acc;
      })
    );
  };

  // --- NEW BUSINESS METHODS ---

  const addCustomer = async (customerData: Omit<Customer, "id">) => {
    try {
      const response = await fetch(`${API_URL}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
          address: customerData.address,
        }),
      });

      await refreshCustomers();
      await refreshDashboard();
    } catch (error) {
      console.error("Error adding customer", error);
    }
  };

  const addProduct = async (productData: Omit<Product, "id">) => {
    try {
      const payload = {
        product_name: productData.name,
        product_code: `PROD_${Date.now()}`,
        category: productData.type,
        quantity: productData.stock,
        price: productData.rate,
        min_stock_level: 10,
        supplier: "Default Supplier",
      };

      const response = await fetch(`${API_URL}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await refreshProducts();
      await refreshDashboard();
    } catch (error) {
      console.error("Error adding product", error);
    }
  };

  const addSale = async (saleData: Omit<Sale, "id">) => {
    try {
      const salePayload = {
        customer_id: parseInt(saleData.customerId),
        items: saleData.items.map((item) => ({
          product_id: parseInt(item.productId),
          quantity: item.quantity,
          unit_price: item.rate,
        })),
        total_amount: saleData.totalAmount,
        paid_amount: saleData.paidAmount,
        payment_type:
          saleData.paymentStatus === PaymentStatusValues.PAID
            ? "cash"
            : saleData.paymentStatus === PaymentStatusValues.PARTIAL
            ? "partial"
            : "credit",
        notes: `Sale to ${saleData.customerName}`,
      };

      const response = await fetch(`${API_URL}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(salePayload),
      });

      await refreshSales();
      await refreshDashboard();
      await refreshProducts(); // Refresh products to update stock
    } catch (error) {
      console.error("Error adding sale", error);
    }
  };

  const addExpense = async (expenseData: Omit<Expense, "id">) => {
    try {
      const payload = {
        category: expenseData.category,
        description: expenseData.description,
        amount: expenseData.amount,
        expense_date: expenseData.date,
        paid_to: "Vendor",
        payment_method: "cash",
      };

      const response = await fetch(`${API_URL}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await refreshExpenses();
      await refreshDashboard();
    } catch (error) {
      console.error("Error adding expense", error);
    }
  };

  const updateDeliveryStatus = async (
    deliveryId: string,
    status: DeliveryStatus
  ) => {
    try {
      // This would call your deliveries API endpoint
      // For now, update local state
      setDeliveries((prev) =>
        prev.map((delivery) =>
          delivery.id === deliveryId ? { ...delivery, status } : delivery
        )
      );
    } catch (error) {
      console.error("Error updating delivery status", error);
    }
  };

  // Return the context value with all methods
  return (
    <AccountsContext.Provider
      value={{
        // Existing data
        locations,
        categories,
        accounts,
        isLoading,

        // New business data
        customers,
        products,
        sales,
        expenses,
        deliveries,
        dashboardStats,

        // Existing methods
        addLocation,
        addCategory,
        addAccount,
        addBulkAccounts,
        addBulkTransactions,
        deleteAccount,
        deleteCategory,
        deleteBulkAccounts,
        addTransaction,
        deleteTransaction,
        updateTransaction,

        // New business methods
        addCustomer,
        addProduct,
        addSale,
        addExpense,
        updateDeliveryStatus,
        refreshDashboard,
        refreshCustomers,
        refreshProducts,
        refreshSales,
        refreshExpenses,
      }}
    >
      {children}
    </AccountsContext.Provider>
  );
};

export const useAccounts = () => {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error("useAccounts must be used within an AccountsProvider");
  }
  return context;
};
