const express = require("express");
const router = express.Router();
const Sale = require("../models/Sale");

// CORS Preflight for all routes
router.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

// Get all sales
router.get("/", (req, res) => {
  Sale.getAllSales((err, sales) => {
    if (err) {
      console.error("Error fetching sales:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(sales);
  });
});

// Get sales statistics
router.get("/stats", (req, res) => {
  const sqlite3 = require("sqlite3").verbose();
  const path = require("path");
  const dbPath = path.resolve(__dirname, "../brickbook.db");
  const db = new sqlite3.Database(dbPath);

  const query = `
    SELECT 
      COUNT(*) as total_sales,
      SUM(total_amount) as total_revenue,
      SUM(paid_amount) as total_collected,
      SUM(due_amount) as total_outstanding,
      AVG(total_amount) as avg_sale_amount,
      MIN(sale_date) as first_sale_date,
      MAX(sale_date) as last_sale_date
    FROM sales
    WHERE status != 'cancelled'
  `;

  db.get(query, [], (err, stats) => {
    if (err) {
      console.error("Error fetching sales stats:", err.message);
      return res.status(500).json({ error: err.message });
    }

    // Get today's sales
    db.get(
      `
      SELECT 
        COUNT(*) as today_sales,
        SUM(total_amount) as today_revenue
      FROM sales
      WHERE DATE(sale_date) = DATE('now') AND status != 'cancelled'
      `,
      [],
      (err, todayStats) => {
        db.close();
        if (err) {
          console.error("Error fetching today's stats:", err.message);
          return res.status(500).json({ error: err.message });
        }

        res.json({
          overall: {
            total_sales: stats.total_sales || 0,
            total_revenue: stats.total_revenue || 0,
            total_collected: stats.total_collected || 0,
            total_outstanding: stats.total_outstanding || 0,
            avg_sale_amount: stats.avg_sale_amount || 0,
            first_sale_date: stats.first_sale_date,
            last_sale_date: stats.last_sale_date,
          },
          today: {
            today_sales: todayStats.today_sales || 0,
            today_revenue: todayStats.today_revenue || 0,
          },
        });
      }
    );
  });
});

// Get single sale by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;

  Sale.getSaleById(id, (err, sale) => {
    if (err) {
      console.error("Error fetching sale:", err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    res.json(sale);
  });
});

// Create new sale
router.post("/", (req, res) => {
  const saleData = req.body;

  console.log("=== CREATE SALE REQUEST ===");
  console.log("Received sale data:", JSON.stringify(saleData, null, 2));
  console.log("Customer ID:", saleData.customerId);
  console.log("Customer ID type:", typeof saleData.customerId);
  console.log("Items received:", saleData.items);
  console.log("Items is array?", Array.isArray(saleData.items));
  console.log("Items length:", saleData.items?.length);

  // Validate required fields
  if (
    !saleData.customerId ||
    !saleData.items ||
    !Array.isArray(saleData.items)
  ) {
    console.log("Validation failed:");
    console.log("- Has customerId?", !!saleData.customerId);
    console.log("- Has items?", !!saleData.items);
    console.log("- Items is array?", Array.isArray(saleData.items));

    return res.status(400).json({
      error: "Missing required fields: customerId and items array are required",
      details: {
        hasCustomerId: !!saleData.customerId,
        hasItems: !!saleData.items,
        itemsIsArray: Array.isArray(saleData.items),
        itemsLength: saleData.items?.length || 0,
      },
    });
  }

  if (saleData.items.length === 0) {
    return res.status(400).json({
      error: "Sale must have at least one item",
    });
  }

  // Validate each item
  for (const item of saleData.items) {
    console.log("Validating item:", item);

    // Check for name field (frontend sends name)
    const hasName = item.name && item.name.toString().trim() !== "";

    if (!hasName) {
      return res.status(400).json({
        error: "Each item must have a name field",
        invalidItem: item,
      });
    }

    if (!item.quantity || item.quantity <= 0) {
      return res.status(400).json({
        error: "Item quantity must be greater than 0",
        invalidItem: item,
      });
    }

    if (!item.price || item.price <= 0) {
      return res.status(400).json({
        error: "Item price must be greater than 0",
        invalidItem: item,
      });
    }

    // Calculate amount if not provided
    if (!item.amount && item.quantity && item.price) {
      item.amount = item.quantity * item.price;
    }
  }

  // Prepare data for the Sale model
  const saleForModel = {
    id:
      saleData.id ||
      `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    customerId: saleData.customerId,
    customerName: saleData.customerName || "Unknown",
    date: saleData.date || new Date().toISOString().split("T")[0],
    items: saleData.items.map((item) => ({
      name: item.name || "Unknown Product",
      quantity: item.quantity,
      price: item.price,
      amount: item.amount || item.quantity * item.price,
    })),
    totalAmount:
      saleData.totalAmount ||
      saleData.items.reduce(
        (sum, item) => sum + (item.amount || item.quantity * item.price),
        0
      ),
    paidAmount: saleData.paidAmount || 0,
    paymentStatus: saleData.paymentStatus || "Pending",
    deliveryStatus: saleData.deliveryStatus || "Pending",
    paymentMode: saleData.paymentMode || "Cash",
    paymentType: saleData.paymentType || "Cash",
    discount: saleData.discount || { type: "Fixed", value: 0 },
    advancePaid: saleData.advancePaid || 0,
    dueAmount: saleData.dueAmount || 0,
    dueDate: saleData.dueDate || null,
    notes: saleData.notes || "",
  };

  console.log(
    "Data prepared for Sale model:",
    JSON.stringify(saleForModel, null, 2)
  );

  Sale.createSale(saleForModel, (err, savedSale) => {
    if (err) {
      console.error("Error creating sale in model:", err.message);
      console.error("Error stack:", err.stack);

      // Handle insufficient wallet balance error
      if (err.message.includes("Insufficient wallet balance")) {
        return res.status(400).json({
          error: "Insufficient wallet balance",
          message: err.message,
        });
      }

      return res.status(500).json({
        error: "Database Error",
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }

    console.log("Sale created successfully:", savedSale);
    res.status(201).json(savedSale);
  });
});

// Update sale payment
router.put("/:id/payment", (req, res) => {
  const { id } = req.params;
  const { paidAmount, paymentStatus, notes } = req.body;

  if (paidAmount === undefined || paidAmount < 0) {
    return res.status(400).json({ error: "Valid paid amount is required" });
  }

  // First, get the sale to check current status
  const sqlite3 = require("sqlite3").verbose();
  const path = require("path");
  const dbPath = path.resolve(__dirname, "../brickbook.db");
  const db = new sqlite3.Database(dbPath);

  db.get("SELECT * FROM sales WHERE id = ?", [id], (err, sale) => {
    if (err) {
      console.error("Error fetching sale:", err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    if (paidAmount > sale.total_amount) {
      return res.status(400).json({
        error: `Paid amount cannot exceed total amount: ${sale.total_amount}`,
      });
    }

    const newBalanceDue = sale.total_amount - paidAmount;
    const paymentDiff = paidAmount - sale.paid_amount;
    const newPaymentStatus =
      paymentStatus ||
      (paidAmount === 0
        ? "Pending"
        : paidAmount === sale.total_amount
        ? "Paid"
        : "Partial");

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Update sale
      db.run(
        `
        UPDATE sales 
        SET paid_amount = ?, 
            balance_due = ?,
            payment_status = ?
        WHERE id = ?
        `,
        [paidAmount, newBalanceDue, newPaymentStatus, id],
        (err) => {
          if (err) {
            db.run("ROLLBACK");
            console.error("Error updating sale:", err.message);
            return res.status(500).json({ error: err.message });
          }

          // Update customer's wallet balance if customer exists
          if (sale.customer_id && paymentDiff !== 0) {
            db.run(
              `
              UPDATE customers 
              SET wallet_balance = wallet_balance - ?
              WHERE id = ?
              `,
              [paymentDiff, sale.customer_id],
              (err) => {
                if (err) {
                  db.run("ROLLBACK");
                  console.error("Error updating customer:", err.message);
                  return res.status(500).json({ error: err.message });
                }

                db.run("COMMIT", (err) => {
                  if (err) {
                    console.error("Error committing transaction:", err.message);
                    return res.status(500).json({ error: err.message });
                  }

                  res.json({
                    success: true,
                    id,
                    paid_amount: paidAmount,
                    balance_due: newBalanceDue,
                    payment_status: newPaymentStatus,
                    payment_diff: paymentDiff,
                    message: "Payment updated successfully",
                  });
                });
              }
            );
          } else {
            db.run("COMMIT", (err) => {
              if (err) {
                console.error("Error committing transaction:", err.message);
                return res.status(500).json({ error: err.message });
              }

              res.json({
                success: true,
                id,
                paid_amount: paidAmount,
                balance_due: newBalanceDue,
                payment_status: newPaymentStatus,
                message: "Payment updated successfully",
              });
            });
          }
        }
      );
    });
  });
});

// Cancel/delete sale
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const sqlite3 = require("sqlite3").verbose();
  const path = require("path");
  const dbPath = path.resolve(__dirname, "../brickbook.db");
  const db = new sqlite3.Database(dbPath);

  db.get("SELECT * FROM sales WHERE id = ?", [id], (err, sale) => {
    if (err) {
      console.error("Error fetching sale:", err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    if (sale.status === "cancelled") {
      return res.status(400).json({ error: "Sale is already cancelled" });
    }

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Get sale items
      db.all(
        "SELECT * FROM sale_items WHERE sale_id = ?",
        [id],
        (err, items) => {
          if (err) {
            db.run("ROLLBACK");
            console.error("Error fetching sale items:", err.message);
            return res.status(500).json({ error: err.message });
          }

          // Update customer's wallet balance (refund advance_paid)
          if (sale.customer_id && sale.advance_paid > 0) {
            db.run(
              `
              UPDATE customers 
              SET wallet_balance = wallet_balance + ?
              WHERE id = ?
              `,
              [sale.advance_paid, sale.customer_id],
              (err) => {
                if (err) {
                  db.run("ROLLBACK");
                  console.error("Error updating customer:", err.message);
                  return res.status(500).json({ error: err.message });
                }
              }
            );
          }

          // Mark sale as cancelled
          db.run(
            `
            UPDATE sales 
            SET status = 'cancelled',
                notes = COALESCE(?, notes) || ' | Cancelled on ' || datetime('now')
            WHERE id = ?
            `,
            [reason || "No reason provided", id],
            (err) => {
              if (err) {
                db.run("ROLLBACK");
                console.error("Error cancelling sale:", err.message);
                return res.status(500).json({ error: err.message });
              }

              db.run("COMMIT", (err) => {
                if (err) {
                  console.error("Error committing transaction:", err.message);
                  return res.status(500).json({ error: err.message });
                }

                res.json({
                  success: true,
                  id,
                  restored_advance: sale.advance_paid || 0,
                  message:
                    "Sale cancelled successfully. Advance amount refunded to customer wallet.",
                });
              });
            }
          );
        }
      );
    });
  });
});

// DELETE sale completely (with balance reversal)
router.delete("/delete/:id", (req, res) => {
  const { id } = req.params;

  console.log(`=== DELETE SALE REQUEST: ${id} ===`);

  Sale.deleteSale(id, (err, result) => {
    if (err) {
      console.error("Error deleting sale:", err.message);
      return res.status(500).json({
        error: "Failed to delete sale",
        message: err.message,
      });
    }

    res.json({
      success: true,
      ...result,
      message:
        "Sale deleted successfully. Customer balances have been adjusted.",
    });
  });
});

// Legacy route for compatibility with frontend
router.get("/legacy/report", (req, res) => {
  const { start_date, end_date } = req.query;

  // Create database connection directly since config/database.js might not exist
  const sqlite3 = require("sqlite3").verbose();
  const path = require("path");
  const dbPath = path.resolve(__dirname, "../brickbook.db");
  const db = new sqlite3.Database(dbPath);

  let query = `
    SELECT 
      s.*,
      c.name as customer_name
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (start_date) {
    query += " AND date(s.sale_date) >= date(?)";
    params.push(start_date);
  }

  if (end_date) {
    query += " AND date(s.sale_date) <= date(?)";
    params.push(end_date);
  }

  query += " ORDER BY s.sale_date DESC";

  db.all(query, params, (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
