import React from "react";
import { useStore } from "../context/Store";
import { CreditCard } from "lucide-react";

const Dues: React.FC = () => {
  const { customers } = useStore();

  const customersWithDues = customers
    .filter((c) => c.totalDues > 0)
    .sort((a, b) => b.totalDues - a.totalDues);

  const totalOutstandingDues = customersWithDues.reduce(
    (sum, c) => sum + c.totalDues,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Outstanding Dues</h1>
          <p className="text-slate-400">
            Track and manage all unpaid customer balances.
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-6">
        <div className="p-4 rounded-full bg-red-500/10 text-red-500">
          <CreditCard size={32} />
        </div>
        <div>
          <p className="text-slate-400 text-sm">Total Outstanding</p>
          <p className="text-3xl font-bold text-white">
            ₹{totalOutstandingDues.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left text-slate-400">
          <thead className="bg-slate-950 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Contact</th>
              <th className="px-6 py-3 text-right">Due Amount</th>
            </tr>
          </thead>
          <tbody>
            {customersWithDues.length > 0 ? (
              customersWithDues.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-slate-800 hover:bg-slate-800/50"
                >
                  <td className="px-6 py-4 text-white font-medium">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4">{customer.phone}</td>
                  <td className="px-6 py-4 text-right font-medium text-red-400">
                    -₹{customer.totalDues.toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-12 text-slate-500">
                  No outstanding dues. Great work!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dues;
