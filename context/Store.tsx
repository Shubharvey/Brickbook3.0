import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import {
  Customer,
  Product,
  Sale,
  Expense,
  Delivery,
  DeliveryStatus,
} from "../types";
import { useAuth } from "./AuthContext"; // Import from your actual AuthContext

interface StoreContextType {
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  deliveries: Delivery[];
  isLoading: boolean;
  error: string | null;
  addSale: (sale: Sale) => Promise<void>;
  addCustomer: (customer: Customer) => Promise<Customer>;
  addExpense: (expense: Expense) => Promise<void>;
  deleteSale: (saleId: string) => Promise<boolean>;
  deleteCustomer: (customerId: string) => Promise<boolean>;
  updateDeliveryStatus: (id: string, status: DeliveryStatus) => void;
  refreshCustomers: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshSales: () => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Use the REAL AuthContext - THIS IS THE KEY CHANGE
  const { user, isLoading: authLoading } = useAuth();

  // API base URL
  const API_BASE = "https://brickbook-backend.vercel.app/api";

  // Helper function to get authentication headers
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const token =
      localStorage.getItem("supabase.auth.token") ||
      sessionStorage.getItem("supabase.auth.token");

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      try {
        const parsedToken = JSON.parse(token);
        if (parsedToken?.access_token) {
          headers["Authorization"] = `Bearer ${parsedToken.access_token}`;
        }
      } catch (err) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  };

  // Main function to fetch all data
  const fetchAllData = useCallback(async (): Promise<void> => {
    // Don't fetch if no user or auth is still loading
    if (!user || authLoading) {
      console.log("No user or auth loading, skipping data fetch");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("=== FETCHING DATA FOR USER:", user.id, "===");
      const headers = await getAuthHeaders();

      // Fetch customers
      console.log("Fetching customers...");
      const customersResponse = await fetch(`${API_BASE}/customers`, {
        headers,
      });
      if (!customersResponse.ok) {
        throw new Error(
          `Failed to fetch customers: ${customersResponse.status}`
        );
      }
      const customersData = await customersResponse.json();

      const transformedCustomers = customersData.map((customer: any) => ({
        id: customer.id.toString(),
        name: customer.name || "Unknown",
        phone: customer.phone || "",
        address: customer.address || "",
        type: customer.type || "Regular",
        walletBalance: customer.wallet_balance || 0,
        totalDues: customer.outstanding_balance || 0,
        lastActive:
          customer.created_at?.split("T")[0] ||
          new Date().toISOString().split("T")[0],
      }));

      setCustomers(transformedCustomers);
      console.log(`Set ${transformedCustomers.length} customers`);

      // Fetch sales
      console.log("Fetching sales...");
      const salesResponse = await fetch(`${API_BASE}/sales`, {
        headers,
      });
      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        console.log("Raw sales data from API:", salesData);

        const transformedSales = salesData.map((sale: any) => {
          const items = sale.sale_items || [];
          return {
            id: sale.id?.toString() || "",
            customerId: sale.customerId?.toString() || "",
            customerName: sale.customerName || "Unknown",
            date:
              sale.saleDate?.split("T")[0] ||
              new Date().toISOString().split("T")[0],
            items: items.map((item: any) => ({
              productId: item.id?.toString() || "",
              productName: item.item_name || "Item",
              quantity: item.quantity || 0,
              rate: item.unit_price || 0,
              amount: item.total_price || 0,
            })),
            totalAmount: sale.totalAmount || 0,
            paidAmount: sale.paidAmount || 0,
            paymentStatus: sale.paymentStatus || "Pending",
            deliveryStatus: sale.deliveryStatus || "Pending",
          };
        });
        setSales(transformedSales);
        console.log("Transformed sales:", transformedSales.length);
      } else {
        console.warn("Failed to fetch sales, status:", salesResponse.status);
      }

      // Fetch expenses
      const expensesResponse = await fetch(`${API_BASE}/expenses`, {
        headers,
      });
      if (expensesResponse.ok) {
        const expensesData = await expensesResponse.json();
        setExpenses(
          expensesData.map((exp: any) => ({
            id: exp.id.toString(),
            category: exp.category as any,
            amount: parseFloat(exp.amount),
            description: exp.description || "",
            date: exp.expense_date.split("T")[0],
          }))
        );
      }

      // Set empty arrays for other data types
      setProducts([]);
      setDeliveries([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  // Effect to fetch data when user changes
  useEffect(() => {
    if (user && !authLoading) {
      console.log("User detected, fetching data...");
      fetchAllData();
    } else if (!user && !authLoading) {
      console.log("No user, clearing data...");
      // Clear all data when user logs out
      setCustomers([]);
      setSales([]);
      setExpenses([]);
      setProducts([]);
      setDeliveries([]);
      setIsLoading(false);
    }
  }, [user, authLoading, fetchAllData]);

  // Refresh functions
  const refreshCustomers = async (): Promise<void> => {
    await fetchAllData();
  };

  const refreshExpenses = async (): Promise<void> => {
    await fetchAllData();
  };

  const refreshSales = async (): Promise<void> => {
    await fetchAllData();
  };

  const refreshAllData = async (): Promise<void> => {
    await fetchAllData();
  };

  const addSale = async (sale: Sale): Promise<void> => {
    try {
      console.log("Adding sale to backend and refreshing data...");

      // The sale is already saved by the backend via the POST request in Sales.tsx
      // Just refresh the data from backend
      await refreshSales();

      // Refresh customers to get updated wallet/dues
      await refreshCustomers();

      console.log("Sale data refreshed successfully");
    } catch (err) {
      console.error("Error in addSale:", err);
      throw err;
    }
  };

  const addCustomer = async (customer: Customer): Promise<Customer> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: customer.name,
          phone: customer.phone || "",
          email: "",
          address: customer.address || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create customer");
      }

      const newCustomerData = await response.json();
      console.log("Backend response for new customer:", newCustomerData);

      // Transform the backend customer data to match Customer type
      const backendCustomer: Customer = {
        id: newCustomerData.id.toString(),
        name: newCustomerData.name,
        phone: newCustomerData.phone || "",
        address: newCustomerData.address || "",
        type: newCustomerData.type || "Regular",
        walletBalance: newCustomerData.wallet_balance || 0,
        totalDues: newCustomerData.outstanding_balance || 0,
        lastActive:
          newCustomerData.created_at?.split("T")[0] ||
          new Date().toISOString().split("T")[0],
      };

      // Update local state with the transformed customer
      setCustomers((prev) => [backendCustomer, ...prev]);

      // Return the created customer so it can be used elsewhere
      return backendCustomer;
    } catch (err) {
      console.error("Error adding customer:", err);
      throw err;
    }
  };

  const addExpense = async (expense: Expense): Promise<void> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/expenses`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          paid_to: "",
          payment_method: "cash",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create expense");
      }

      const newExpenseData = await response.json();

      // Update local state with the expense returned from API
      setExpenses((prev) => [
        {
          id: newExpenseData.id.toString(),
          category: newExpenseData.category as any,
          amount: parseFloat(newExpenseData.amount),
          description: newExpenseData.description || "",
          date: newExpenseData.expense_date.split("T")[0],
        },
        ...prev,
      ]);
    } catch (err) {
      console.error("Error adding expense:", err);
      throw err;
    }
  };

  // Delete sale function
  const deleteSale = async (saleId: string): Promise<boolean> => {
    try {
      console.log(`Attempting to delete sale with ID: ${saleId}`);
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_BASE}/sales/${saleId}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to delete sale: ${response.status}`
        );
      }

      const result = await response.json();
      console.log("Delete sale response:", result);

      // Remove the sale from local state
      setSales((prev) => prev.filter((sale) => sale.id !== saleId));

      // Refresh customers to update wallet balances and dues
      await refreshCustomers();

      console.log(`Sale ${saleId} deleted successfully`);
      return true;
    } catch (err) {
      console.error("Error deleting sale:", err);
      setError(err instanceof Error ? err.message : "Failed to delete sale");
      return false;
    }
  };

  // Delete customer function
  const deleteCustomer = async (customerId: string): Promise<boolean> => {
    try {
      console.log(`Attempting to delete customer with ID: ${customerId}`);
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_BASE}/customers/${customerId}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to delete customer: ${response.status}`
        );
      }

      const result = await response.json();
      console.log("Delete customer response:", result);

      // Remove customer from local state
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));

      // Also remove their sales from local state
      setSales((prev) => prev.filter((sale) => sale.customerId !== customerId));

      console.log(`Customer ${customerId} deleted successfully`);
      return true;
    } catch (err) {
      console.error("Error deleting customer:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete customer"
      );
      return false;
    }
  };

  const updateDeliveryStatus = (id: string, status: DeliveryStatus) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status } : d))
    );
  };

  const contextValue: StoreContextType = {
    customers,
    products,
    sales,
    expenses,
    deliveries,
    isLoading,
    error,
    addSale,
    addCustomer,
    addExpense,
    deleteSale,
    deleteCustomer,
    updateDeliveryStatus,
    refreshCustomers,
    refreshExpenses,
    refreshSales,
    refreshAllData,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};
