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

// NEW: Record payment for a specific sale (FIXED for frontend compatibility)
router.post("/:id/payment", (req, res) => {
  const { id } = req.params;
  const { amount, customerId, notes } = req.body;

  console.log(`=== RECORD PAYMENT FOR SALE ${id} ===`);
  console.log("Payment data:", { amount, customerId, notes });

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Valid payment amount is required" });
  }

  const sqlite3 = require("sqlite3").verbose();
  const path = require("path");
  const dbPath = path.resolve(__dirname, "../brickbook.db");
  const db = new sqlite3.Database(dbPath);

  // Start transaction
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // 1. Get the sale details
    db.get("SELECT * FROM sales WHERE id = ?", [id], (err, sale) => {
      if (err) {
        db.run("ROLLBACK");
        console.error("Error fetching sale:", err.message);
        return res.status(500).json({ error: err.message });
      }

      if (!sale) {
        db.run("ROLLBACK");
        return res.status(404).json({ error: "Sale not found" });
      }

      // Calculate new paid amount
      const newPaidAmount = Number(sale.paid_amount || 0) + Number(amount);
      const newDueAmount = Math.max(
        0,
        Number(sale.total_amount) - newPaidAmount
      );

      // Determine payment status
      let paymentStatus = "Partial";
      if (newPaidAmount >= Number(sale.total_amount)) {
        paymentStatus = "Paid";
      } else if (newPaidAmount === 0) {
        paymentStatus = "Unpaid";
      }

      console.log(
        `Sale details: Total=${sale.total_amount}, Old Paid=${sale.paid_amount}, New Paid=${newPaidAmount}, New Due=${newDueAmount}`
      );

      // 2. Update the sale with new payment
      db.run(
        `UPDATE sales 
         SET paid_amount = ?, 
             due_amount = ?,
             balance_due = ?,
             payment_status = ?,
             notes = COALESCE(notes || ' | ', '') || ?
         WHERE id = ?`,
        [
          newPaidAmount,
          newDueAmount,
          newDueAmount,
          paymentStatus,
          `Payment received: ₹${amount} on ${
            new Date().toISOString().split("T")[0]
          } - ${notes || "No notes"}`,
          id,
        ],
        (err) => {
          if (err) {
            db.run("ROLLBACK");
            console.error("Error updating sale payment:", err.message);
            return res.status(500).json({ error: err.message });
          }

          console.log("Sale payment updated successfully");

          // 3. Update customer's wallet or outstanding balance
          // For general payment: if there's a customer, add to wallet
          // For specific sale payment: reduce outstanding balance
          const customerIdToUpdate = customerId || sale.customer_id;

          if (customerIdToUpdate) {
            // Check if this payment should go to wallet or reduce dues
            // If amount exceeds due amount, put excess in wallet
            const excessAmount = Math.max(
              0,
              Number(amount) - Number(sale.due_amount || 0)
            );
            const duesReduction = Number(amount) - excessAmount;

            console.log(
              `Payment breakdown: Dues reduction=₹${duesReduction}, Excess to wallet=₹${excessAmount}`
            );

            if (duesReduction > 0) {
              // Reduce outstanding balance
              db.run(
                `UPDATE customers 
                 SET outstanding_balance = COALESCE(outstanding_balance, 0) - ?,
                     last_active = datetime('now')
                 WHERE id = ?`,
                [duesReduction, customerIdToUpdate],
                (custErr) => {
                  if (custErr) {
                    db.run("ROLLBACK");
                    console.error(
                      "Error updating customer dues:",
                      custErr.message
                    );
                    return res.status(500).json({ error: custErr.message });
                  }
                  console.log(
                    `Reduced customer ${customerIdToUpdate} dues by ₹${duesReduction}`
                  );
                }
              );
            }

            if (excessAmount > 0) {
              // Add excess to wallet
              db.run(
                `UPDATE customers 
                 SET wallet_balance = COALESCE(wallet_balance, 0) + ?,
                     last_active = datetime('now')
                 WHERE id = ?`,
                [excessAmount, customerIdToUpdate],
                (walletErr) => {
                  if (walletErr) {
                    db.run("ROLLBACK");
                    console.error("Error updating wallet:", walletErr.message);
                    return res.status(500).json({ error: walletErr.message });
                  }
                  console.log(
                    `Added ₹${excessAmount} to customer ${customerIdToUpdate} wallet`
                  );
                }
              );
            }

            // 4. Create transaction record
            const transactionQuery = `
              INSERT INTO transactions 
              (customer_id, amount, type, description, notes, created_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
            `;

            db.run(
              transactionQuery,
              [
                customerIdToUpdate,
                amount,
                "credit",
                `Payment for sale ${id}`,
                notes || `Payment collected for sale ${id}`,
              ],
              (transErr) => {
                if (transErr) {
                  console.error(
                    "Error creating transaction:",
                    transErr.message
                  );
                  // Don't rollback for transaction error, just log it
                }
              }
            );
          }

          // Commit the transaction
          db.run("COMMIT", (commitErr) => {
            if (commitErr) {
              console.error("Error committing transaction:", commitErr.message);
              return res.status(500).json({ error: commitErr.message });
            }

            // Get updated sale
            db.get(
              "SELECT * FROM sales WHERE id = ?",
              [id],
              (finalErr, updatedSale) => {
                if (finalErr) {
                  console.error(
                    "Error fetching updated sale:",
                    finalErr.message
                  );
                  // Still return success since payment was recorded
                }

                console.log(`✅ Payment processed successfully for sale ${id}`);

                res.json({
                  success: true,
                  message: "Payment recorded successfully",
                  saleId: id,
                  amount: Number(amount),
                  previousPaid: Number(sale.paid_amount || 0),
                  newPaid: newPaidAmount,
                  remainingDue: newDueAmount,
                  paymentStatus: paymentStatus,
                  updatedSale: updatedSale || null,
                });
              }
            );
          });
        }
      );
    });
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
