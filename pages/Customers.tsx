import React, { useState, useMemo } from "react";
import { useStore } from "../context/Store";
import { useNavigate } from "react-router-dom";
import {
  Search,
  User,
  Phone,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  MapPin,
  Briefcase,
  Wallet,
  RefreshCw,
} from "lucide-react";
import Dropdown from "../components/Dropdown";
import { Customer } from "../types";

// --- Types & Helpers ---
type SortKey =
  | "name"
  | "totalSales"
  | "totalDues"
  | "walletBalance"
  | "lastActive";
type SortDirection = "asc" | "desc";

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const Customers: React.FC = () => {
  const { customers, sales, deliveries, addCustomer, refreshCustomers } =
    useStore();
  const navigate = useNavigate();

  // --- State ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("All Time");
  const [duesRange, setDuesRange] = useState<number>(100000);
  const [showAdvanceOnly, setShowAdvanceOnly] = useState(false);
  const [customerTypeFilter, setCustomerTypeFilter] = useState("All");

  // --- Add Customer State ---
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    type: "Individual",
  });

  // --- Sort State ---
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "lastActive",
    direction: "desc",
  });

  // --- Manual refresh function ---
  const handleManualRefresh = async () => {
    setIsLoading(true);
    try {
      await refreshCustomers();
      console.log("Customers refreshed manually");
    } catch (error) {
      console.error("Error refreshing customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Calculate wallet balance based on payment types ---
  const calculateWalletBalance = (customerId: string) => {
    const customerSales = sales.filter((s) => s.customerId === customerId);

    // Calculate advance payments (full advance + advance portions)
    let totalAdvance = 0;
    let totalAdvanceUsed = 0;

    customerSales.forEach((sale) => {
      switch (sale.paymentType) {
        case "full advance":
          // Full amount paid as advance
          totalAdvance += sale.totalAmount;
          break;
        case "advance + cash":
          // Portion paid as advance (assuming 50% for now, you may need to adjust)
          totalAdvance += Math.floor(sale.totalAmount * 0.5);
          totalAdvanceUsed += Math.floor(sale.totalAmount * 0.5);
          break;
        case "cash":
        case "credit":
        case "dues + cash":
          // No advance involved or advance not applicable
          break;
      }
    });

    // Net wallet balance = total advance paid - advance used
    const netBalance = totalAdvance - totalAdvanceUsed;

    // According to your logic: wallet balance should never be negative
    // If customer has no advance, show 0, never show negative
    return netBalance > 0 ? netBalance : 0;
  };

  // --- Derived Data & Metrics ---
  const enhancedCustomers = useMemo(() => {
    console.log("=== ENHANCING CUSTOMERS ===");
    console.log("Total customers from store:", customers.length);
    console.log("Total sales:", sales.length);

    const enhanced = customers.map((c) => {
      // Calculate customer sales
      const customerSales = sales.filter((s) => s.customerId === c.id);
      const totalSalesAmount = customerSales.reduce(
        (sum, s) => sum + s.totalAmount,
        0
      );
      const hasPendingDeliveries = deliveries.some(
        (d) => d.customerName === c.name && d.status !== "Delivered"
      );
      const isRegular = customerSales.length >= 4;

      // Calculate wallet balance using the new logic
      const calculatedWalletBalance = calculateWalletBalance(c.id);

      console.log(
        `Customer: ${c.name}, Dues: ${c.totalDues}, Original Wallet: ${c.walletBalance}, Calculated Wallet: ${calculatedWalletBalance}, Sales: ${customerSales.length}`
      );

      return {
        ...c,
        totalSalesAmount,
        isActive: hasPendingDeliveries,
        isRegular,
        salesCount: customerSales.length,
        walletBalance: calculatedWalletBalance, // Use the calculated wallet balance
      };
    });

    // Log customers with dues
    const customersWithDues = enhanced.filter((c) => c.totalDues > 0);
    console.log(`${customersWithDues.length} customers have dues:`);
    customersWithDues.forEach((c) => {
      console.log(`  - ${c.name}: ₹${c.totalDues}`);
    });

    return enhanced;
  }, [customers, sales, deliveries]);

  const metrics = {
    total: enhancedCustomers.length,
    active: enhancedCustomers.filter((c) => c.isActive).length,
    regular: enhancedCustomers.filter((c) => c.isRegular).length,
    withDues: enhancedCustomers.filter((c) => c.totalDues > 0).length,
    totalDues: enhancedCustomers.reduce((sum, c) => sum + c.totalDues, 0),
  };

  const filteredCustomers = useMemo(() => {
    return enhancedCustomers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery);
      const matchesType =
        customerTypeFilter === "All" || c.type === customerTypeFilter;
      const matchesDues = c.totalDues <= duesRange;
      const matchesAdvance = showAdvanceOnly ? c.walletBalance > 0 : true;
      return matchesSearch && matchesType && matchesDues && matchesAdvance;
    });
  }, [
    enhancedCustomers,
    searchQuery,
    customerTypeFilter,
    duesRange,
    showAdvanceOnly,
  ]);

  const sortedCustomers = useMemo(() => {
    const sorted = [...filteredCustomers];
    sorted.sort((a, b) => {
      let aValue = a[sortConfig.key as keyof typeof a];
      let bValue = b[sortConfig.key as keyof typeof b];

      // Handle totalSales separately since it's a computed property
      if (sortConfig.key === "totalSales") {
        aValue = a.totalSalesAmount;
        bValue = b.totalSalesAmount;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredCustomers, sortConfig]);

  // --- Handlers ---
  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  const handleSaveNewCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return;

    // Map UI types to System types
    const systemType = newCustomer.type === "Individual" ? "Regular" : "VIP";

    const customer: Customer = {
      id: "", // Will be set by backend
      name: newCustomer.name,
      phone: newCustomer.phone,
      address: newCustomer.address,
      type: systemType,
      walletBalance: 0,
      totalDues: 0,
      lastActive: new Date().toISOString().split("T")[0],
    };

    try {
      const savedCustomer = await addCustomer(customer);

      // Refresh the list
      await handleManualRefresh();

      setIsAddCustomerOpen(false);
      setNewCustomer({ name: "", phone: "", address: "", type: "Individual" });

      console.log("New customer saved:", savedCustomer);
    } catch (error) {
      console.error("Failed to save customer:", error);
      alert("Failed to save customer. Please try again.");
    }
  };

  return (
    <div className="pb-24 md:pb-0 space-y-8">
      {/* --- Header & Actions --- */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">
              Customer Management
            </h1>

            {/* Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className={`p-2 rounded-full transition-all ${
                isLoading
                  ? "bg-slate-800 text-slate-500"
                  : "bg-brand-500 text-slate-900 hover:bg-brand-400"
              }`}
              title="Refresh customer data"
            >
              <RefreshCw
                size={20}
                className={isLoading ? "animate-spin" : ""}
              />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Toggle */}
            <button
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                setIsAddCustomerOpen(false);
              }}
              className={`p-2 rounded-full transition-all duration-300 ${
                isSearchOpen
                  ? "bg-brand-500 text-slate-900 rotate-90"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {isSearchOpen ? <X size={20} /> : <Search size={20} />}
            </button>

            {/* Add Customer Toggle */}
            <button
              onClick={() => {
                setIsAddCustomerOpen(!isAddCustomerOpen);
                setIsSearchOpen(false);
              }}
              className={`p-2 rounded-full transition-all duration-300 ${
                isAddCustomerOpen
                  ? "bg-red-500 text-white rotate-45"
                  : "bg-brand-500 text-slate-900"
              }`}
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mt-4 text-sm text-brand-400 flex items-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            Refreshing customer data...
          </div>
        )}

        {/* Stats Summary */}
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="text-xs text-slate-500">
            Total: <span className="text-white font-bold">{metrics.total}</span>
          </div>
          <div className="text-xs text-slate-500">
            • With Dues:{" "}
            <span className="text-red-400 font-bold">{metrics.withDues}</span>
          </div>
          <div className="text-xs text-slate-500">
            • Total Dues:{" "}
            <span className="text-red-400 font-bold">
              ₹{metrics.totalDues.toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            • Wallet Balance:{" "}
            <span className="text-emerald-400 font-bold">
              ₹
              {enhancedCustomers
                .reduce((sum, c) => sum + c.walletBalance, 0)
                .toLocaleString()}
            </span>
          </div>
        </div>

        {/* Expandable Filter Panel */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            isSearchOpen
              ? "max-h-[600px] opacity-100 mt-6"
              : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Name or Phone..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-brand-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Time Period
              </label>
              <Dropdown
                options={["All Time", "Past Week", "Past Month"]}
                value={timeFilter}
                onSelect={setTimeFilter}
                className="w-full"
              />
            </div>
            <div className="md:col-span-3">
              <div className="flex justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Max Dues
                </label>
                <span className="text-xs text-brand-500 font-mono">
                  ₹{duesRange.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100000"
                step="1000"
                value={duesRange}
                onChange={(e) => setDuesRange(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
            <div className="md:col-span-2 flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer group select-none mt-4 md:mt-0">
                <div
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${
                    showAdvanceOnly ? "bg-emerald-500" : "bg-slate-800"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                      showAdvanceOnly ? "translate-x-6" : "translate-x-0"
                    }`}
                  ></div>
                </div>
                <span
                  className={`text-sm font-medium transition-colors ${
                    showAdvanceOnly
                      ? "text-emerald-400"
                      : "text-slate-400 group-hover:text-slate-300"
                  }`}
                >
                  Advance Only
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Expandable Add Customer Panel */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            isAddCustomerOpen
              ? "max-h-[800px] opacity-100 mt-6"
              : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <User className="text-brand-500" size={20} /> Add New Customer
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-brand-500 transition-all"
                      placeholder="Enter name"
                      value={newCustomer.name}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, name: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="tel"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-brand-500 transition-all"
                      placeholder="Enter phone"
                      value={newCustomer.phone}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-brand-500 transition-all"
                      placeholder="City, Area..."
                      value={newCustomer.address}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Customer Type
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        setNewCustomer({ ...newCustomer, type: "Individual" })
                      }
                      className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        newCustomer.type === "Individual"
                          ? "bg-brand-500 text-slate-900 border-brand-500 shadow-lg shadow-brand-500/20"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      <User size={16} /> Individual
                    </button>
                    <button
                      onClick={() =>
                        setNewCustomer({ ...newCustomer, type: "Contractor" })
                      }
                      className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        newCustomer.type === "Contractor"
                          ? "bg-brand-500 text-slate-900 border-brand-500 shadow-lg shadow-brand-500/20"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      <Briefcase size={16} /> Contractor
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSaveNewCustomer}
                disabled={!newCustomer.name || !newCustomer.phone}
                className="bg-brand-500 hover:bg-brand-600 text-slate-900 font-bold py-3 px-8 rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95 w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Customer Table Section --- */}
      <div className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <User className="text-brand-500" size={20} /> Client List
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-40">
              <Dropdown
                options={["All", "Individual", "Contractor", "Regular", "VIP"]}
                value={customerTypeFilter}
                onSelect={setCustomerTypeFilter}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-transparent">
          {/* Desktop Header Row */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-800 bg-slate-900/30 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div
              className="col-span-4 cursor-pointer hover:text-brand-500 flex items-center gap-1"
              onClick={() => handleSort("name")}
            >
              Name{" "}
              <SortIcon
                active={sortConfig.key === "name"}
                direction={sortConfig.direction}
              />
            </div>
            <div
              className="col-span-2 cursor-pointer hover:text-brand-500 flex items-center gap-1"
              onClick={() => handleSort("totalSales")}
            >
              Sales{" "}
              <SortIcon
                active={sortConfig.key === "totalSales"}
                direction={sortConfig.direction}
              />
            </div>
            <div
              className="col-span-2 text-right cursor-pointer hover:text-brand-500 flex justify-end items-center gap-1"
              onClick={() => handleSort("totalDues")}
            >
              Dues{" "}
              <SortIcon
                active={sortConfig.key === "totalDues"}
                direction={sortConfig.direction}
              />
            </div>
            <div
              className="col-span-2 text-right cursor-pointer hover:text-brand-500 flex justify-end items-center gap-1"
              onClick={() => handleSort("walletBalance")}
            >
              Wallet{" "}
              <SortIcon
                active={sortConfig.key === "walletBalance"}
                direction={sortConfig.direction}
              />
            </div>
            <div
              className="col-span-2 text-right cursor-pointer hover:text-brand-500 flex justify-end items-center gap-1"
              onClick={() => handleSort("lastActive")}
            >
              Last Order
            </div>
          </div>

          <div className="space-y-3 md:space-y-1 mt-2">
            {sortedCustomers.length > 0 ? (
              sortedCustomers.map((c) => (
                <div key={c.id} onClick={() => navigate(`/customers/${c.id}`)}>
                  {/* Desktop Row */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-slate-800/50 hover:bg-slate-900/40 transition-all cursor-pointer group rounded-xl">
                    <div className="col-span-4">
                      <p className="font-bold text-white text-sm group-hover:text-brand-500 transition-colors truncate">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {c.phone}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-slate-300 font-mono">
                        ₹{c.totalSalesAmount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-600">
                        ({c.salesCount || 0} sales)
                      </p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p
                        className={`text-sm font-bold font-mono ${
                          c.totalDues > 0 ? "text-red-400" : "text-slate-500"
                        }`}
                      >
                        {c.totalDues > 0
                          ? `₹${c.totalDues.toLocaleString()}`
                          : "-"}
                      </p>
                      {c.totalDues > 0 && (
                        <p className="text-[10px] text-red-400/70">Due</p>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      <p
                        className={`text-sm font-bold font-mono ${
                          c.walletBalance > 0
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }`}
                      >
                        {c.walletBalance > 0
                          ? `₹${c.walletBalance.toLocaleString()}`
                          : "-"}
                      </p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-xs text-slate-400">{c.lastActive}</p>
                    </div>
                  </div>

                  {/* Mobile Card */}
                  <div className="md:hidden bg-slate-900/50 border border-slate-800 rounded-2xl p-4 active:bg-slate-900 active:scale-98 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-white text-base">
                          {c.name}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Phone size={10} /> {c.phone}
                        </p>
                      </div>
                      <div className="text-right">
                        {c.walletBalance > 0 ? (
                          <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                            <Wallet size={12} />
                            <span className="text-xs font-bold">
                              ₹{c.walletBalance.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-600">
                            No Advance
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                            Dues
                          </span>
                          <span
                            className={`text-sm font-bold font-mono ${
                              c.totalDues > 0
                                ? "text-red-400"
                                : "text-slate-400"
                            }`}
                          >
                            {c.totalDues > 0
                              ? `₹${c.totalDues.toLocaleString()}`
                              : "Clear"}
                          </span>
                        </div>
                        {c.totalDues > 0 && (
                          <span className="text-[10px] text-red-400/70 mt-1">
                            Outstanding Balance
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Last: {c.lastActive}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-500 bg-slate-900/20 rounded-xl border border-slate-800/50 border-dashed">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw
                      size={24}
                      className="animate-spin text-brand-500"
                    />
                    <p>Loading customer data...</p>
                  </div>
                ) : (
                  "No customers found matching your filters."
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Helper Components ---

const SortIcon: React.FC<{ active: boolean; direction: SortDirection }> = ({
  active,
  direction,
}) => {
  if (!active)
    return <ArrowUpDown size={10} className="text-slate-600 opacity-50" />;
  return direction === "asc" ? (
    <ArrowUp size={10} className="text-brand-500" />
  ) : (
    <ArrowDown size={10} className="text-brand-500" />
  );
};

export default Customers;
