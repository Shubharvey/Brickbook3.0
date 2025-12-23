const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reportsController");

// Dashboard report
router.get("/dashboard", reportsController.getDashboardReport);

// Sales report
router.get("/sales", reportsController.getSalesReport);

// Profit & Loss statement
router.get("/profit-loss", reportsController.getProfitLossStatement);

// Inventory valuation
router.get("/inventory-valuation", reportsController.getInventoryValuation);

// Customer outstanding report
router.get(
  "/customer-outstanding",
  reportsController.getCustomerOutstandingReport
);

// Cash flow report
router.get("/cash-flow", reportsController.getCashFlowReport);

// Export report
router.get("/export", reportsController.exportReport);

// Keep legacy routes for compatibility
router.get("/inventory", (req, res) => {
  const query = `
    SELECT 
      *,
      CASE 
        WHEN quantity <= min_stock_level THEN 'LOW'
        WHEN quantity <= min_stock_level * 2 THEN 'MEDIUM' 
        ELSE 'HIGH'
      END as stock_status
    FROM inventory 
    ORDER BY quantity ASC
  `;

  const db = require("../config/database");
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
