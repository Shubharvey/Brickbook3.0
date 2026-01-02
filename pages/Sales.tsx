import React, { useState, useMemo, useEffect } from "react";
import { useStore } from "../context/Store";
import {
  Sale,
  SaleItem,
  PaymentStatus,
  DeliveryStatus,
  Customer,
} from "../types";
import {
  Plus,
  Search,
  Calendar,
  Printer,
  Save,
  ChevronDown,
  X,
  UserPlus,
  ArrowRight,
  Check,
  Monitor,
  Trash2,
  CreditCard,
  Package,
  IndianRupee,
  AlertCircle,
  Wallet,
  Clock,
  ReceiptText,
} from "lucide-react";

// --- Constants ---
const BRICK_TYPES = [
  "Awwal",
  "Doyam",
  "Number 3",
  "Seedha Chatka",
  "Talsa",
  "Peela",
  "Addha",
  "Teda",
  "Raavas",
  "Malwa",
  "Others",
];

const PAYMENT_TYPES = [
  "Cash",
  "Credit",
  "Dues + Cash",
  "Advance + Cash",
  "Full Advance",
];

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque"];
const DELIVERY_STATUSES = ["Pending", "Scheduled", "Delivered"];
const DISCOUNT_TYPES = ["Fixed", "Percentage"];

type ViewMode = "single" | "bulk" | "backdated";

interface BulkRow {
  id: string;
  date: string;
  itemType: string;
  customItemName: string;
  quantity: number | string;
  rate: number | string;
  amount: number;
}

interface PaymentRow {
  id: string;
  date: string;
  amount: number | string;
  mode: string;
}

const Sales: React.FC = () => {
  const { customers, addSale, addCustomer, getAuthHeaders } = useStore(); // ADD getAuthHeaders here

  // --- View State ---
  const [view, setView] = useState<ViewMode>("single");
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoading, setIsLoading] = useState(false);

  // --- Shared State ---
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  // --- Single Entry State ---
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedProductType, setSelectedProductType] = useState(
    BRICK_TYPES[0]
  );
  const [customProductName, setCustomProductName] = useState("");
  const [qty, setQty] = useState<number | "">("");
  const [rate, setRate] = useState<number | "">("");
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);

  // Updated Payment State
  const [paymentType, setPaymentType] = useState(PAYMENT_TYPES[0]);
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES[0]);
  const [advancePaid, setAdvancePaid] = useState<number | "">("");
  const [dueAmount, setDueAmount] = useState<number | "">("");
  const [dueDate, setDueDate] = useState("");
  const [walletUsed, setWalletUsed] = useState<number | "">("");

  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [deliveryStatus, setDeliveryStatus] = useState<string>(
    DeliveryStatus.PENDING
  );
  const [discountType, setDiscountType] = useState<"Percentage" | "Fixed">(
    "Fixed"
  );
  const [discountValue, setDiscountValue] = useState<number | "">("");

  // --- Bulk Entry State ---
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([
    {
      id: "1",
      date: new Date().toISOString().split("T")[0],
      itemType: BRICK_TYPES[0],
      customItemName: "",
      quantity: "",
      rate: "",
      amount: 0,
    },
  ]);
  const [bulkPaymentRows, setBulkPaymentRows] = useState<PaymentRow[]>([]);

  // --- Backdated Entry State ---
  const [backdatedDate, setBackdatedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // --- New Customer State ---
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    type: "Regular",
  });

  // Handle Resize for Mobile Check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Reset payment fields when payment type changes
  useEffect(() => {
    setAdvancePaid("");
    setDueAmount("");
    setWalletUsed("");
    setDueDate("");
  }, [paymentType]);

  // --- Helpers ---
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.phone.includes(customerSearchQuery)
  );

  // --- Single Entry Calculations ---
  const calculateSubtotal = () =>
    cartItems.reduce((sum, item) => sum + item.amount, 0);

  const calculateGrandTotal = () => {
    const sub = calculateSubtotal();
    let disc = 0;
    if (discountValue) {
      disc =
        discountType === "Fixed"
          ? Number(discountValue)
          : (sub * Number(discountValue)) / 100;
    }
    return Math.max(0, sub - disc);
  };

  // Payment Calculations based on payment type
  const calculatePaymentBreakdown = () => {
    const grandTotal = calculateGrandTotal();
    let cashPaid = 0;
    let walletAmount = 0;
    let dueAmountCalc = 0;

    switch (paymentType) {
      case "Cash":
        cashPaid = grandTotal;
        break;

      case "Credit":
        dueAmountCalc = grandTotal;
        break;

      case "Dues + Cash":
        cashPaid = Number(advancePaid) || 0;
        dueAmountCalc = Math.max(0, grandTotal - cashPaid);
        break;

      case "Advance + Cash":
        walletAmount = Math.min(Number(walletUsed) || 0, grandTotal);
        cashPaid = Math.max(0, grandTotal - walletAmount);
        break;

      case "Full Advance":
        walletAmount = grandTotal;
        break;
    }

    return { cashPaid, walletAmount, dueAmount: dueAmountCalc, grandTotal };
  };

  // Determine payment status
  const getPaymentStatus = () => {
    const {
      cashPaid,
      walletAmount,
      dueAmount: d,
      grandTotal,
    } = calculatePaymentBreakdown();
    const totalPaid = cashPaid + walletAmount;

    if (totalPaid >= grandTotal) return PaymentStatus.PAID;
    if (totalPaid > 0) return PaymentStatus.PARTIAL;
    return "Pending";
  };

  // --- Single Entry Handlers ---
  const handleAddItem = () => {
    if (!qty || !rate) return;
    const productName =
      selectedProductType === "Others"
        ? customProductName
        : selectedProductType;
    if (!productName) return;
    const newItem: SaleItem = {
      id: `TEMP-${Date.now()}`,
      name: productName,
      quantity: Number(qty),
      price: Number(rate),
      amount: Number(qty) * Number(rate),
    };
    setCartItems([...cartItems, newItem]);
    setQty("");
    setCustomProductName("");
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  // --- SUBMIT HANDLER: SINGLE ---
  const handleSingleSubmit = async () => {
    if (!selectedCustomerId || cartItems.length === 0) {
      alert("Please select a customer and add items to the cart.");
      return;
    }

    try {
      setIsLoading(true);

      const {
        cashPaid,
        walletAmount,
        dueAmount: calculatedDueAmount,
        grandTotal,
      } = calculatePaymentBreakdown();

      const paymentStatus = getPaymentStatus();

      let actualAdvancePaid = 0;
      let actualDueAmount = calculatedDueAmount;

      if (paymentType === "Dues + Cash") {
        actualAdvancePaid = Number(advancePaid) || 0;
      } else if (paymentType === "Advance + Cash") {
        actualAdvancePaid = walletAmount;
      } else if (paymentType === "Full Advance") {
        actualAdvancePaid = walletAmount;
        actualDueAmount = 0;
      } else if (paymentType === "Credit") {
        actualAdvancePaid = 0;
        actualDueAmount = grandTotal;
      } else {
        actualAdvancePaid = grandTotal;
        actualDueAmount = 0;
      }

      const saleData = {
        customerId: selectedCustomerId,
        customerName: selectedCustomer?.name || "Unknown",
        date: view === "backdated" ? backdatedDate : date,

        items: cartItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          amount: item.amount,
        })),

        totalAmount: grandTotal,
        paidAmount: cashPaid + walletAmount,
        paymentStatus,
        deliveryStatus,
        paymentMode,
        paymentType,

        discount: {
          type: discountType,
          value: Number(discountValue) || 0,
        },

        advancePaid: actualAdvancePaid,
        dueAmount: actualDueAmount,
        dueDate: dueDate || null,
      };

      // USE getAuthHeaders HERE
      const headers = await getAuthHeaders();

      console.log("🔍 Sending sale with headers:", headers);

      const response = await fetch(
        "https://brickbook-backend.vercel.app/api/sales",
        {
          method: "POST",
          headers: headers,
          body: JSON.stringify(saleData),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed. Please login again.");
        }
        const errorText = await response.text();
        throw new Error(errorText || "Failed to save sale");
      }

      const savedSale = await response.json();

      addSale({
        id: savedSale.id,
        customerId: savedSale.customer_id,
        customerName: savedSale.customer_name,
        date: savedSale.sale_date,
        items: cartItems,
        totalAmount: savedSale.total_amount,
        paidAmount: savedSale.paid_amount,
        paymentStatus: savedSale.payment_status,
        deliveryStatus: savedSale.delivery_status,
      });

      setCartItems([]);
      setAdvancePaid("");
      setWalletUsed("");
      setDueDate("");
      setDiscountValue("");
      setSelectedCustomerId("");

      alert("✅ Sale saved successfully");
    } catch (error: any) {
      console.error("❌ Sale submission error:", error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- SUBMIT HANDLER: BULK ---
  const handleBulkAddRow = () => {
    const lastRow = bulkRows[bulkRows.length - 1];
    setBulkRows([
      ...bulkRows,
      {
        id: Date.now().toString(),
        date: lastRow ? lastRow.date : new Date().toISOString().split("T")[0],
        itemType: BRICK_TYPES[0],
        customItemName: "",
        quantity: "",
        rate: lastRow ? lastRow.rate : "",
        amount: 0,
      },
    ]);
  };

  const handleBulkRowChange = (
    id: string,
    field: keyof BulkRow,
    value: any
  ) => {
    setBulkRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === "quantity" || field === "rate") {
          const q = field === "quantity" ? Number(value) : Number(row.quantity);
          const r = field === "rate" ? Number(value) : Number(row.rate);
          updated.amount = (q || 0) * (r || 0);
        }
        return updated;
      })
    );
  };

  const handleBulkSubmit = async () => {
    if (!selectedCustomerId) {
      alert("Please select a customer first.");
      return;
    }

    try {
      setIsLoading(true);
      const validRows = bulkRows.filter(
        (r) => r.quantity && r.rate && r.amount > 0
      );

      if (validRows.length === 0) {
        alert("Please add at least one valid row.");
        return;
      }

      // USE getAuthHeaders HERE TOO
      const headers = await getAuthHeaders();

      for (const row of validRows) {
        const originalId = `BULK-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        const saleData = {
          id: originalId,
          customerId: selectedCustomerId,
          customerName: selectedCustomer?.name || "",
          date: row.date,
          items: [
            {
              name:
                row.itemType === "Others" ? row.customItemName : row.itemType,
              quantity: Number(row.quantity),
              price: Number(row.rate),
              amount: row.amount,
            },
          ],
          totalAmount: row.amount,
          paidAmount: 0,
          paymentStatus: "Pending",
          deliveryStatus: "Pending",
          paymentMode: "Cash",
          paymentType: "Credit",
        };

        const response = await fetch(
          "https://brickbook-backend.vercel.app/api/sales",
          {
            method: "POST",
            headers: headers,
            body: JSON.stringify(saleData),
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication failed. Please login again.");
          }
          const errorText = await response.text();
          throw new Error(`Bulk save failed: ${errorText}`);
        }

        const saved = await response.json();

        // Transform to frontend Sale type
        const frontendSale: Sale = {
          id: saved.id?.toString() || Date.now().toString(),
          customerId: saved.customer_id?.toString() || selectedCustomerId,
          customerName: saved.customer_name || selectedCustomer?.name || "",
          date: saved.sale_date || row.date,
          items: saved.items?.map((item: any) => ({
            productId: item.id?.toString() || Date.now().toString(),
            productName: item.item_name || item.name || "Item",
            quantity: item.quantity,
            rate: item.unit_price || item.price,
            amount: item.amount || item.total_price,
          })) || [
            {
              productId: Date.now().toString(),
              productName:
                row.itemType === "Others" ? row.customItemName : row.itemType,
              quantity: Number(row.quantity),
              rate: Number(row.rate),
              amount: row.amount,
            },
          ],
          totalAmount: saved.total_amount || row.amount,
          paidAmount: saved.paid_amount || 0,
          paymentStatus: saved.payment_status || "Pending",
          deliveryStatus: saved.delivery_status || "Pending",
        };

        addSale(frontendSale);
      }

      alert("Bulk entries processed successfully!");
      setBulkRows([
        {
          id: "1",
          date: new Date().toISOString().split("T")[0],
          itemType: BRICK_TYPES[0],
          customItemName: "",
          quantity: "",
          rate: "",
          amount: 0,
        },
      ]);
    } catch (error: any) {
      console.error("❌ Bulk submission error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.name) return;

    try {
      const customer: Customer = {
        id: "", // Will be set by backend
        name: newCustomer.name,
        phone: newCustomer.phone,
        address: newCustomer.address,
        type: newCustomer.type as any,
        walletBalance: 0,
        totalDues: 0,
        lastActive: new Date().toISOString().split("T")[0],
      };

      // addCustomer now returns the created customer with backend ID
      const savedCustomer = await addCustomer(customer);

      // Use the backend-generated ID
      setSelectedCustomerId(savedCustomer.id);
      setCustomerSearchQuery(savedCustomer.name);
      setIsAddCustomerOpen(false);
      setNewCustomer({ name: "", phone: "", address: "", type: "Regular" });
    } catch (error) {
      console.error("Failed to save customer:", error);
      alert("Failed to save customer. Please try again.");
    }
  };

  const renderPaymentInputs = () => {
    const grandTotal = calculateGrandTotal();
    const customerWallet = selectedCustomer?.walletBalance || 0;

    switch (paymentType) {
      case "Dues + Cash":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Cash Paid Now
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-sm text-white outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <Clock size={12} /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-500 color-scheme-dark"
              />
            </div>
          </div>
        );
      case "Advance + Cash":
        return (
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
            <span className="text-xs text-slate-500 block mb-2">
              Wallet: ₹{customerWallet.toLocaleString()}
            </span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                ₹
              </span>
              <input
                type="number"
                placeholder="Use from wallet"
                value={walletUsed}
                onChange={(e) => setWalletUsed(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-sm text-white outline-none focus:border-brand-500"
              />
            </div>
          </div>
        );
      case "Full Advance":
        return (
          <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold">
            Full payment from Wallet: ₹{grandTotal.toLocaleString()}
          </div>
        );
      case "Credit":
        return (
          <div className="space-y-4">
            <div className="text-center p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 font-bold">
              Credit Sale: ₹{grandTotal.toLocaleString()}
            </div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-500 color-scheme-dark"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20 md:pb-0 text-slate-200">
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 md:px-6 h-16 flex items-center justify-between">
        <div className="relative">
          <button
            onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
            className="flex items-center gap-2 group"
          >
            <h1 className="text-lg md:text-xl font-bold text-white group-hover:text-brand-400 transition-colors flex items-center gap-2">
              {view === "single"
                ? "New Sale"
                : view === "bulk"
                ? "Bulk Entries"
                : "Backdated Entry"}
            </h1>
            <ChevronDown
              size={18}
              className={`text-slate-500 transition-transform ${
                isViewMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {isViewMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50">
              {["single", "bulk", "backdated"].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setView(m as ViewMode);
                    setIsViewMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-800 capitalize ${
                    view === m ? "text-brand-400 font-bold" : "text-slate-300"
                  }`}
                >
                  {m} Entry
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 max-w-md mx-4 md:mx-8 relative">
          <div className="relative flex items-center bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 focus-within:border-brand-500 transition-all">
            <Search className="ml-3 text-slate-500" size={16} />
            <input
              type="text"
              className="w-full bg-transparent border-none text-sm text-white px-3 py-2 outline-none"
              placeholder="Search Customer..."
              value={customerSearchQuery}
              onChange={(e) => {
                setCustomerSearchQuery(e.target.value);
                setIsCustomerSearchOpen(true);
              }}
              onFocus={() => setIsCustomerSearchOpen(true)}
            />
            <button
              onClick={() => setIsAddCustomerOpen(true)}
              className="mr-2 p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-brand-400 transition-colors"
            >
              <UserPlus size={14} />
            </button>
          </div>
          {isCustomerSearchOpen &&
            customerSearchQuery &&
            !selectedCustomerId && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-40">
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setCustomerSearchQuery(c.name);
                      setIsCustomerSearchOpen(false);
                    }}
                    className="p-3 hover:bg-slate-800 border-b border-slate-800/50 last:border-0 cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.phone}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">
                      ₹{c.walletBalance}
                    </span>
                  </div>
                ))}
              </div>
            )}
        </div>
      </header>

      {/* VIEW: SINGLE & BACKDATED (Share same structure) */}
      {(view === "single" || view === "backdated") && (
        <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {/* Backdated Date Picker Specific */}
            {view === "backdated" && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4">
                <Calendar className="text-amber-500" />
                <div className="flex-1">
                  <label className="block text-xs font-bold text-amber-500 uppercase">
                    Backdated Entry Date
                  </label>
                  <input
                    type="date"
                    value={backdatedDate}
                    onChange={(e) => setBackdatedDate(e.target.value)}
                    className="bg-transparent text-white font-bold text-lg outline-none w-full"
                  />
                </div>
              </div>
            )}

            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center gap-4 mb-8 text-brand-500 font-bold uppercase tracking-widest text-xs">
                <Package size={20} /> Item Management
              </div>
              <div className="grid grid-cols-12 gap-4 items-end mb-8">
                <div className="col-span-12 md:col-span-4">
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm outline-none focus:border-brand-500 appearance-none transition"
                    value={selectedProductType}
                    onChange={(e) => setSelectedProductType(e.target.value)}
                  >
                    {BRICK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-6 md:col-span-3">
                  <input
                    type="number"
                    placeholder="Qty"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <input
                    type="number"
                    placeholder="Rate"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm"
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                  />
                </div>
                <button
                  onClick={handleAddItem}
                  className="col-span-12 md:col-span-2 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl p-4 flex justify-center shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
                >
                  <Plus size={24} />
                </button>
              </div>
              <div className="space-y-4">
                {cartItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center bg-slate-950/50 p-6 rounded-2xl border border-slate-800 group hover:border-brand-500 transition-all"
                  >
                    <div className="flex flex-col">
                      <p className="font-black text-white text-lg">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                        {item.quantity} units @ ₹{item.price}
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-mono font-black text-brand-400 text-xl">
                        ₹{item.amount.toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-700 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Payment Category
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm outline-none"
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                >
                  {PAYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Channel
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm outline-none"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  {PAYMENT_MODES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-800/50">
                {renderPaymentInputs()}
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition duration-700 pointer-events-none">
                <ReceiptText size={180} />
              </div>
              <h3 className="text-2xl font-black mb-10 flex items-center gap-4 text-white">
                <div className="w-2 h-8 bg-brand-500 rounded-full"></div>{" "}
                Summary
              </h3>
              <div className="space-y-8 mb-12">
                <div className="flex justify-between text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <span>Subtotal Value</span>
                  <span>₹{calculateSubtotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Adjustment</span>
                  <input
                    type="number"
                    className="w-28 bg-slate-950 border border-slate-800 rounded-xl p-3 text-right text-brand-400 font-black outline-none focus:border-brand-500 transition-all"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                  />
                </div>
                <div className="h-px bg-slate-800/50"></div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                    Final Order Value
                  </span>
                  <span className="text-5xl font-black text-brand-400 font-mono tracking-tighter">
                    ₹{calculateGrandTotal().toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSingleSubmit}
                disabled={isLoading || !selectedCustomerId}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-6 rounded-2xl transition-all flex items-center justify-center gap-4 shadow-2xl shadow-brand-500/30 active:scale-95 disabled:bg-slate-800 disabled:shadow-none disabled:text-slate-600"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={24} /> Execute Order
                  </>
                )}
              </button>
              {!selectedCustomerId && (
                <p className="text-[10px] text-rose-500/80 text-center mt-6 font-bold tracking-widest animate-pulse uppercase">
                  Search & Select Customer First
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: BULK (Table Layout) */}
      {view === "bulk" && (
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold flex items-center gap-3">
                <Monitor size={20} className="text-brand-500" /> Bulk Entry Mode
              </h3>
              <button
                onClick={handleBulkAddRow}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold transition flex items-center gap-2"
              >
                <Plus size={16} /> Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-800">
                    <th className="p-4">Date</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Qty</th>
                    <th className="p-4">Rate</th>
                    <th className="p-4">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {bulkRows.map((row) => (
                    <tr key={row.id} className="group hover:bg-slate-800/30">
                      <td className="p-2">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) =>
                            handleBulkRowChange(row.id, "date", e.target.value)
                          }
                          className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm w-36 outline-none focus:border-brand-500"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={row.itemType}
                          onChange={(e) =>
                            handleBulkRowChange(
                              row.id,
                              "itemType",
                              e.target.value
                            )
                          }
                          className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm w-40 outline-none focus:border-brand-500"
                        >
                          {BRICK_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={row.quantity}
                          onChange={(e) =>
                            handleBulkRowChange(
                              row.id,
                              "quantity",
                              e.target.value
                            )
                          }
                          className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm w-24 outline-none focus:border-brand-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          placeholder="Rate"
                          value={row.rate}
                          onChange={(e) =>
                            handleBulkRowChange(row.id, "rate", e.target.value)
                          }
                          className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm w-24 outline-none focus:border-brand-500"
                        />
                      </td>
                      <td className="p-4 font-mono font-bold text-brand-400">
                        ₹{row.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleBulkSubmit}
                disabled={isLoading || !selectedCustomerId}
                className="px-8 py-4 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold text-white shadow-xl shadow-brand-500/20 active:scale-95 disabled:bg-slate-800 disabled:shadow-none transition-all flex items-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={18} /> Process Bulk Entries
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsAddCustomerOpen(false)}
          ></div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-10 relative z-10 animate-in zoom-in duration-200">
            <h3 className="text-2xl font-black mb-10 flex items-center gap-4 text-white">
              <UserPlus className="text-brand-500" /> New Customer
            </h3>
            <div className="space-y-6 mb-12">
              <input
                placeholder="Name"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm outline-none focus:border-brand-500 transition-all"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
              />
              <input
                placeholder="Phone"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm outline-none focus:border-brand-500 transition-all"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
              />
              <textarea
                placeholder="Address"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm outline-none focus:border-brand-500 transition-all min-h-[100px]"
                value={newCustomer.address}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, address: e.target.value })
                }
              />
            </div>
            <div className="flex gap-6">
              <button
                className="flex-1 py-4 text-slate-500 font-bold text-sm uppercase tracking-widest"
                onClick={() => setIsAddCustomerOpen(false)}
              >
                Cancel
              </button>
              <button
                className="flex-2 py-4 bg-brand-600 rounded-2xl font-black text-white text-sm uppercase tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-all"
                onClick={handleSaveCustomer}
              >
                Create Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
