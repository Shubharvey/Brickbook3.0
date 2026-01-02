import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Customer,
  Product,
  Sale,
  Expense,
  Delivery,
  DeliveryStatus,
} from "../types";
import { useAuth } from "./AuthContext";

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
  getAuthHeaders: () => Promise<HeadersInit>;
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

  // Use the AuthContext
  const { user, session, isLoading: authLoading } = useAuth();

  // API base URL
  const API_BASE = "https://brickbook-backend.vercel.app/api";

  // Track if we've already fetched data to prevent infinite loops
  const [hasFetchedData, setHasFetchedData] = useState(false);

  // Use a ref to track if we're currently fetching data
  const isFetchingRef = useRef(false);

  // Debug function to check token
  const debugToken = () => {
    try {
      const tokenString =
        localStorage.getItem("supabase.auth.token") ||
        sessionStorage.getItem("supabase.auth.token") ||
        localStorage.getItem("sb-access-token") ||
        sessionStorage.getItem("sb-access-token") ||
        localStorage.getItem("supabase-auth-token") ||
        sessionStorage.getItem("supabase-auth-token");

      console.log("DEBUG - Token found in storage:", !!tokenString);

      if (tokenString) {
        try {
          const parsed = JSON.parse(tokenString);
          console.log("DEBUG - Parsed token keys:", Object.keys(parsed || {}));

          // Check all possible access token locations
          const possibleTokens = [
            parsed?.access_token,
            parsed?.accessToken,
            parsed?.session?.access_token,
            parsed?.session?.accessToken,
            parsed?.data?.access_token,
            parsed?.currentSession?.access_token,
          ].filter(Boolean);

          console.log(
            "DEBUG - Possible access tokens found:",
            possibleTokens.length
          );
        } catch (e) {
          console.log("DEBUG - Token is not JSON");
        }
      }
    } catch (err) {
      console.error("DEBUG - Error checking token:", err);
    }
  };

  // Helper function to get authentication headers
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    try {
      // Try to get the session directly from AuthContext first
      if (session?.access_token) {
        console.log("getAuthHeaders - Using session from AuthContext");
        return {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        };
      }

      // Fallback to storage
      let tokenString =
        localStorage.getItem("supabase.auth.token") ||
        sessionStorage.getItem("supabase.auth.token") ||
        localStorage.getItem("sb-access-token") ||
        sessionStorage.getItem("sb-access-token") ||
        localStorage.getItem("supabase-auth-token") ||
        sessionStorage.getItem("supabase-auth-token");

      console.log("getAuthHeaders - Token found:", tokenString ? "YES" : "NO");

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (!tokenString) {
        console.log("getAuthHeaders - No token found in any storage");
        return headers;
      }

      try {
        const parsed = JSON.parse(tokenString);

        // Try multiple possible access token locations
        let accessToken =
          parsed?.access_token || // Your current format
          parsed?.accessToken || // Alternative camelCase
          parsed?.session?.access_token || // Nested in session
          parsed?.session?.accessToken || // CamelCase in session
          parsed?.data?.access_token || // Nested in data
          tokenString; // Use raw if not JSON

        console.log(
          "getAuthHeaders - Extracted accessToken:",
          accessToken ? "YES" : "NO",
          accessToken?.substring(0, 20) + "..."
        );

        if (accessToken && typeof accessToken === "string") {
          headers["Authorization"] = `Bearer ${accessToken}`;
          console.log("getAuthHeaders - Authorization header set");
        } else {
          console.log(
            "getAuthHeaders - No valid access token found in:",
            Object.keys(parsed)
          );
        }
      } catch (parseError) {
        // If tokenString is not JSON, use it as the token itself
        console.log("getAuthHeaders - Token is not JSON, using as raw token");
        headers["Authorization"] = `Bearer ${tokenString}`;
      }

      return headers;
    } catch (error) {
      console.error("getAuthHeaders - Unexpected error:", error);
      return {
        "Content-Type": "application/json",
      };
    }
  };

  // Fetch customers with proper error handling
  const fetchCustomers = useCallback(async (): Promise<void> => {
    try {
      console.log("Fetching customers...");
      const headers = await getAuthHeaders();

      // Check if we have Authorization header
      if (!headers["Authorization"]) {
        console.error("No Authorization header found!");
        throw new Error("Authentication token missing. Please login again.");
      }

      const customersResponse = await fetch(`${API_BASE}/customers`, {
        headers,
      });

      console.log("Customers response status:", customersResponse.status);

      if (!customersResponse.ok) {
        if (customersResponse.status === 401) {
          console.error("401 Unauthorized - Token may be invalid");
          throw new Error("Authentication failed. Please login again.");
        } else if (customersResponse.status === 403) {
          console.error("403 Forbidden - Insufficient permissions");
          throw new Error("You don't have permission to access this resource.");
        }
        throw new Error(
          `Failed to fetch customers: ${customersResponse.status}`
        );
      }

      const customersData = await customersResponse.json();
      console.log(`Received ${customersData.length} customers`);

      // Check if data is an array before mapping
      if (Array.isArray(customersData)) {
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
        console.log(`Set ${transformedCustomers.length} customers in state`);
      } else {
        console.error("Expected array but received:", customersData);
        setCustomers([]);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
      throw err;
    }
  }, [session]);

  // Fetch sales with proper error handling
  const fetchSales = useCallback(async (): Promise<void> => {
    try {
      console.log("Fetching sales...");
      const headers = await getAuthHeaders();

      // Check if we have Authorization header
      if (!headers["Authorization"]) {
        console.error("No Authorization header found!");
        throw new Error("Authentication token missing. Please login again.");
      }

      const salesResponse = await fetch(`${API_BASE}/sales`, {
        headers,
      });

      console.log("Sales response status:", salesResponse.status);

      if (!salesResponse.ok) {
        if (salesResponse.status === 401) {
          console.error("401 Unauthorized - Token may be invalid");
          throw new Error("Authentication failed. Please login again.");
        } else if (salesResponse.status === 403) {
          console.error("403 Forbidden - Insufficient permissions");
          throw new Error("You don't have permission to access this resource.");
        }
        throw new Error(`Failed to fetch sales: ${salesResponse.status}`);
      }

      const salesData = await salesResponse.json();
      console.log(`Received ${salesData.length} sales`);

      // Check if data is an array before mapping
      if (Array.isArray(salesData)) {
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
        console.error("Expected array but received:", salesData);
        setSales([]);
      }
    } catch (err) {
      console.error("Error fetching sales:", err);
      throw err;
    }
  }, [session]);

  // Fetch expenses with proper error handling
  const fetchExpenses = useCallback(async (): Promise<void> => {
    try {
      console.log("Fetching expenses...");
      const headers = await getAuthHeaders();

      // Check if we have Authorization header
      if (!headers["Authorization"]) {
        console.error("No Authorization header found!");
        throw new Error("Authentication token missing. Please login again.");
      }

      const expensesResponse = await fetch(`${API_BASE}/expenses`, {
        headers,
      });

      console.log("Expenses response status:", expensesResponse.status);

      if (!expensesResponse.ok) {
        if (expensesResponse.status === 401) {
          console.error("401 Unauthorized - Token may be invalid");
          throw new Error("Authentication failed. Please login again.");
        } else if (expensesResponse.status === 403) {
          console.error("403 Forbidden - Insufficient permissions");
          throw new Error("You don't have permission to access this resource.");
        } else if (expensesResponse.status === 500) {
          console.error("500 Internal Server Error - Backend issue");
          // Don't throw error for 500, just set empty expenses and log warning
          console.warn(
            "Backend error with expenses endpoint, continuing without expenses"
          );
          setExpenses([]);
          return;
        }
        throw new Error(`Failed to fetch expenses: ${expensesResponse.status}`);
      }

      const expensesData = await expensesResponse.json();
      console.log(`Received ${expensesData.length} expenses`);

      // Check if data is an array before mapping
      if (Array.isArray(expensesData)) {
        setExpenses(
          expensesData.map((exp: any) => ({
            id: exp.id.toString(),
            category: exp.category as any,
            amount: parseFloat(exp.amount),
            description: exp.description || "",
            date: exp.expense_date.split("T")[0],
          }))
        );
        console.log(`Set ${expensesData.length} expenses in state`);
      } else {
        console.error("Expected array but received:", expensesData);
        setExpenses([]);
      }
    } catch (err) {
      console.error("Error fetching expenses:", err);
      // Don't throw error for expenses as it's not critical for the app to function
      setExpenses([]);
    }
  }, [session]);

  // Fetch products with proper error handling
  const fetchProducts = useCallback(async (): Promise<void> => {
    try {
      console.log("Fetching products...");
      const headers = await getAuthHeaders();

      // Check if we have Authorization header
      if (!headers["Authorization"]) {
        console.error("No Authorization header found!");
        throw new Error("Authentication token missing. Please login again.");
      }

      const productsResponse = await fetch(`${API_BASE}/inventory`, {
        headers,
      });

      console.log("Products response status:", productsResponse.status);

      if (!productsResponse.ok) {
        if (productsResponse.status === 401) {
          console.error("401 Unauthorized - Token may be invalid");
          throw new Error("Authentication failed. Please login again.");
        } else if (productsResponse.status === 403) {
          console.error("403 Forbidden - Insufficient permissions");
          throw new Error("You don't have permission to access this resource.");
        }
        throw new Error(`Failed to fetch products: ${productsResponse.status}`);
      }

      const productsData = await productsResponse.json();
      console.log(`Received ${productsData.length} products`);

      // Check if data is an array before mapping
      if (Array.isArray(productsData)) {
        setProducts(
          productsData.map((product: any) => ({
            id: product.id.toString(),
            name: product.name || "Unknown",
            type: product.type || "Regular",
            stock: product.stock || 0,
            price: product.price || 0,
            lastUpdated:
              product.updated_at?.split("T")[0] ||
              new Date().toISOString().split("T")[0],
          }))
        );
        console.log(`Set ${productsData.length} products in state`);
      } else {
        console.error("Expected array but received:", productsData);
        setProducts([]);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      // Don't throw error for products as it's not critical for the app to function
      setProducts([]);
    }
  }, [session]);

  // Main function to fetch all data
  const fetchAllData = useCallback(async (): Promise<void> => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      console.log("Already fetching data, skipping...");
      return;
    }

    console.log(
      "fetchAllData called - User:",
      user?.id,
      "Auth loading:",
      authLoading,
      "Has fetched data:",
      hasFetchedData
    );

    // Don't fetch if no user or auth is still loading or we've already fetched data
    if (!user || authLoading || hasFetchedData) {
      console.log(
        "Skipping data fetch - no user, auth loading, or already fetched"
      );
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log("FETCHING DATA FOR USER:", user.id, user.email);

      // Fetch all data in parallel
      const results = await Promise.allSettled([
        fetchCustomers(),
        fetchSales(),
        fetchExpenses(),
        fetchProducts(),
      ]);

      // Check if any of the promises were rejected
      const rejectedPromises = results.filter(
        (result) => result.status === "rejected"
      );
      if (rejectedPromises.length > 0) {
        console.warn(`${rejectedPromises.length} data fetch operations failed`);
        // Log the errors for debugging
        rejectedPromises.forEach((promise: any, index) => {
          console.error(`Error in fetch operation ${index}:`, promise.reason);
        });
      }

      // Set empty array for deliveries for now
      setDeliveries([]);

      // Mark that we've fetched data to prevent infinite loops
      setHasFetchedData(true);

      console.log("Data fetch completed successfully!");
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      // Reset hasFetchedData on error to allow retry
      setHasFetchedData(false);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [
    user,
    authLoading,
    session,
    hasFetchedData,
    fetchCustomers,
    fetchSales,
    fetchExpenses,
    fetchProducts,
  ]);

  // Effect to fetch data when user changes
  useEffect(() => {
    console.log(
      "Auth state changed - User:",
      user?.id,
      "Loading:",
      authLoading,
      "Has fetched:",
      hasFetchedData
    );

    // Clear data when user logs out
    if (!user && !authLoading) {
      console.log("No user, clearing data...");
      setCustomers([]);
      setSales([]);
      setExpenses([]);
      setProducts([]);
      setDeliveries([]);
      setIsLoading(false);
      setHasFetchedData(false);
      isFetchingRef.current = false;
      return;
    }

    // Fetch data when user logs in
    if (user && !authLoading && !hasFetchedData) {
      console.log("User detected, fetching data...");
      // Use a small timeout to ensure state is properly set
      const timer = setTimeout(() => {
        fetchAllData();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [user, authLoading, hasFetchedData]);

  // Refresh functions - now each refreshes only its specific data
  const refreshCustomers = async (): Promise<void> => {
    console.log("Manual refresh customers");
    try {
      await fetchCustomers();
    } catch (err) {
      console.error("Error refreshing customers:", err);
      setError(
        err instanceof Error ? err.message : "Failed to refresh customers"
      );
    }
  };

  const refreshExpenses = async (): Promise<void> => {
    console.log("Manual refresh expenses");
    try {
      await fetchExpenses();
    } catch (err) {
      console.error("Error refreshing expenses:", err);
      setError(
        err instanceof Error ? err.message : "Failed to refresh expenses"
      );
    }
  };

  const refreshSales = async (): Promise<void> => {
    console.log("Manual refresh sales");
    try {
      await fetchSales();
    } catch (err) {
      console.error("Error refreshing sales:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh sales");
    }
  };

  const refreshAllData = async (): Promise<void> => {
    console.log("Manual refresh all data");
    setHasFetchedData(false);
    isFetchingRef.current = false;
    await fetchAllData();
  };

  const addSale = async (sale: Sale): Promise<void> => {
    try {
      console.log("Adding sale...");

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
      console.log("Adding customer...");
      const headers = await getAuthHeaders();

      // Check if we have Authorization header
      if (!headers["Authorization"]) {
        console.error("No Authorization header found!");
        throw new Error("Authentication token missing. Please login again.");
      }

      console.log("Sending customer data:", {
        name: customer.name,
        phone: customer.phone || "",
        email: "",
        address: customer.address || "",
        type: customer.type,
      });

      const response = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: customer.name,
          phone: customer.phone || "",
          email: "",
          address: customer.address || "",
          type: customer.type || "Regular",
        }),
      });

      console.log("Customer creation response status:", response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.error("401 Unauthorized - Token may be invalid");
          throw new Error("Authentication failed. Please login again.");
        } else if (response.status === 403) {
          console.error("403 Forbidden - Insufficient permissions");
          throw new Error("You don't have permission to create customers.");
        }

        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // If response is not JSON, use status text
          throw new Error(
            `Failed to create customer: ${
              response.statusText || response.status
            }`
          );
        }

        console.error("Backend error:", errorData);
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Failed to create customer: ${response.status}`
        );
      }

      const newCustomerData = await response.json();
      console.log("Backend response for new customer:", newCustomerData);

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

      setCustomers((prev) => [backendCustomer, ...prev]);
      console.log("Customer added to state");

      return backendCustomer;
    } catch (err) {
      console.error("Error adding customer:", err);
      throw err;
    }
  };

  const addExpense = async (expense: Expense): Promise<void> => {
    try {
      console.log("Adding expense...");
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
      console.log("Expense added to state");
    } catch (err) {
      console.error("Error adding expense:", err);
      throw err;
    }
  };

  const deleteSale = async (saleId: string): Promise<boolean> => {
    try {
      console.log(`Deleting sale ${saleId}`);
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

      await response.json();
      setSales((prev) => prev.filter((sale) => sale.id !== saleId));
      await refreshCustomers();

      console.log(`Sale ${saleId} deleted successfully`);
      return true;
    } catch (err) {
      console.error("Error deleting sale:", err);
      setError(err instanceof Error ? err.message : "Failed to delete sale");
      return false;
    }
  };

  const deleteCustomer = async (customerId: string): Promise<boolean> => {
    try {
      console.log(`Deleting customer ${customerId}`);
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

      await response.json();
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
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
    getAuthHeaders,
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
