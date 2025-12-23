import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Truck,
  BarChart3,
  CreditCard,
  Banknote,
  Building2, // Added icon
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/accounts", label: "Accounts", icon: Building2 }, // Added Accounts link
    { to: "/sales", label: "Sales", icon: ShoppingCart },
    { to: "/customers", label: "Customers", icon: Users },
    { to: "/inventory", label: "Inventory", icon: Package },
    { to: "/deliveries", label: "Deliveries", icon: Truck },
    { to: "/dues", label: "Dues", icon: CreditCard },
    { to: "/advance", label: "Advance", icon: Banknote },
    { to: "/reports", label: "Reports", icon: BarChart3 },
  ];

  return (
    <aside
      className={`
      flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-screen fixed top-0
      transform transition-transform duration-300 ease-in-out
      ${isOpen ? "translate-x-0 z-50" : "-translate-x-full z-50"}
      md:translate-x-0 md:z-10 md:flex
    `}
    >
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Package className="text-slate-900 w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            BrickBook
          </h1>
          <p className="text-xs text-slate-400">Business Manager</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose} // Close sidebar on navigation click for mobile
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-brand-500/10 text-brand-500 font-medium"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={20}
                  className={
                    isActive
                      ? "text-brand-500"
                      : "text-slate-500 group-hover:text-slate-300"
                  }
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-400 mb-1">Logged in as</p>
          <p className="text-sm font-medium text-white">Manager Account</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-emerald-500">Online & Synced</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
