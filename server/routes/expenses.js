const express = require("express");
const router = express.Router();
const expensesController = require("../controllers/expensesController");

// Get all expenses
router.get("/", expensesController.getAllExpenses);

// Get expenses statistics
router.get("/stats", expensesController.getExpensesStats);

// Get expenses summary
router.get("/summary", expensesController.getExpensesSummary);

// Get expense categories
router.get("/categories", expensesController.getExpenseCategories);

// Search expenses
router.get("/search", expensesController.searchExpenses);

// Get single expense by ID
router.get("/:id", expensesController.getExpenseById);

// Create new expense
router.post("/", expensesController.createExpense);

// Bulk create expenses
router.post("/bulk", expensesController.bulkCreateExpenses);

// Update expense
router.put("/:id", expensesController.updateExpense);

// Delete expense
router.delete("/:id", expensesController.deleteExpense);

module.exports = router;
