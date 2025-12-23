import React from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { StoreProvider } from "./context/Store";
import { AccountsProvider } from "./context/AccountsContext"; // New Import
import Layout from "./components/Layout";

// Pages
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Customers from "./pages/Customers";
import CustomerProfile from "./pages/CustomerProfile";
import Inventory from "./pages/Inventory";
import Deliveries from "./pages/Deliveries";
import Reports from "./pages/Reports";
import Dues from "./pages/Dues";
import Advance from "./pages/Advance";
import Accounts from "./pages/Accounts"; // New Import
import AccountDetail from "./pages/AccountDetail"; // New Import

const App: React.FC = () => {
  return (
    <StoreProvider>
      <AccountsProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerProfile />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/deliveries" element={<Deliveries />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/dues" element={<Dues />} />
              <Route path="/advance" element={<Advance />} />

              {/* New Accounts Routes */}
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/accounts/:accountId" element={<AccountDetail />} />
            </Routes>
          </Layout>
        </Router>
      </AccountsProvider>
    </StoreProvider>
  );
};

export default App;
