import React, { useState, useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import {
  Bell,
  Search,
  User,
  X,
  Home,
  ShoppingBag,
  Truck,
  MoreHorizontal,
  Plus,
  Users,
  Package,
  CreditCard,
  Banknote,
  BarChart3,
  Building2, // Added icon
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

  // States for Mobile Navigation interactions
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  const activateMobileSearch = () => setIsMobileSearchActive(true);
  const deactivateMobileSearch = () => setIsMobileSearchActive(false);

  // Close menus when route changes
  useEffect(() => {
    setIsFabOpen(false);
    setIsMoreMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isMobileSearchActive) {
      searchInputRef.current?.focus();
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          deactivateMobileSearch();
        }
      };
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isMobileSearchActive]);

  const isActive = (path: string) => location.pathname === path;

  // Helper to close all floating menus
  const closeFloatingMenus = () => {
    setIsFabOpen(false);
    setIsMoreMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar is strictly for desktop */}
      <div className="hidden md:block">
        <Sidebar isOpen={true} onClose={() => {}} />
      </div>

      {/* Floating Menus Overlay (Backdrop) */}
      {(isFabOpen || isMoreMenuOpen) && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 md:hidden transition-all duration-300"
          onClick={closeFloatingMenus}
        ></div>
      )}

      <div className="md:ml-64 transition-all duration-300">
        <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between supports-[backdrop-filter]:bg-slate-950/60">
          {/* Mobile Header */}
          <div className="flex items-center md:hidden w-full">
            {!isMobileSearchActive ? (
              <span className="text-lg font-bold text-white tracking-tight mr-auto">
                BrickBook
              </span>
            ) : (
              <div className="flex-1 relative animate-in fade-in zoom-in-95 duration-200 mr-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-full pl-10 pr-8 py-2 w-full outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                  aria-label="Mobile search input"
                />
                <button
                  onClick={deactivateMobileSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-800 rounded-full text-slate-400"
                  aria-label="Close search"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 ml-auto">
              <button
                className="relative p-2 hover:bg-white/5 rounded-full transition-colors group"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-slate-300 group-hover:text-white" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950"></span>
              </button>
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-brand-500 to-brand-400 p-[1px] mx-1">
                <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center">
                  <User className="w-4 h-4 text-brand-500" />
                </div>
              </div>
              {!isMobileSearchActive && (
                <button
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                  onClick={activateMobileSearch}
                  aria-label="Open search"
                >
                  <Search className="w-5 h-5 text-slate-300" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between w-full">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-full px-4 py-2.5 w-96 focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/20 transition-all">
              <Search className="text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search orders, customers, or items..."
                className="bg-transparent border-none outline-none text-sm ml-3 w-full text-slate-200 placeholder-slate-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                className="relative p-2 hover:bg-slate-800 rounded-full transition-colors group"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-slate-400 group-hover:text-white" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900"></span>
              </button>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-slate-900 font-bold text-sm shadow-lg shadow-brand-500/20">
                M
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8 max-w-7xl mx-auto pb-32 md:pb-8">
          {children}
        </main>

        {/* --- MOBILE NAVIGATION COMPONENTS --- */}

        {/* FAB Menu Options */}
        <div
          className={`fixed bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-30 transition-all duration-300 md:hidden ${
            isFabOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8 pointer-events-none"
          }`}
        >
          <Link
            to="/sales"
            onClick={closeFloatingMenus}
            className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl text-white px-6 py-3.5 rounded-full shadow-xl border border-white/10 w-52 hover:bg-slate-800 transition-all active:scale-95"
          >
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-slate-900 shadow-lg shadow-brand-500/20">
              <Plus size={18} />
            </div>
            <span className="text-sm font-semibold tracking-wide">
              New Sale
            </span>
          </Link>
          <Link
            to="/deliveries"
            onClick={closeFloatingMenus}
            className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl text-white px-6 py-3.5 rounded-full shadow-xl border border-white/10 w-52 hover:bg-slate-800 transition-all active:scale-95"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Truck size={18} />
            </div>
            <span className="text-sm font-semibold tracking-wide">
              Delivery Status
            </span>
          </Link>
        </div>

        {/* "More" Menu Card */}
        <div
          className={`fixed bottom-24 left-4 right-4 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl z-30 transition-all duration-300 md:hidden origin-bottom-right ${
            isMoreMenuOpen
              ? "scale-100 opacity-100"
              : "scale-95 opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center justify-between mb-5 px-1">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              Quick Access
            </h3>
            <button
              onClick={closeFloatingMenus}
              className="text-slate-500 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-y-6 gap-x-2">
            {/* NEW ACCOUNTS LINK */}
            <Link
              to="/accounts"
              onClick={closeFloatingMenus}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center group-hover:bg-brand-500 transition-all group-hover:text-slate-900 text-slate-300 border border-white/5">
                <Building2 size={22} />
              </div>
              <span className="text-[10px] font-medium text-slate-400 group-hover:text-brand-500 transition-colors">
                Accounts
              </span>
            </Link>

            <Link
              to="/customers"
              onClick={closeFloatingMenus}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center group-hover:bg-brand-500 transition-all group-hover:text-slate-900 text-slate-300 border border-white/5">
                <Users size={22} />
              </div>
              <span className="text-[10px] font-medium text-slate-400 group-hover:text-brand-500 transition-colors">
                Customers
              </span>
            </Link>
            <Link
              to="/inventory"
              onClick={closeFloatingMenus}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center group-hover:bg-brand-500 transition-all group-hover:text-slate-900 text-slate-300 border border-white/5">
                <Package size={22} />
              </div>
              <span className="text-[10px] font-medium text-slate-400 group-hover:text-brand-500 transition-colors">
                Inventory
              </span>
            </Link>
            <Link
              to="/dues"
              onClick={closeFloatingMenus}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center group-hover:bg-purple-500 transition-all group-hover:text-white text-slate-300 border border-white/5">
                <CreditCard size={22} />
              </div>
              <span className="text-[10px] font-medium text-slate-400 group-hover:text-purple-500 transition-colors">
                Dues
              </span>
            </Link>
            <Link
              to="/advance"
              onClick={closeFloatingMenus}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 transition-all group-hover:text-white text-slate-300 border border-white/5">
                <Banknote size={22} />
              </div>
              <span className="text-[10px] font-medium text-slate-400 group-hover:text-emerald-500 transition-colors">
                Advance
              </span>
            </Link>
            <Link
              to="/reports"
              onClick={closeFloatingMenus}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 transition-all group-hover:text-white text-slate-300 border border-white/5">
                <BarChart3 size={22} />
              </div>
              <span className="text-[10px] font-medium text-slate-400 group-hover:text-blue-500 transition-colors">
                Reports
              </span>
            </Link>
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 md:hidden z-30 pb-safe supports-[backdrop-filter]:bg-slate-950/60">
          <div className="flex justify-between items-end px-6 py-2 relative h-[60px]">
            <Link
              to="/"
              onClick={closeFloatingMenus}
              className={`flex flex-col items-center gap-1 pb-2 w-16 transition-all duration-300 ${
                isActive("/")
                  ? "text-brand-500"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Home
                size={isActive("/") ? 24 : 22}
                strokeWidth={isActive("/") ? 2.5 : 2}
              />
              {isActive("/") && (
                <span className="text-[10px] font-bold animate-in fade-in slide-in-from-bottom-1">
                  Home
                </span>
              )}
            </Link>

            <Link
              to="/sales"
              onClick={closeFloatingMenus}
              className={`flex flex-col items-center gap-1 pb-2 w-16 transition-all duration-300 ${
                isActive("/sales")
                  ? "text-brand-500"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <ShoppingBag
                size={isActive("/sales") ? 24 : 22}
                strokeWidth={isActive("/sales") ? 2.5 : 2}
              />
              {isActive("/sales") && (
                <span className="text-[10px] font-bold animate-in fade-in slide-in-from-bottom-1">
                  Sales
                </span>
              )}
            </Link>

            {/* Spacer for FAB */}
            <div className="w-16"></div>

            <Link
              to="/deliveries"
              onClick={closeFloatingMenus}
              className={`flex flex-col items-center gap-1 pb-2 w-16 transition-all duration-300 ${
                isActive("/deliveries")
                  ? "text-brand-500"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Truck
                size={isActive("/deliveries") ? 24 : 22}
                strokeWidth={isActive("/deliveries") ? 2.5 : 2}
              />
              {isActive("/deliveries") && (
                <span className="text-[10px] font-bold animate-in fade-in slide-in-from-bottom-1">
                  Trucks
                </span>
              )}
            </Link>

            {/* "More" Button */}
            <button
              onClick={() => {
                setIsFabOpen(false);
                setIsMoreMenuOpen(!isMoreMenuOpen);
              }}
              className={`flex flex-col items-center gap-1 pb-2 w-16 transition-all duration-300 ${
                isMoreMenuOpen
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <MoreHorizontal
                size={isMoreMenuOpen ? 24 : 22}
                strokeWidth={isMoreMenuOpen ? 2.5 : 2}
              />
              {isMoreMenuOpen && (
                <span className="text-[10px] font-bold animate-in fade-in slide-in-from-bottom-1">
                  Menu
                </span>
              )}
            </button>
          </div>

          {/* Floating Action Button (FAB) */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40">
            <button
              onClick={() => {
                setIsMoreMenuOpen(false);
                setIsFabOpen(!isFabOpen);
              }}
              className={`bg-brand-500 w-14 h-14 rounded-full flex items-center justify-center text-slate-900 border-[4px] border-slate-950 transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(151,197,167,0.4)] ${
                isFabOpen
                  ? "rotate-135 bg-red-500 text-white border-slate-950 shadow-red-500/50"
                  : ""
              }`}
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
