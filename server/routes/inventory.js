const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");

// Get all inventory items
router.get("/", inventoryController.getAllInventory);

// Get low stock items
router.get("/low-stock", inventoryController.getLowStockItems);

// Get inventory statistics
router.get("/stats", inventoryController.getInventoryStats);

// Search inventory
router.get("/search", inventoryController.searchInventory);

// Get single inventory item by ID
router.get("/:id", inventoryController.getInventoryById);

// Create new inventory item
router.post("/", inventoryController.createInventoryItem);

// Update inventory item
router.put("/:id", inventoryController.updateInventoryItem);

// Update stock quantity
router.patch("/:id/stock", inventoryController.updateStock);

// Delete inventory item
router.delete("/:id", inventoryController.deleteInventoryItem);

module.exports = router;
