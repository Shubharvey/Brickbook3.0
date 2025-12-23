import React from "react";
import { useStore } from "../context/Store";
import { Wallet } from "lucide-react";

const Advance: React.FC = () => {
  const { customers } = useStore();

  const customersWithAdvance = customers
    .filter((c) => c.walletBalance > 0)
    .sort((a, b) => b.walletBalance - a.walletBalance);

  const totalAdvanceAmount = customersWithAdvance.reduce(
    (sum, c) => sum + c.walletBalance,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Advance Payments</h1>
          <p className="text-slate-400">
            View all customers with a positive wallet balance.
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-6">
        <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500">
          <Wallet size={32} />
        </div>
        <div>
          <p className="text-slate-400 text-sm">Total Advance Held</p>
          <p className="text-3xl font-bold text-white">
            ₹{totalAdvanceAmount.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left text-slate-400">
          <thead className="bg-slate-950 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Contact</th>
              <th className="px-6 py-3 text-right">Advance Amount</th>
            </tr>
          </thead>
          <tbody>
            {customersWithAdvance.length > 0 ? (
              customersWithAdvance.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-slate-800 hover:bg-slate-800/50"
                >
                  <td className="px-6 py-4 text-white font-medium">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4">{customer.phone}</td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-400">
                    +₹{customer.walletBalance.toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-12 text-slate-500">
                  No customers have advance payments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Advance;
