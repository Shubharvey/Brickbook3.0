import React, { useState, useMemo } from "react";
import { useStore } from "../context/Store";
import { Expense } from "../types";
import {
  Plus,
  Wallet,
  TrendingDown,
  Filter,
  Calendar,
  MapPin,
  Factory,
  Truck,
  Users,
  Droplets,
  FileText,
  ChevronDown,
} from "lucide-react";
import Dropdown from "../components/Dropdown";

// --- Constants & Mappings ---

const LOCATIONS = ["Bhatta", "Field"];

// Categories with their Sub-items and Location affinity (B=Bhatta, F=Field, Both)
const EXPENSE_CATEGORIES = {
  "COGS / Materials": [
    { name: "Reta (Sand)", type: "F" },
    { name: "Mitti (Clay)", type: "F" },
    { name: "Toori (Fuel)", type: "B" },
  ],
  Production: [
    { name: "Bharai (Loading)", type: "B" },
    { name: "Pathai (Molding)", type: "F" },
    { name: "Nikaasi (Unloading)", type: "B" },
    { name: "Saanche (Mold)", type: "F" },
    { name: "JCB Expense", type: "F" },
    { name: "Tractor", type: "B" },
    { name: "Mitti Machine", type: "F" },
    { name: "Mitti Dumping", type: "F" },
    { name: "Gas/Wood", type: "B" },
  ],
  Labour: [
    { name: "Salary", type: "Both" },
    { name: "Work Based Employee", type: "Both" },
    { name: "Yogendra Kumar", type: "B" },
  ],
  Utilities: [
    { name: "Diesel", type: "F" },
    { name: "Water Tap", type: "F" },
    { name: "Site Office Utilities", type: "B" },
  ],
  Transport: [
    { name: "Motor Bike", type: "B" },
    { name: "Vehicle Maintenance", type: "B" },
  ],
  "Rent & Lease": [{ name: "Pannalal (Lease)", type: "B" }],
  Admin: [{ name: "Bank Charges", type: "B" }],
  Taxes: [
    { name: "Sales Tax", type: "B" },
    { name: "Zila Panchayat", type: "B" },
    { name: "Royalty", type: "B" },
  ],
  Equity: [{ name: "Partnership Draw", type: "F" }],
  Personal: [{ name: "Owner Draw", type: "Both" }],
};

const Expenses: React.FC = () => {
  const { expenses, addExpense } = useStore();

  // --- Form State ---
  const [location, setLocation] = useState("Bhatta");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  // --- Filter State ---
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");

  // --- Helpers ---

  // Get available categories based on location
  const availableCategories = Object.keys(EXPENSE_CATEGORIES);

  // Get available sub-items based on selected category AND location
  const availableSubItems = useMemo(() => {
    if (!category) return [];
    const items =
      EXPENSE_CATEGORIES[category as keyof typeof EXPENSE_CATEGORIES];
    return items
      .filter(
        (item) =>
          item.type === "Both" ||
          (location === "Bhatta" && item.type === "B") ||
          (location === "Field" && item.type === "F")
      )
      .map((i) => i.name);
  }, [category, location]);

  const handleAdd = () => {
    if (!amount || !category || !subCategory) return;

    addExpense({
      id: `E-${Date.now()}`,
      category: category,
      subCategory: subCategory,
      amount: Number(amount),
      description: description || subCategory,
      date: date,
      location: location as "Bhatta" | "Field",
    });

    // Reset form
    setAmount("");
    setCategory("");
    setSubCategory("");
    setDescription("");
    alert("Expense Recorded Successfully");
  };

  // --- Metrics ---
  const filteredExpenses = expenses.filter((e) => {
    const matchLoc = filterLocation === "All" || e.location === filterLocation;
    const matchCat = filterCategory === "All" || e.category === filterCategory;
    return matchLoc && matchCat;
  });

  const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const bhattaTotal = expenses
    .filter((e) => e.location === "Bhatta")
    .reduce((sum, e) => sum + e.amount, 0);
  const fieldTotal = expenses
    .filter((e) => e.location === "Field")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="pb-24 md:pb-0 space-y-8">
      {/* --- Header --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expense Manager</h1>
          <p className="text-slate-400">Track operational costs.</p>
        </div>
        <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex">
          {LOCATIONS.map((loc) => (
            <button
              key={loc}
              onClick={() => setLocation(loc)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location === loc
                  ? "bg-red-500 text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* --- Smart Entry Form --- */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Date */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Date
            </label>
            <input
              type="date"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-white outline-none focus:border-red-500 color-scheme-dark text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Category
            </label>
            <Dropdown
              options={availableCategories}
              value={category}
              onSelect={(val) => {
                setCategory(val);
                setSubCategory("");
              }}
              className="w-full"
              placeholder="Select Category"
            />
          </div>

          {/* Sub Item */}
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Item / Particular
            </label>
            <Dropdown
              options={availableSubItems}
              value={subCategory}
              onSelect={setSubCategory}
              className="w-full"
              placeholder={category ? "Select Item" : "Select Category First"}
            />
          </div>

          {/* Amount */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                ₹
              </span>
              <input
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-3 text-white outline-none focus:border-red-500 transition-all"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Add Button */}
          <div className="md:col-span-2">
            <button
              onClick={handleAdd}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Plus size={18} /> Record
            </button>
          </div>
        </div>

        {/* Optional Description */}
        <div className="mt-4">
          <input
            type="text"
            className="w-full bg-transparent border-b border-slate-800 py-2 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-red-500 transition-colors"
            placeholder="Add optional note or description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {/* --- Dashboard Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Total Expenses
            </span>
            <p className="text-3xl font-bold text-white mt-2">
              ₹{totalExpense.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">Current Month</p>
          </div>
          <TrendingDown
            className="absolute right-4 bottom-4 text-red-500/20"
            size={64}
          />
        </div>

        {/* Location Split */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-orange-400">
              <Factory size={16} />
              <span className="font-medium text-sm">Bhatta</span>
            </div>
            <span className="font-bold text-white">
              ₹{bhattaTotal.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-orange-500 h-full"
              style={{
                width: `${
                  (bhattaTotal / (bhattaTotal + fieldTotal || 1)) * 100
                }%`,
              }}
            ></div>
            <div className="bg-emerald-500 h-full flex-1"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-emerald-400">
              <MapPin size={16} />
              <span className="font-medium text-sm">Field</span>
            </div>
            <span className="font-bold text-white">
              ₹{fieldTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-y-auto max-h-40 scrollbar-hide">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
            Breakdown
          </h3>
          <div className="space-y-3">
            {Object.keys(EXPENSE_CATEGORIES)
              .slice(0, 3)
              .map((cat) => {
                const catTotal = expenses
                  .filter((e) => e.category === cat)
                  .reduce((sum, e) => sum + e.amount, 0);
                if (catTotal === 0) return null;
                return (
                  <div
                    key={cat}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-slate-300">{cat}</span>
                    <span className="text-white font-mono">
                      ₹{catTotal.toLocaleString()}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* --- Ledger Table --- */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="text-red-500" size={20} /> Ledger
          </h2>
          <div className="flex gap-2">
            <Dropdown
              options={["All", "Bhatta", "Field"]}
              value={filterLocation}
              onSelect={setFilterLocation}
              className="w-32"
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Particulars</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">Loc</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs">
                      {expense.date}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">
                        {expense.subCategory}
                      </p>
                      {expense.description &&
                        expense.description !== expense.subCategory && (
                          <p className="text-xs text-slate-500">
                            {expense.description}
                          </p>
                        )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-300">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          expense.location === "Bhatta"
                            ? "text-orange-400 bg-orange-500/10"
                            : "text-emerald-400 bg-emerald-500/10"
                        }`}
                      >
                        {expense.location === "Bhatta" ? "B" : "F"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-white">
                      ₹{expense.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    No expenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
