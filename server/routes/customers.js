const express = require("express");
const router = express.Router();
const customersController = require("../controllers/customersController");

// CORS Preflight for all routes
router.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

// Get all customers
router.get("/", customersController.getAllCustomers);

// Get customer statistics
router.get("/stats", customersController.getCustomerStats);

// Search customers
router.get("/search", customersController.searchCustomers);

// Get single customer by ID
router.get("/:id", customersController.getCustomerById);

// Create new customer
router.post("/", customersController.createCustomer);

// Update customer
router.put("/:id", customersController.updateCustomer);

// Delete customer
router.delete("/:id", customersController.deleteCustomer);

// ============ NEW ROUTES FOR WALLET AND PAYMENTS ============
// Add to wallet (Credit/Debit)
router.post("/:id/wallet", customersController.addToWallet);

// Get wallet transactions
router.get(
  "/:id/wallet/transactions",
  customersController.getWalletTransactions
);

// Apply wallet to dues
router.post("/:id/wallet/apply", customersController.applyWalletToDues);

// NEW: Collect payment from customer
router.post(
  "/:id/collect-payment",
  customersController.collectPaymentFromCustomer
);

// ============ OTHER UTILITY ROUTES ============
// Get customers with dues only
router.get("/with-dues", customersController.getCustomersWithDues);

// Get customers with wallet balance only
router.get("/with-wallet", customersController.getCustomersWithWallet);

// Fix negative wallet balances
router.post("/fix-wallets", customersController.fixWalletBalances);

module.exports = router;
