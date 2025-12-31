import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/Store";
import { AccountsProvider } from "./context/AccountsContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Customers from "./pages/Customers";
import CustomerProfile from "./pages/CustomerProfile";
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";
import Dues from "./pages/Dues";
import Expenses from "./pages/Expenses";
import Inventory from "./pages/Inventory";
import Deliveries from "./pages/Deliveries";
import Reports from "./pages/Reports";
import Advance from "./pages/Advance";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <StoreProvider>
        <AccountsProvider>
          <Router>
            <Routes>
              {/* Public routes - no layout */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes - with layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="sales" element={<Sales />} />
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerProfile />} />
                <Route path="accounts" element={<Accounts />} />
                <Route path="accounts/:id" element={<AccountDetail />} />
                <Route path="dues" element={<Dues />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="deliveries" element={<Deliveries />} />
                <Route path="reports" element={<Reports />} />
                <Route path="advance" element={<Advance />} />
              </Route>

              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </AccountsProvider>
      </StoreProvider>
    </AuthProvider>
  );
};

export default App;
