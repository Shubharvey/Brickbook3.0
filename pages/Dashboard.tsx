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
  const { sales, customers, products, deliveries, expenses, isLoading, error } =
    useStore();

  // Add loading state
  const [isDashboardLoading, setIsDashboardLoading] = React.useState(true);

  // Add error state
  const [dashboardError, setDashboardError] = React.useState<string | null>(
    null
  );

  // Process data safely with error handling
  const totalRevenue = React.useMemo(() => {
    try {
      return sales.reduce((acc, sale) => acc + (sale.totalAmount || 0), 0);
    } catch (err) {
      console.error("Error calculating totalRevenue:", err);
      return 0;
    }
  }, [sales]);

  const totalExpenses = React.useMemo(() => {
    try {
      return expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
    } catch (err) {
      console.error("Error calculating totalExpenses:", err);
      return 0;
    }
  }, [expenses]);

  const profit = React.useMemo(
    () => totalRevenue - totalExpenses,
    [totalRevenue, totalExpenses]
  );

  const pendingDeliveries = React.useMemo(() => {
    try {
      return deliveries.filter((d) => d?.status !== "Delivered").length;
    } catch (err) {
      console.error("Error calculating pendingDeliveries:", err);
      return 0;
    }
  }, [deliveries]);

  const lowStockItems = React.useMemo(() => {
    try {
      return products.filter((p) => (p?.stock || 0) < 1000).length;
    } catch (err) {
      console.error("Error calculating lowStockItems:", err);
      return 0;
    }
  }, [products]);

  const totalDues = React.useMemo(() => {
    try {
      return customers.reduce((acc, c) => acc + (c?.totalDues || 0), 0);
    } catch (err) {
      console.error("Error calculating totalDues:", err);
      return 0;
    }
  }, [customers]);

  const totalWallet = React.useMemo(() => {
    try {
      return customers.reduce((acc, c) => acc + (c?.walletBalance || 0), 0);
    } catch (err) {
      console.error("Error calculating totalWallet:", err);
      return 0;
    }
  }, [customers]);

  const cashInHand = React.useMemo(() => (profit > 0 ? profit : 0), [profit]);

  const recentSales = React.useMemo(() => {
    try {
      return sales.slice(0, 5).filter((sale) => sale?.id && sale?.customerName);
    } catch (err) {
      console.error("Error processing recentSales:", err);
      return [];
    }
  }, [sales]);

  // Process sales data for chart with error handling
  const processSalesData = React.useCallback(() => {
    try {
      console.log("Processing sales data for chart...", sales.length, "sales");

      if (!sales || sales.length === 0) {
        console.log("No sales data available, returning empty chart");
        return [];
      }

      // Group sales by date
      const salesByDate = sales.reduce((acc, sale) => {
        if (!sale?.date) return acc;

        const date = sale.date;
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += sale.totalAmount || 0;
        return acc;
      }, {} as Record<string, number>);

      console.log("Sales grouped by date:", salesByDate);

      // Get the last 7 days of data
      const dates = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        dates.push(dateStr);
      }

      // Create chart data with actual sales or 0 if no sales
      const chartData = dates.map((date) => {
        const dayName = new Date(date).toLocaleDateString("en-US", {
          weekday: "short",
        });
        return {
          name: dayName,
          date: date,
          sales: salesByDate[date] || 0,
        };
      });

      console.log("Generated chart data:", chartData);
      return chartData;
    } catch (err) {
      console.error("Error processing sales data:", err);
      setDashboardError("Failed to process sales data");
      return [];
    }
  }, [sales]);

  // Get actual sales data for the chart
  const chartData = React.useMemo(() => {
    const data = processSalesData();
    setIsDashboardLoading(false);
    return data;
  }, [processSalesData]);

  // Mobile Weekly Performance Data
  const weeklyData = React.useMemo(() => {
    try {
      return chartData.map((d) => ({
        day: d.name?.charAt(0) || "N",
        val:
          d.sales > 0
            ? Math.min(
                100,
                (d.sales /
                  Math.max(...chartData.map((item) => item.sales || 1))) *
                  100
              )
            : 0,
      }));
    } catch (err) {
      console.error("Error processing weekly data:", err);
      return [];
    }
  }, [chartData]);

  // Show loading state
  if (isDashboardLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || dashboardError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error loading dashboard</p>
          <p className="text-slate-400 text-sm">{error || dashboardError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
            color="orange"
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
                <option>Last 7 Days</option>
                <option>This Week</option>
                <option>This Month</option>
              </select>
            </div>

            {chartData.length > 0 ? (
              <>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
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
                        tickFormatter={(value) =>
                          value === 0 ? "₹0" : `₹${(value / 1000).toFixed(1)}k`
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          borderColor: "#334155",
                          color: "#f1f5f9",
                        }}
                        itemStyle={{ color: "#f1f5f9" }}
                        cursor={{ fill: "#334155", opacity: 0.4 }}
                        formatter={(value: any) => [
                          `₹${(value.sales || 0).toLocaleString()}`,
                          value.date || "Unknown date",
                        ]}
                      />
                      <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              (entry?.sales || 0) > 0 ? "#97c5a7" : "#475569"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-xs text-slate-500 text-center">
                  {sales.length > 0
                    ? `Showing data for ${
                        chartData.filter((d) => (d?.sales || 0) > 0).length
                      } days with sales`
                    : "No sales data available for the selected period"}
                </div>
              </>
            ) : (
              <div className="h-72 w-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-slate-500 mb-2">No sales data available</p>
                  <p className="text-xs text-slate-400">
                    Add some sales to see the chart
                  </p>
                </div>
              </div>
            )}
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
                        {(sale?.customerName || "Unknown")
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {sale?.customerName || "Unknown Customer"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {sale?.items?.length || 0} items •{" "}
                          {sale?.date || "No date"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">
                        +₹{(sale?.totalAmount || 0).toLocaleString()}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          sale?.paymentStatus === "Paid"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-brand-500/10 text-brand-500"
                        }`}
                      >
                        {sale?.paymentStatus || "Pending"}
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

      {/* --- MOBILE VIEW --- */}
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
              <div className="w-2 h-2 bg-red-500 rounded-sm"></div> Sales
            </div>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 h-32 flex items-end justify-between gap-2">
            {weeklyData.length > 0 ? (
              weeklyData.map((d, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 w-full"
                >
                  <div className="w-2 bg-brand-500/20 rounded-t-sm h-full relative group">
                    <div
                      className="absolute bottom-0 left-0 w-full bg-brand-500 rounded-t-sm transition-all duration-500"
                      style={{ height: `${d.val}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-500">{d.day}</span>
                </div>
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                <p className="text-xs">No data available</p>
              </div>
            )}
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
