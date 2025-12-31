import React, { useMemo, useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStore } from "../context/Store";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  MoreVertical,
  TrendingUp,
  Clock,
  IndianRupee,
  Edit3,
  MapPin,
  BarChart3,
  Package,
  CreditCard,
  User,
  Building,
  Trash2,
  Truck,
  Calendar,
  Wallet,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Plus,
  Save,
  Loader,
} from "lucide-react";

const CustomerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, sales, deliveries, deleteSale, refreshCustomers } =
    useStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<
    string | null
  >(null);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [walletAmount, setWalletAmount] = useState<number | "">("");
  const [walletNotes, setWalletNotes] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isProcessingWallet, setIsProcessingWallet] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<boolean | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean | null>(null);
  const [walletSuccess, setWalletSuccess] = useState<boolean | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // API base URL - FIXED: Using the correct production backend URL
  const API_BASE = "https://brickbook-backend.vercel.app/api";

  // --- Data Retrieval ---
  const customer = customers.find((c) => c.id === id);

  // CRITICAL FIX: Use ONLY database values, never calculate wallet balance
  const customerStats = useMemo(() => {
    if (!customer) return null;

    const customerSales = sales.filter((s) => s.customerId === customer.id);
    const totalSalesVal = customerSales.reduce(
      (acc, s) => acc + s.totalAmount,
      0
    );
    const avgOrderVal =
      customerSales.length > 0 ? totalSalesVal / customerSales.length : 0;

    const sortedSales = [...customerSales].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastActivity = sortedSales.length > 0 ? sortedSales[0].date : "N/A";

    const pendingDeliveries = deliveries.filter(
      (d) => d.customerName === customer.name && d.status !== "Delivered"
    ).length;

    // Use ACTUAL database values - these come from backend
    const totalDue = customer.totalDues || 0;
    const actualWalletBalance = customer.walletBalance || 0;
    const totalPaid = customer.totalPaid || 0;

    return {
      totalSales: totalSalesVal,
      avgOrder: avgOrderVal,
      lastActivity,
      pendingDeliveries,
      salesHistory: sortedSales,
      totalOrders: customerSales.length,
      totalPaid, // From database
      totalDue, // From database
      walletBalance: actualWalletBalance, // From database - CRITICAL: Never calculate this
    };
  }, [customer, sales, deliveries]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset success messages after 3 seconds
  useEffect(() => {
    if (deleteSuccess !== null) {
      const timer = setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteSuccess]);

  useEffect(() => {
    if (paymentSuccess !== null) {
      const timer = setTimeout(() => {
        setPaymentSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [paymentSuccess]);

  useEffect(() => {
    if (walletSuccess !== null) {
      const timer = setTimeout(() => {
        setWalletSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [walletSuccess]);

  // --- Handlers ---
  const handleCall = () => {
    if (customer?.phone) {
      window.open(`tel:${customer.phone}`, "_self");
    }
  };

  const handleWhatsApp = () => {
    if (customer?.phone) {
      const message = `Hello ${customer.name}, this is regarding your order with BrickBook.`;
      window.open(
        `https://wa.me/${customer.phone.replace(
          /[^0-9]/g,
          ""
        )}?text=${encodeURIComponent(message)}`,
        "_blank"
      );
    }
  };

  const handleCollectPayment = (saleId?: string) => {
    if (saleId) {
      setSelectedSaleForPayment(saleId);
      const sale = customerStats?.salesHistory.find((s) => s.id === saleId);
      if (sale) {
        setPaymentAmount(sale.totalAmount - sale.paidAmount);
      }
    }
    setIsCollectPaymentOpen(true);
  };

  // Fixed: Handle payment submission with correct API URL
  const handleSubmitPayment = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    setIsProcessingPayment(true);
    setPaymentSuccess(null);

    try {
      // FIXED: Using correct production backend URL
      const response = await fetch(
        `${API_BASE}/customers/${customer?.id}/collect-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: paymentAmount,
            paymentMode: "cash",
            description: selectedSaleForPayment
              ? `Payment for sale ${selectedSaleForPayment}`
              : "General payment",
            notes: "",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process payment");
      }

      await response.json();

      // CRITICAL: Refresh customer data to update UI with database values
      await refreshCustomers();

      // Small delay to ensure data is loaded
      await new Promise((resolve) => setTimeout(resolve, 300));

      setPaymentSuccess(true);

      // Close modal and reset
      setIsCollectPaymentOpen(false);
      setSelectedSaleForPayment(null);
      setPaymentAmount("");
    } catch (error: any) {
      console.error("Error collecting payment:", error);
      setPaymentSuccess(false);
      alert(`Payment failed: ${error.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Fixed: Handle adding to wallet with correct API URL
  const handleAddToWallet = async () => {
    if (!walletAmount || walletAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsProcessingWallet(true);
    setWalletSuccess(null);

    try {
      // FIXED: Using correct production backend URL
      const response = await fetch(
        `${API_BASE}/customers/${customer?.id}/wallet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: walletAmount,
            type: "credit",
            description: walletNotes || "Manual wallet top-up",
            notes: walletNotes || "Added to wallet balance",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update wallet");
      }

      await response.json();

      // CRITICAL: Refresh customer data to update UI
      await refreshCustomers();

      // Small delay to ensure data is loaded
      await new Promise((resolve) => setTimeout(resolve, 300));

      setWalletSuccess(true);

      // Close modal and reset
      setIsAddWalletOpen(false);
      setWalletAmount("");
      setWalletNotes("");
    } catch (error: any) {
      console.error("Error adding to wallet:", error);
      setWalletSuccess(false);
      alert(`Wallet update failed: ${error.message}`);
    } finally {
      setIsProcessingWallet(false);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this sale? This will reverse any wallet balance changes and remove the sale permanently."
      )
    ) {
      return;
    }

    setIsDeleting(saleId);
    setDeleteSuccess(null);

    try {
      const success = await deleteSale(saleId);
      if (success) {
        setDeleteSuccess(true);

        // Refresh customer data to show updated balances from database
        await refreshCustomers();

        // Small delay to ensure data is loaded
        await new Promise((resolve) => setTimeout(resolve, 300));
      } else {
        setDeleteSuccess(false);
        alert("Failed to delete sale. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting sale:", error);
      setDeleteSuccess(false);
      alert("An error occurred while deleting sale.");
    } finally {
      setIsDeleting(null);
    }
  };

  if (!customer || !customerStats) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
          <User className="text-slate-500" size={32} />
        </div>
        <h2 className="text-white text-xl font-bold mb-2">
          Customer Not Found
        </h2>
        <button
          onClick={() => navigate("/customers")}
          className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Back to Customers
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "partial":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "unpaid":
        return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "delivered":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "processing":
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "pending":
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "sales", label: "Sales History", icon: Package },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "activity", label: "Activity Log", icon: Clock },
  ];

  return (
    <div className="bg-slate-950 text-slate-100 font-sans selection:bg-brand-500/30 flex flex-col md:h-[calc(100vh-65px)] md:overflow-hidden">
      {/* Success/Error Notification */}
      {deleteSuccess !== null && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl border shadow-2xl animate-in slide-in-from-right-4 fade-in duration-300 ${
            deleteSuccess
              ? "bg-emerald-950/90 border-emerald-800 text-emerald-400"
              : "bg-rose-950/90 border-rose-800 text-rose-400"
          }`}
        >
          <div className="flex items-center gap-3">
            {deleteSuccess ? (
              <CheckCircle size={20} className="text-emerald-400" />
            ) : (
              <XCircle size={20} className="text-rose-400" />
            )}
            <div>
              <p className="font-bold text-sm">
                {deleteSuccess
                  ? "Sale Deleted Successfully"
                  : "Failed to Delete Sale"}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {deleteSuccess
                  ? "Wallet balance has been adjusted accordingly."
                  : "Please try again or check server logs."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Notification */}
      {paymentSuccess !== null && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl border shadow-2xl animate-in slide-in-from-right-4 fade-in duration-300 ${
            paymentSuccess
              ? "bg-emerald-950/90 border-emerald-800 text-emerald-400"
              : "bg-rose-950/90 border-rose-800 text-rose-400"
          }`}
        >
          <div className="flex items-center gap-3">
            {paymentSuccess ? (
              <CheckCircle size={20} className="text-emerald-400" />
            ) : (
              <XCircle size={20} className="text-rose-400" />
            )}
            <div>
              <p className="font-bold text-sm">
                {paymentSuccess
                  ? "Payment Collected Successfully"
                  : "Payment Failed"}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {paymentSuccess
                  ? "Customer dues updated and UI refreshed."
                  : "Please try again or check server logs."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Success Notification */}
      {walletSuccess !== null && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl border shadow-2xl animate-in slide-in-from-right-4 fade-in duration-300 ${
            walletSuccess
              ? "bg-emerald-950/90 border-emerald-800 text-emerald-400"
              : "bg-rose-950/90 border-rose-800 text-rose-400"
          }`}
        >
          <div className="flex items-center gap-3">
            {walletSuccess ? (
              <CheckCircle size={20} className="text-emerald-400" />
            ) : (
              <XCircle size={20} className="text-rose-400" />
            )}
            <div>
              <p className="font-bold text-sm">
                {walletSuccess
                  ? "Wallet Updated Successfully"
                  : "Wallet Update Failed"}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {walletSuccess
                  ? "Wallet balance updated and UI refreshed."
                  : "Please try again or check server logs."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col min-h-screen pb-24">
        {/* Mobile Header */}
        <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 py-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-semibold text-white">Customer Profile</h1>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              <MoreVertical size={18} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-12 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                <button
                  onClick={() => {
                    setIsEditMode(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center gap-3 text-slate-300 transition-colors border-b border-slate-800"
                >
                  <Edit3 size={14} className="text-brand-400" />
                  <span className="text-xs font-medium">Edit Profile</span>
                </button>
                <button
                  onClick={() => {
                    handleCall();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center gap-3 text-slate-300 transition-colors"
                >
                  <Phone size={14} className="text-blue-400" />
                  <span className="text-xs font-medium">Call Customer</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-4 flex-1">
          {/* Identity Section */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-slate-800 p-1 mb-2.5 shadow-xl">
              <div className="w-full h-full bg-slate-800 rounded-xl flex items-center justify-center">
                {customer.type === "VIP" ? (
                  <Building size={28} className="text-purple-400" />
                ) : (
                  <User size={28} className="text-brand-400" />
                )}
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">
              {customer.name}
            </h2>

            <div className="flex items-center gap-2 mb-3">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                  customer.type === "VIP"
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : "bg-brand-500/10 text-brand-400 border-brand-500/20"
                }`}
              >
                {customer.type}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                  customerStats.walletBalance > 0
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                }`}
              >
                Wallet: ₹{customerStats.walletBalance.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2.5 w-full mb-5">
              <button
                onClick={handleCall}
                className="flex-1 flex flex-col items-center justify-center py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 active:bg-slate-800 active:text-white transition-all gap-1 group"
              >
                <Phone size={16} />
                <span className="text-[10px] font-medium">Call</span>
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex-1 flex flex-col items-center justify-center py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 active:bg-slate-800 active:text-white transition-all gap-1 group"
              >
                <MessageSquare size={16} />
                <span className="text-[10px] font-medium">Message</span>
              </button>
              <button
                onClick={() => setIsCollectPaymentOpen(true)}
                className="flex-1 flex flex-col items-center justify-center py-2 rounded-xl bg-brand-600 text-white font-bold shadow-lg shadow-brand-500/20 active:bg-brand-700 active:scale-95 transition-all gap-1"
              >
                <IndianRupee size={16} />
                <span className="text-[10px] font-medium">Pay</span>
              </button>
              <button
                onClick={() => setIsAddWalletOpen(true)}
                className="flex-1 flex flex-col items-center justify-center py-2 rounded-xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20 active:bg-emerald-700 active:scale-95 transition-all gap-1"
              >
                <Plus size={16} />
                <span className="text-[10px] font-medium">Wallet</span>
              </button>
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="flex items-center p-1 bg-slate-900/80 rounded-xl border border-slate-800 mb-5 sticky top-[54px] z-20 backdrop-blur-md shadow-lg shadow-black/20">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-300 relative ${
                  activeTab === tab.id
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {activeTab === tab.id && (
                  <span className="absolute inset-0 bg-slate-800 rounded-lg shadow-sm -z-10 animate-in fade-in zoom-in-95 duration-200"></span>
                )}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile Tab Content */}
          <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
            {activeTab === "overview" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                    Performance
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-4 text-white shadow-lg shadow-brand-500/20 relative overflow-hidden">
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold opacity-80 mb-1 uppercase tracking-wide">
                          Total Sales
                        </p>
                        <p className="text-xl font-bold">
                          ₹{(customerStats.totalSales / 1000).toFixed(1)}k
                        </p>
                      </div>
                      <TrendingUp
                        className="absolute right-2 bottom-2 text-white opacity-20"
                        size={40}
                      />
                    </div>
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-4 text-white relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            Total Due
                          </p>
                          {customerStats.totalDue > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          )}
                        </div>
                        <p
                          className={`text-xl font-bold ${
                            customerStats.totalDue > 0
                              ? "text-rose-400"
                              : "text-emerald-400"
                          }`}
                        >
                          ₹{customerStats.totalDue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                    Recent Activity
                  </h3>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/50">
                    {customerStats.salesHistory.length > 0 ? (
                      customerStats.salesHistory.slice(0, 3).map((sale) => (
                        <div
                          key={sale.id}
                          className="p-3.5 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-1.5 rounded-lg border ${getStatusColor(
                                sale.paymentStatus
                              )}`}
                            >
                              <Package size={14} />
                            </div>
                            <div>
                              <p className="text-white font-semibold text-xs">
                                Sale #{sale.id.slice(-6)}
                              </p>
                              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Clock size={10} /> {sale.date}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold text-xs">
                              ₹{sale.totalAmount.toLocaleString()}
                            </p>
                            <span
                              className={`text-[9px] font-bold ${
                                sale.paymentStatus === "Paid"
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {sale.paymentStatus}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-xs">
                        No recent activity.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sales" && (
              <div className="space-y-3">
                {customerStats.salesHistory.map((sale) => (
                  <div
                    key={sale.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3.5"
                  >
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <p className="text-white font-bold text-xs">
                          Order #{sale.id.slice(-6)}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {sale.date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-sm">
                          ₹{sale.totalAmount.toLocaleString()}
                        </p>
                        <p
                          className={`text-[10px] ${
                            sale.paymentStatus === "Paid"
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {sale.paymentStatus}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 border-t border-slate-800 pt-2.5 mt-1">
                      <button
                        onClick={() => handleCollectPayment(sale.id)}
                        className="flex-1 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-[10px] font-medium border border-brand-500/20 hover:bg-brand-500 hover:text-white transition-colors"
                      >
                        Pay
                      </button>
                      <button
                        onClick={() => handleDeleteSale(sale.id)}
                        disabled={isDeleting === sale.id}
                        className="flex-1 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-[10px] font-medium border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting === sale.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "payments" && (
              <div className="space-y-3">
                {customerStats.salesHistory.map((sale) => (
                  <div
                    key={sale.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg border ${
                          sale.paidAmount === sale.totalAmount
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        <CreditCard size={16} />
                      </div>
                      <div>
                        <p className="text-white font-medium text-xs">
                          #{sale.id.slice(-6)}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {sale.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">
                        ₹{sale.paidAmount.toLocaleString()}
                      </p>
                      <button
                        onClick={() => handleDeleteSale(sale.id)}
                        className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-5">
                  Activity Timeline
                </h3>
                <div className="relative border-l-2 border-slate-800 ml-1.5 space-y-5">
                  {customerStats.salesHistory.map((sale) => (
                    <div key={sale.id} className="relative pl-5">
                      <span
                        className={`absolute -left-[7px] top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${
                          sale.paymentStatus === "Paid"
                            ? "bg-emerald-500"
                            : "bg-brand-500"
                        }`}
                      ></span>
                      <div className="mb-0.5 flex justify-between">
                        <span className="text-white font-medium text-xs">
                          Order Placed
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {sale.date}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[10px]">
                        New order #{sale.id.slice(-6)} created.
                      </p>
                      <button
                        onClick={() => handleDeleteSale(sale.id)}
                        className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors mt-1"
                      >
                        Delete this entry
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col h-full min-h-0">
        {/* Main Dashboard Grid */}
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0 max-w-[1600px] mx-auto w-full">
          {/* LEFT SIDEBAR: Static Profile & Actions */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar pr-1">
            {/* Profile Card with Gradient */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-50"></div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-slate-950 border-2 border-slate-800 flex items-center justify-center mb-3 shadow-2xl relative">
                  {customer.type === "VIP" ? (
                    <Building size={32} className="text-purple-400" />
                  ) : (
                    <User size={32} className="text-brand-400" />
                  )}
                  <div className="absolute -bottom-2 px-2.5 py-0.5 bg-slate-800 rounded-full border border-slate-700 text-[9px] font-bold uppercase tracking-wider text-slate-300">
                    {customer.type}
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white mb-0.5 tracking-tight">
                  {customer.name}
                </h2>
                <p className="text-slate-500 text-xs mb-5">
                  Customer since 2023
                </p>

                <div className="w-full space-y-2 mb-5">
                  <div className="flex items-center gap-2.5 text-xs text-slate-400 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50 transition-colors hover:border-slate-700">
                    <Phone size={14} className="text-slate-500" />
                    <span className="font-medium text-slate-300">
                      {customer.phone}
                    </span>
                  </div>
                  {customer.address && (
                    <div className="flex items-center gap-2.5 text-xs text-slate-400 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50 transition-colors hover:border-slate-700">
                      <MapPin
                        size={14}
                        className="text-slate-500 flex-shrink-0"
                      />
                      <span className="font-medium text-slate-300 truncate">
                        {customer.address}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-xs text-slate-400 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50 transition-colors hover:border-slate-700">
                    <Wallet size={14} className="text-emerald-500" />
                    <span className="font-medium text-emerald-400">
                      Wallet: ₹{customerStats.walletBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full">
                  <button
                    onClick={handleCall}
                    className="py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-xs font-semibold flex items-center justify-center gap-1.5 group"
                  >
                    <Phone
                      size={14}
                      className="group-hover:scale-110 transition-transform"
                    />{" "}
                    Call
                  </button>
                  <button
                    onClick={handleWhatsApp}
                    className="py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-xs font-semibold flex items-center justify-center gap-1.5 group"
                  >
                    <MessageSquare
                      size={14}
                      className="group-hover:scale-110 transition-transform"
                    />{" "}
                    Msg
                  </button>
                </div>
              </div>
            </div>

            {/* Financial Stats Widget */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="space-y-4 relative z-10">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Outstanding Dues
                    </span>
                    {customerStats.totalDue > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-slate-500 text-sm font-medium">
                      ₹
                    </span>
                    <p
                      className={`text-3xl font-bold tracking-tight ${
                        customerStats.totalDue > 0
                          ? "text-white"
                          : "text-emerald-400"
                      }`}
                    >
                      {customerStats.totalDue.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIsCollectPaymentOpen(true)}
                    className="py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-bold hover:shadow-lg hover:shadow-brand-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                  >
                    <IndianRupee size={16} /> Pay
                  </button>
                  <button
                    onClick={() => setIsAddWalletOpen(true)}
                    className="py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-bold hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                  >
                    <Plus size={16} /> Wallet
                  </button>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-brand-500/10 rounded-full blur-3xl"></div>
            </div>
          </div>

          {/* RIGHT CONTENT: Glass Dashboard */}
          <div className="col-span-12 lg:col-span-9 flex flex-col bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl">
            {/* Top Navigation Bar */}
            <div className="flex-none flex items-center justify-between px-5 py-3 border-b border-slate-800/60 bg-slate-900/20">
              <div className="flex items-center gap-1 p-1 bg-slate-950/50 rounded-lg border border-slate-800/50">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-300 ${
                        isActive
                          ? "bg-slate-800 text-white shadow-md"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                      }`}
                    >
                      <Icon
                        size={14}
                        className={isActive ? "text-brand-400" : "opacity-70"}
                      />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setIsEditMode(true)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border border-transparent hover:border-slate-700"
              >
                <Edit3 size={16} />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
              {activeTab === "overview" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="xl:col-span-2 bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-5 text-white shadow-lg shadow-brand-900/20 relative overflow-hidden group">
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold opacity-70 mb-1 uppercase tracking-wide">
                          Total Revenue
                        </p>
                        <p className="text-3xl font-bold">
                          ₹{(customerStats.totalSales / 1000).toFixed(1)}k
                        </p>
                        <div className="mt-3 flex items-center gap-2 opacity-80">
                          <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-medium">
                            {customerStats.totalOrders} Orders
                          </span>
                          <span className="text-[10px]">
                            Avg. ₹{Math.round(customerStats.avgOrder / 1000)}k /
                            order
                          </span>
                        </div>
                      </div>
                      <TrendingUp className="absolute right-0 bottom-0 text-white opacity-10 w-28 h-28 transform group-hover:scale-110 transition-transform duration-700" />
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800/60 rounded-2xl p-5 relative group overflow-hidden hover:border-slate-700 transition-colors">
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Wallet Balance
                        </p>
                        <p className="text-2xl font-bold text-emerald-400">
                          ₹{customerStats.walletBalance.toLocaleString()}
                        </p>
                        <button
                          onClick={() => setIsAddWalletOpen(true)}
                          className="mt-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-colors"
                        >
                          Add Balance
                        </button>
                      </div>
                      <Wallet
                        className="absolute right-4 bottom-4 text-emerald-500/20 group-hover:text-emerald-500/30 transition-colors"
                        size={32}
                      />
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800/60 rounded-2xl p-5 relative group overflow-hidden hover:border-slate-700 transition-colors">
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Last Active
                        </p>
                        <p className="text-lg font-bold text-white">
                          {customerStats.lastActivity}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Date of last order
                        </p>
                      </div>
                      <Calendar
                        className="absolute right-4 bottom-4 text-slate-800 group-hover:text-slate-700 transition-colors"
                        size={32}
                      />
                    </div>
                  </div>

                  {/* Recent Activity Table Preview */}
                  <div>
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      Recent Orders{" "}
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium">
                        {customerStats.salesHistory.length}
                      </span>
                    </h3>
                    <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900/50 border-b border-slate-800/50">
                          <tr>
                            <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-6">
                              Order ID
                            </th>
                            <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {customerStats.salesHistory
                            .slice(0, 5)
                            .map((sale) => (
                              <tr
                                key={sale.id}
                                className="hover:bg-slate-800/30 transition-colors group cursor-default"
                              >
                                <td className="px-5 py-3 pl-6">
                                  <span className="text-white font-medium font-mono text-xs group-hover:text-brand-400 transition-colors">
                                    #{sale.id.slice(-6)}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-slate-400 text-xs">
                                  {sale.date}
                                </td>
                                <td className="px-5 py-3 text-white font-medium text-xs">
                                  ₹{sale.totalAmount.toLocaleString()}
                                </td>
                                <td className="px-5 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${getStatusColor(
                                      sale.paymentStatus
                                    )}`}
                                  >
                                    {sale.paymentStatus}
                                  </span>
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() =>
                                        handleCollectPayment(sale.id)
                                      }
                                      className="px-2 py-1 rounded-md bg-brand-500/10 text-brand-400 text-[10px] border border-brand-500/20 hover:bg-brand-500 hover:text-white transition-colors"
                                    >
                                      Pay
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSale(sale.id)}
                                      disabled={isDeleting === sale.id}
                                      className="px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 text-[10px] border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isDeleting === sale.id
                                        ? "..."
                                        : "Delete"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "sales" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800/50 sticky top-0 z-10">
                        <tr>
                          <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-6">
                            Order Details
                          </th>
                          <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Items
                          </th>
                          <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right pr-6">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {customerStats.salesHistory.map((sale) => (
                          <tr
                            key={sale.id}
                            className="hover:bg-slate-800/30 transition-colors group"
                          >
                            <td className="px-5 py-3 pl-6">
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 group-hover:border-brand-500/30 group-hover:text-brand-400 transition-colors">
                                  <Package size={14} />
                                </div>
                                <span className="text-white font-medium text-xs">
                                  #{sale.id.slice(-6)}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-slate-400 text-xs">
                              {sale.date}
                            </td>
                            <td className="px-5 py-3 text-slate-400 text-xs">
                              {sale.items.length} Items
                            </td>
                            <td className="px-5 py-3 text-white font-medium text-xs">
                              ₹{sale.totalAmount.toLocaleString()}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${getStatusColor(
                                  sale.paymentStatus
                                )}`}
                              >
                                {sale.paymentStatus}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right pr-6">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleCollectPayment(sale.id)}
                                  className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                  title="Pay"
                                >
                                  <IndianRupee size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSale(sale.id)}
                                  disabled={isDeleting === sale.id}
                                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete"
                                >
                                  {isDeleting === sale.id ? (
                                    <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "payments" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
                  {customerStats.salesHistory.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-xl border ${
                            sale.paidAmount === sale.totalAmount
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm group-hover:text-brand-400 transition-colors">
                            Order #{sale.id.slice(-6)}
                          </p>
                          <div className="flex items-center gap-2 text-slate-500 text-xs mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {sale.date}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                            <span>Via UPI</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">
                          Paid Amount
                        </p>
                        <p className="text-xl font-bold text-white tracking-tight">
                          ₹{sale.paidAmount.toLocaleString()}
                        </p>
                        <button
                          onClick={() => handleDeleteSale(sale.id)}
                          className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors mt-1"
                        >
                          Remove Payment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "activity" && (
                <div className="p-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="relative border-l-2 border-slate-800/50 ml-2 space-y-8">
                    {customerStats.salesHistory.map((sale) => (
                      <div key={sale.id} className="relative pl-8 group">
                        <span
                          className={`absolute -left-[7px] top-2 h-3.5 w-3.5 rounded-full border-[3px] border-slate-900 shadow-md group-hover:scale-125 transition-transform duration-300 ${
                            sale.paymentStatus === "Paid"
                              ? "bg-emerald-500"
                              : "bg-brand-500"
                          }`}
                        ></span>

                        <div className="bg-slate-950/50 border border-slate-800/50 p-4 rounded-2xl hover:border-slate-700 hover:bg-slate-900/80 transition-all shadow-sm">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                                <Package size={14} />
                              </span>
                              <p className="text-white font-bold text-sm">
                                New Order{" "}
                                <span className="text-brand-400">
                                  #{sale.id.slice(-6)}
                                </span>
                              </p>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                              {sale.date}
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs leading-relaxed">
                            Order placed successfully with{" "}
                            <span className="text-slate-200 font-medium">
                              {sale.items.length} items
                            </span>{" "}
                            worth{" "}
                            <span className="text-white font-bold">
                              ₹{sale.totalAmount.toLocaleString()}
                            </span>
                            . Status is currently{" "}
                            <span
                              className={`lowercase px-1.5 py-0.5 rounded text-[10px] border ${getStatusColor(
                                sale.paymentStatus
                              )}`}
                            >
                              {sale.paymentStatus}
                            </span>
                            .
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => handleCollectPayment(sale.id)}
                              className="px-2 py-1 rounded-md bg-brand-500/10 text-brand-400 text-[10px] border border-brand-500/20 hover:bg-brand-500 hover:text-white transition-colors"
                            >
                              Record Payment
                            </button>
                            <button
                              onClick={() => handleDeleteSale(sale.id)}
                              className="px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 text-[10px] border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-colors"
                            >
                              Delete Entry
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collect Payment Modal */}
      {isCollectPaymentOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsCollectPaymentOpen(false)}
          ></div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 relative z-10">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400">
                  <IndianRupee size={16} />
                </div>
                Collect Payment
              </h3>
              <button
                onClick={() => setIsCollectPaymentOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Link to Order
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-brand-500"
                  value={selectedSaleForPayment || ""}
                  onChange={(e) => {
                    setSelectedSaleForPayment(e.target.value);
                    const sale = customerStats?.salesHistory.find(
                      (s) => s.id === e.target.value
                    );
                    if (sale)
                      setPaymentAmount(sale.totalAmount - sale.paidAmount);
                  }}
                >
                  <option value="" className="bg-slate-950 text-slate-500">
                    General Payment (On Account)
                  </option>
                  {customerStats?.salesHistory.map((sale) => (
                    <option
                      key={sale.id}
                      value={sale.id}
                      className="bg-slate-950"
                    >
                      Order #{sale.id.slice(-6)} — Due: ₹
                      {(sale.totalAmount - sale.paidAmount).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Amount
                </label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base">
                    ₹
                  </span>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2.5 text-white text-base font-bold outline-none focus:border-brand-500"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => setIsCollectPaymentOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPayment}
                disabled={isProcessingPayment}
                className="flex-[2] py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-500 transition-colors shadow-lg shadow-brand-500/25 text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Payment"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Wallet Modal */}
      {isAddWalletOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsAddWalletOpen(false)}
          ></div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 relative z-10">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Wallet size={16} />
                </div>
                Add to Wallet
              </h3>
              <button
                onClick={() => setIsAddWalletOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Amount to Add
                </label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base">
                    ₹
                  </span>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2.5 text-white text-base font-bold outline-none focus:border-emerald-500"
                    placeholder="0.00"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-emerald-500 resize-none h-20"
                  placeholder="Enter notes for this transaction..."
                  value={walletNotes}
                  onChange={(e) => setWalletNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => setIsAddWalletOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToWallet}
                disabled={isProcessingWallet}
                className="flex-[2] py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/25 text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessingWallet ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Add to Wallet"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {isEditMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsEditMode(false)}
          ></div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 relative z-10">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <Edit3 size={16} />
                </div>
                Edit Customer
              </h3>
              <button
                onClick={() => setIsEditMode(false)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-blue-500"
                  defaultValue={customer.name}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-blue-500"
                  defaultValue={customer.phone}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Type
                </label>
                <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
                  <button
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      customer.type === "Regular"
                        ? "bg-slate-800 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Regular
                  </button>
                  <button
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      customer.type === "VIP"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    VIP
                  </button>
                </div>
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => setIsEditMode(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsEditMode(false)}
                className="flex-[2] py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/25 text-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
