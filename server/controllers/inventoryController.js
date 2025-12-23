const db = require("../config/database");

const inventoryController = {
  // Get all inventory items
  getAllInventory: (req, res) => {
    const { category, lowStock, search } = req.query;

    let query = `
      SELECT 
        id,
        product_name,
        product_code,
        category,
        quantity,
        price,
        min_stock_level,
        supplier,
        created_at,
        CASE 
          WHEN quantity <= min_stock_level THEN 'LOW'
          WHEN quantity = 0 THEN 'OUT_OF_STOCK'
          ELSE 'IN_STOCK'
        END as stock_status
      FROM inventory
    `;

    const conditions = [];
    const params = [];

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }

    if (lowStock === "true") {
      conditions.push("quantity <= min_stock_level");
    }

    if (search) {
      conditions.push("(product_name LIKE ? OR product_code LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY product_name ASC";

    db.all(query, params, (err, items) => {
      if (err) {
        console.error("Error fetching inventory:", err.message);
        return res.status(500).json({ error: "Failed to fetch inventory" });
      }
      res.json(items);
    });
  },

  // Get single inventory item by ID
  getInventoryById: (req, res) => {
    const { id } = req.params;

    db.get(
      `
      SELECT 
        *,
        CASE 
          WHEN quantity <= min_stock_level THEN 'LOW'
          WHEN quantity = 0 THEN 'OUT_OF_STOCK'
          ELSE 'IN_STOCK'
        END as stock_status
      FROM inventory 
      WHERE id = ?
    `,
      [id],
      (err, item) => {
        if (err) {
          console.error("Error fetching inventory item:", err.message);
          return res
            .status(500)
            .json({ error: "Failed to fetch inventory item" });
        }

        if (!item) {
          return res.status(404).json({ error: "Inventory item not found" });
        }

        // Get sales history for this product
        db.all(
          `
        SELECT 
          s.invoice_number,
          s.sale_date,
          si.quantity,
          si.unit_price,
          si.total_price,
          c.name as customer_name
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE si.product_id = ?
        ORDER BY s.sale_date DESC
        LIMIT 10
      `,
          [id],
          (err, salesHistory) => {
            if (err) {
              console.error("Error fetching sales history:", err.message);
              return res
                .status(500)
                .json({ error: "Failed to fetch sales history" });
            }

            res.json({
              ...item,
              sales_history: salesHistory || [],
            });
          }
        );
      }
    );
  },

  // Create new inventory item
  createInventoryItem: (req, res) => {
    const {
      product_name,
      product_code,
      category,
      quantity = 0,
      price = 0,
      min_stock_level = 10,
      supplier,
    } = req.body;

    // Validation
    if (!product_name) {
      return res.status(400).json({ error: "Product name is required" });
    }

    if (quantity < 0) {
      return res.status(400).json({ error: "Quantity cannot be negative" });
    }

    if (price < 0) {
      return res.status(400).json({ error: "Price cannot be negative" });
    }

    const query = `
      INSERT INTO inventory (
        product_name, product_code, category, quantity, 
        price, min_stock_level, supplier
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [
        product_name,
        product_code || null,
        category || null,
        quantity,
        price,
        min_stock_level,
        supplier || null,
      ],
      function (err) {
        if (err) {
          console.error("Error creating inventory item:", err.message);

          if (err.message.includes("UNIQUE constraint failed")) {
            return res
              .status(409)
              .json({ error: "Product code already exists" });
          }

          return res
            .status(500)
            .json({ error: "Failed to create inventory item" });
        }

        res.status(201).json({
          id: this.lastID,
          product_name,
          product_code,
          category,
          quantity,
          price,
          min_stock_level,
          supplier,
          message: "Inventory item created successfully",
        });
      }
    );
  },

  // Update inventory item
  updateInventoryItem: (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ error: "Inventory ID is required" });
    }

    const allowedFields = [
      "product_name",
      "product_code",
      "category",
      "quantity",
      "price",
      "min_stock_level",
      "supplier",
    ];

    const updateFields = [];
    const values = [];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        // Validate numeric fields
        if (
          (field === "quantity" ||
            field === "price" ||
            field === "min_stock_level") &&
          updates[field] < 0
        ) {
          return res.status(400).json({ error: `${field} cannot be negative` });
        }

        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(id);

    const query = `UPDATE inventory SET ${updateFields.join(
      ", "
    )} WHERE id = ?`;

    db.run(query, values, function (err) {
      if (err) {
        console.error("Error updating inventory:", err.message);

        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(409).json({ error: "Product code already exists" });
        }

        return res
          .status(500)
          .json({ error: "Failed to update inventory item" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Inventory item not found" });
      }

      res.json({
        success: true,
        id,
        updatedFields: updateFields,
        message: "Inventory item updated successfully",
      });
    });
  },

  // Delete inventory item
  deleteInventoryItem: (req, res) => {
    const { id } = req.params;

    // Check if item has sales history
    db.get(
      "SELECT COUNT(*) as salesCount FROM sale_items WHERE product_id = ?",
      [id],
      (err, result) => {
        if (err) {
          console.error("Error checking sales history:", err.message);
          return res.status(500).json({ error: "Database error" });
        }

        if (result.salesCount > 0) {
          return res.status(400).json({
            error: "Cannot delete product with sales history",
            salesCount: result.salesCount,
          });
        }

        db.run("DELETE FROM inventory WHERE id = ?", [id], function (err) {
          if (err) {
            console.error("Error deleting inventory item:", err.message);
            return res
              .status(500)
              .json({ error: "Failed to delete inventory item" });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: "Inventory item not found" });
          }

          res.json({
            success: true,
            deletedId: id,
            message: "Inventory item deleted successfully",
          });
        });
      }
    );
  },

  // Update stock quantity (add/remove stock)
  updateStock: (req, res) => {
    const { id } = req.params;
    const { quantity, action = "add", reason } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: "Valid quantity is required" });
    }

    if (!["add", "remove"].includes(action)) {
      return res
        .status(400)
        .json({ error: "Action must be 'add' or 'remove'" });
    }

    db.get("SELECT * FROM inventory WHERE id = ?", [id], (err, item) => {
      if (err) {
        console.error("Error fetching inventory item:", err.message);
        return res
          .status(500)
          .json({ error: "Failed to fetch inventory item" });
      }

      if (!item) {
        return res.status(404).json({ error: "Inventory item not found" });
      }

      let newQuantity = item.quantity;

      if (action === "add") {
        newQuantity += quantity;
      } else if (action === "remove") {
        if (item.quantity < quantity) {
          return res.status(400).json({
            error: `Insufficient stock. Available: ${item.quantity}, Trying to remove: ${quantity}`,
          });
        }
        newQuantity -= quantity;
      }

      db.run(
        "UPDATE inventory SET quantity = ? WHERE id = ?",
        [newQuantity, id],
        function (err) {
          if (err) {
            console.error("Error updating stock:", err.message);
            return res.status(500).json({ error: "Failed to update stock" });
          }

          // Log stock adjustment (you might want to create a stock_adjustments table)
          const adjustment = {
            product_id: id,
            product_name: item.product_name,
            previous_quantity: item.quantity,
            adjustment: action === "add" ? quantity : -quantity,
            new_quantity: newQuantity,
            action,
            reason: reason || "Manual adjustment",
            adjusted_at: new Date().toISOString(),
          };

          // For now, just log to console. Consider creating a table for this.
          console.log("Stock adjustment:", adjustment);

          res.json({
            success: true,
            id,
            product_name: item.product_name,
            previous_quantity: item.quantity,
            adjustment: action === "add" ? quantity : -quantity,
            new_quantity: newQuantity,
            action,
            stock_status:
              newQuantity <= item.min_stock_level ? "LOW" : "IN_STOCK",
            message: `Stock ${
              action === "add" ? "added" : "removed"
            } successfully`,
          });
        }
      );
    });
  },

  // Get inventory statistics
  getInventoryStats: (req, res) => {
    const query = `
      SELECT 
        COUNT(*) as total_products,
        SUM(quantity) as total_stock_quantity,
        SUM(quantity * price) as total_stock_value,
        SUM(CASE WHEN quantity <= min_stock_level THEN 1 ELSE 0 END) as low_stock_items,
        SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_items,
        COUNT(DISTINCT category) as total_categories
      FROM inventory
    `;

    db.get(query, [], (err, stats) => {
      if (err) {
        console.error("Error fetching inventory stats:", err.message);
        return res
          .status(500)
          .json({ error: "Failed to fetch inventory statistics" });
      }

      // Get top categories by stock value
      db.all(
        `
        SELECT 
          category,
          COUNT(*) as product_count,
          SUM(quantity) as total_quantity,
          SUM(quantity * price) as total_value
        FROM inventory
        WHERE category IS NOT NULL AND category != ''
        GROUP BY category
        ORDER BY total_value DESC
        LIMIT 5
      `,
        [],
        (err, topCategories) => {
          if (err) {
            console.error("Error fetching top categories:", err.message);
            return res
              .status(500)
              .json({ error: "Failed to fetch category statistics" });
          }

          res.json({
            statistics: {
              ...stats,
              total_products: stats.total_products || 0,
              total_stock_quantity: stats.total_stock_quantity || 0,
              total_stock_value: stats.total_stock_value || 0,
            },
            top_categories: topCategories || [],
          });
        }
      );
    });
  },

  // Search inventory
  searchInventory: (req, res) => {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({ error: "Search query is required" });
    }

    const searchTerm = `%${q}%`;
    const query = `
      SELECT 
        id,
        product_name,
        product_code,
        category,
        quantity,
        price,
        CASE 
          WHEN quantity <= min_stock_level THEN 'LOW'
          WHEN quantity = 0 THEN 'OUT_OF_STOCK'
          ELSE 'IN_STOCK'
        END as stock_status
      FROM inventory
      WHERE product_name LIKE ? OR product_code LIKE ? OR category LIKE ?
      ORDER BY 
        CASE 
          WHEN quantity = 0 THEN 0
          WHEN quantity <= min_stock_level THEN 1
          ELSE 2
        END,
        product_name ASC
      LIMIT 20
    `;

    db.all(query, [searchTerm, searchTerm, searchTerm], (err, results) => {
      if (err) {
        console.error("Error searching inventory:", err.message);
        return res.status(500).json({ error: "Failed to search inventory" });
      }
      res.json(results);
    });
  },

  // Get low stock items
  getLowStockItems: (req, res) => {
    const query = `
      SELECT 
        id,
        product_name,
        product_code,
        category,
        quantity,
        min_stock_level,
        price,
        supplier,
        (min_stock_level - quantity) as needed_quantity
      FROM inventory
      WHERE quantity <= min_stock_level
      ORDER BY quantity ASC, product_name ASC
    `;

    db.all(query, [], (err, items) => {
      if (err) {
        console.error("Error fetching low stock items:", err.message);
        return res
          .status(500)
          .json({ error: "Failed to fetch low stock items" });
      }
      res.json(items);
    });
  },
};

module.exports = inventoryController;
