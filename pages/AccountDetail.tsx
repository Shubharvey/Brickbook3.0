import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccounts } from "../context/AccountsContext";
import {
  ArrowLeft,
  Trash2,
  Edit2,
  Plus,
  Calendar,
  CreditCard,
  DollarSign,
} from "lucide-react";
import { Transaction } from "../types";

const AccountDetail: React.FC = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const {
    accounts,
    categories,
    locations,
    addTransaction,
    deleteTransaction,
    deleteAccount,
  } = useAccounts();
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [newTx, setNewTx] = useState({
    description: "",
    amount: "",
    type: "DEBIT" as "DEBIT" | "CREDIT",
    date: new Date().toISOString().split("T")[0],
  });

  const account = accounts.find((a) => a.id === accountId);

  if (!account) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Account not found.</p>
        <button
          onClick={() => navigate("/accounts")}
          className="text-brand-500 hover:underline"
        >
          Return to Accounts
        </button>
      </div>
    );
  }

  const category = categories.find((c) => c.id === account.categoryId);
  const location = locations.find((l) => l.id === account.locationId);

  // Calculate Net Status
  const netAmount = account.dueBalance - account.walletBalance;

  const handleAddTransaction = () => {
    if (newTx.description && newTx.amount) {
      addTransaction(account.id, {
        description: newTx.description,
        amount: Number(newTx.amount),
        type: newTx.type,
        date: newTx.date,
      });
      setIsAddTxOpen(false);
      setNewTx({
        description: "",
        amount: "",
        type: "DEBIT",
        date: new Date().toISOString().split("T")[0],
      });
    }
  };

  const handleDeleteAccount = () => {
    if (
      confirm(
        "Are you sure you want to delete this account and all transactions?"
      )
    ) {
      deleteAccount(account.id);
      navigate("/accounts");
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 md:pb-8">
      <button
        onClick={() => navigate("/accounts")}
        className="flex items-center gap-2 text-slate-500 hover:text-white mb-4 transition-colors text-sm"
      >
        <ArrowLeft size={16} /> Back to Accounts
      </button>

      {/* Profile Card */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 mb-6 relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 p-3 flex gap-2">
          <button
            onClick={handleDeleteAccount}
            className="text-slate-500 hover:text-red-500 p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-5 md:items-start">
          <div className="flex items-center gap-3 md:block">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center text-slate-900 text-xl md:text-2xl font-bold shadow-lg shadow-brand-500/20 shrink-0">
              {account.name.charAt(0)}
            </div>
            <div className="md:hidden">
              <h1 className="text-xl font-bold text-white">{account.name}</h1>
              <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                <span className="text-xs">{location?.name}</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-xs text-brand-500">{category?.name}</span>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <h1 className="hidden md:block text-2xl font-bold text-white">
              {account.name}
            </h1>
            <div className="hidden md:flex items-center gap-2 text-slate-400 mt-1 mb-4">
              <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-700">
                {location?.name}
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded text-[10px] font-medium border border-brand-500/20">
                {category?.name}
              </span>
            </div>

            {/* Stats Container - Swipeable on mobile */}
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:pb-0 scrollbar-hide">
              <div className="snap-center bg-slate-800/50 rounded-lg p-3 min-w-[120px] border border-slate-800 shrink-0">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-0.5">
                  Due Balance
                </p>
                <p
                  className={`text-lg md:text-xl font-bold ${
                    account.dueBalance > 0 ? "text-red-500" : "text-slate-400"
                  }`}
                >
                  ₹{account.dueBalance.toLocaleString()}
                </p>
              </div>
              <div className="snap-center bg-slate-800/50 rounded-lg p-3 min-w-[120px] border border-slate-800 shrink-0">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-0.5">
                  Wallet (Adv)
                </p>
                <p
                  className={`text-lg md:text-xl font-bold ${
                    account.walletBalance > 0
                      ? "text-emerald-500"
                      : "text-slate-400"
                  }`}
                >
                  ₹{account.walletBalance.toLocaleString()}
                </p>
              </div>
              <div className="snap-center bg-slate-800/50 rounded-lg p-3 min-w-[140px] border border-slate-800 shrink-0">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-0.5">
                  Net Status
                </p>
                <div className="flex flex-col">
                  <p
                    className={`text-lg md:text-xl font-bold leading-tight ${
                      netAmount > 0 ? "text-red-500" : "text-emerald-500"
                    }`}
                  >
                    {netAmount > 0 ? `To Receive` : `Advance`}
                  </p>
                  <p
                    className={`text-[10px] ${
                      netAmount > 0 ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    ₹{Math.abs(netAmount).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-white">Transaction History</h2>
        <button
          onClick={() => setIsAddTxOpen(true)}
          className="flex items-center gap-1.5 bg-brand-500 text-slate-900 px-3 py-1.5 rounded-lg hover:bg-brand-400 transition-colors shadow-lg shadow-brand-500/20 font-medium active:scale-95 text-sm"
        >
          <Plus size={16} /> <span className="hidden md:inline">Add Entry</span>
          <span className="md:hidden">Add</span>
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        {account.transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CreditCard size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No transactions recorded yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950/50 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {account.transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-5 py-2.5 text-sm text-slate-400 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="px-5 py-2.5 text-sm text-white font-medium">
                        {tx.description}
                      </td>
                      <td className="px-5 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                            tx.type === "DEBIT"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td
                        className={`px-5 py-2.5 text-sm font-bold text-right whitespace-nowrap ${
                          tx.type === "DEBIT"
                            ? "text-red-500"
                            : "text-emerald-500"
                        }`}
                      >
                        {tx.type === "DEBIT" ? "-" : "+"} ₹
                        {tx.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <button
                          onClick={() => deleteTransaction(account.id, tx.id)}
                          className="text-slate-600 hover:text-red-500 transition-colors p-1"
                          title="Delete Transaction"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-800">
              {account.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 flex flex-col gap-1.5 bg-slate-900 active:bg-slate-800/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium text-sm">
                        {tx.description}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {tx.date}
                      </p>
                    </div>
                    <p
                      className={`font-bold text-sm ${
                        tx.type === "DEBIT"
                          ? "text-red-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {tx.type === "DEBIT" ? "-" : "+"} ₹
                      {tx.amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        tx.type === "DEBIT"
                          ? "bg-red-500/10 text-red-500 border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      }`}
                    >
                      {tx.type}
                    </span>
                    <button
                      onClick={() => deleteTransaction(account.id, tx.id)}
                      className="text-slate-500 hover:text-red-500 p-1.5 -mr-1.5"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Transaction Modal */}
      {isAddTxOpen && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-end md:items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl md:rounded-xl max-w-sm w-full p-5 shadow-2xl animate-in fade-in zoom-in duration-200 mb-safe md:mb-0">
            <h3 className="text-base font-bold text-white mb-4">
              New Transaction
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewTx({ ...newTx, type: "DEBIT" })}
                  className={`py-2 rounded-lg font-medium border transition-colors text-xs ${
                    newTx.type === "DEBIT"
                      ? "bg-red-500/20 border-red-500 text-red-500"
                      : "border-slate-700 text-slate-500 hover:bg-slate-800 bg-slate-950"
                  }`}
                >
                  Debit (Due +)
                </button>
                <button
                  type="button"
                  onClick={() => setNewTx({ ...newTx, type: "CREDIT" })}
                  className={`py-2 rounded-lg font-medium border transition-colors text-xs ${
                    newTx.type === "CREDIT"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-500"
                      : "border-slate-700 text-slate-500 hover:bg-slate-800 bg-slate-950"
                  }`}
                >
                  Credit (Pay/Work)
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  value={newTx.date}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none placeholder-slate-500"
                  placeholder="e.g. Weekly Payment"
                  value={newTx.description}
                  onChange={(e) =>
                    setNewTx({ ...newTx, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 p-2.5 text-sm text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    placeholder="0.00"
                    value={newTx.amount}
                    onChange={(e) =>
                      setNewTx({ ...newTx, amount: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsAddTxOpen(false)}
                className="px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTransaction}
                className="px-4 py-2 text-sm bg-brand-500 text-slate-900 font-medium rounded-lg hover:bg-brand-400 shadow-lg shadow-brand-500/20"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountDetail;
