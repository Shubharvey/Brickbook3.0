import React from "react";
import { useStore } from "../context/Store";
import StatCard from "../components/StatCard";
import {
  IndianRupee,
  Package,
  Truck,
  Users,
  TrendingUp,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";

const Dashboard: React.FC = () => {
  const { sales, customers, products, deliveries, expenses } = useStore();

  const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const profit = totalRevenue - totalExpenses;

  const pendingDeliveries = deliveries.filter(
    (d) => d.status !== "Delivered"
  ).length;
  const lowStockItems = products.filter((p) => p.stock < 1000).length;
  const totalDues = customers.reduce((acc, c) => acc + c.totalDues, 0);

  // Calculate Wallet (Sum of all customer wallets) - Mock logic based on store
  const totalWallet = customers.reduce((acc, c) => acc + c.walletBalance, 0);
  // Cash in Hand (Revenue - Expenses, simplified)
  const cashInHand = profit > 0 ? profit : 0;

  const recentSales = sales.slice(0, 5);

  // Mock data for the chart
  const data = [
    { name: "Mon", sales: 4000 },
    { name: "Tue", sales: 3000 },
    { name: "Wed", sales: 2000 },
    { name: "Thu", sales: 2780 },
    { name: "Fri", sales: 1890 },
    { name: "Sat", sales: 2390 },
    { name: "Sun", sales: 3490 },
  ];

  // Mobile Weekly Performance Data (Simplified)
  const weeklyData = [
    { day: "M", val: 40 },
    { day: "T", val: 60 },
    { day: "W", val: 30 },
    { day: "T", val: 70 },
    { day: "F", val: 50 },
    { day: "S", val: 20 },
    { day: "S", val: 80 },
  ];

  return (
    <div className="space-y-6">
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:block space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">
            Welcome back, here is your business overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Revenue"
            value={`₹${totalRevenue.toLocaleString()}`}
            icon={IndianRupee}
            trend="12%"
            trendUp={true}
            color="emerald"
            description="vs. last month"
          />
          <StatCard
            title="Pending Deliveries"
            value={pendingDeliveries.toString()}
            icon={Truck}
            color="blue"
            description="Needs attention"
          />
          <StatCard
            title="Low Stock Items"
            value={lowStockItems.toString()}
            icon={Package}
            trend="2 items"
            trendUp={false}
            color="orange" // This will map to brand color in StatCard
            description="Reorder needed"
          />
          <StatCard
            title="Customer Dues"
            value={`₹${totalDues.toLocaleString()}`}
            icon={Users}
            color="purple"
            description="Total outstanding"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-500" />
                Sales Overview
              </h2>
              <select className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1 outline-none">
                <option>This Week</option>
                <option>Last Week</option>
                <option>This Month</option>
              </select>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderColor: "#334155",
                      color: "#f1f5f9",
                    }}
                    itemStyle={{ color: "#f1f5f9" }}
                    cursor={{ fill: "#334155", opacity: 0.4 }}
                  />
                  <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#97c5a7" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Recent Sales
            </h2>
            <div className="space-y-4">
              {recentSales.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  No recent sales found.
                </p>
              ) : (
                recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between pb-4 border-b border-slate-800 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs">
                        {sale.customerName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {sale.customerName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {sale.items.length} items • {sale.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">
                        +₹{sale.totalAmount}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          sale.paymentStatus === "Paid"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-brand-500/10 text-brand-500"
                        }`}
                      >
                        {sale.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <Link
                to="/sales"
                className="text-sm text-brand-500 hover:text-brand-400 font-medium"
              >
                View All Transactions
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* --- MOBILE VIEW (Matches Reference Image) --- */}
      <div className="md:hidden pb-4 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500"
          />
          <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
        </div>

        {/* Summary Cards Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col justify-center text-center shadow-sm">
            <p className="text-[10px] text-slate-400 font-medium mb-1">
              Revenue
            </p>
            <p className="text-sm font-bold text-white">
              ₹
              {totalRevenue > 1000
                ? (totalRevenue / 1000).toFixed(1) + "k"
                : totalRevenue}
            </p>
            <div className="mt-1 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 w-2/3"></div>
            </div>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col justify-center text-center shadow-sm">
            <p className="text-[10px] text-slate-400 font-medium mb-1">
              Expenses
            </p>
            <p className="text-sm font-bold text-white">
              ₹
              {totalExpenses > 1000
                ? (totalExpenses / 1000).toFixed(1) + "k"
                : totalExpenses}
            </p>
            <div className="mt-1 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 w-1/3"></div>
            </div>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col justify-center text-center shadow-sm">
            <p className="text-[10px] text-slate-400 font-medium mb-1">
              Profit
            </p>
            <p className="text-sm font-bold text-emerald-400">
              ₹{profit > 1000 ? (profit / 1000).toFixed(1) + "k" : profit}
            </p>
            <div className="mt-1 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-1/2"></div>
            </div>
          </div>
        </div>

        {/* Weekly Performance Chart */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Weekly Performance
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <div className="w-2 h-2 bg-red-500 rounded-sm"></div> Expenses
            </div>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 h-32 flex items-end justify-between gap-2">
            {weeklyData.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-full">
                <div className="w-2 bg-red-500/20 rounded-t-sm h-full relative group">
                  <div
                    className="absolute bottom-0 left-0 w-full bg-red-500 rounded-t-sm transition-all duration-500"
                    style={{ height: `${d.val}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-500">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Flow Health */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Cash Flow Health
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-500 p-4 rounded-xl text-white flex flex-col items-center justify-center text-center shadow-lg shadow-red-500/20">
              <p className="text-lg font-bold">
                ₹{(totalDues / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-white/80">Dues</p>
            </div>
            <div className="bg-brand-500 p-4 rounded-xl text-slate-900 flex flex-col items-center justify-center text-center shadow-lg shadow-brand-500/20">
              <p className="text-lg font-bold">
                ₹{(totalWallet / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-slate-900/80">Wallet</p>
            </div>
            <div className="bg-slate-700 p-4 rounded-xl text-white flex flex-col items-center justify-center text-center shadow-lg">
              <p className="text-lg font-bold">
                ₹{(cashInHand / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-white/60">Cash</p>
            </div>
          </div>
        </div>

        {/* Delivery Pipeline */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Delivery Pipeline
            </h3>
            <span className="text-xs text-slate-500">24 Active</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {["Pending", "Hollow Bricks", "Pavers", "Delivered"].map(
              (item, idx) => (
                <div
                  key={idx}
                  className="p-3 border-b border-slate-800 last:border-0"
                >
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          idx === 0
                            ? "bg-slate-500"
                            : idx === 3
                            ? "bg-emerald-500"
                            : "bg-red-500"
                        }`}
                      ></div>
                      {item}
                    </div>
                    <span>{idx === 0 ? 6 : idx === 3 ? 24 : "23%"}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full ${
                        idx === 3
                          ? "bg-emerald-500"
                          : idx === 0
                          ? "bg-slate-600"
                          : "bg-red-500"
                      }`}
                      style={{
                        width:
                          idx === 0
                            ? "20%"
                            : idx === 3
                            ? "100%"
                            : idx === 1
                            ? "23%"
                            : "18%",
                      }}
                    ></div>
                    {idx !== 0 && idx !== 3 && (
                      <div className="h-full bg-brand-500 flex-1"></div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
