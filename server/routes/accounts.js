const express = require("express");
const router = express.Router();
const accountsController = require("../controllers/accountsController");

// Get all accounts
router.get("/", accountsController.getAllAccounts);

// Get single account by ID
router.get("/:id", accountsController.getAccountById);

// Create new account
router.post("/", accountsController.createAccount);

// Update account
router.put("/:id", accountsController.updateAccount);

// Delete account
router.delete("/:id", accountsController.deleteAccount);

// Bulk operations
router.post("/bulk", accountsController.bulkCreateAccounts);
router.post("/delete-bulk", accountsController.bulkDeleteAccounts);

module.exports = router;
