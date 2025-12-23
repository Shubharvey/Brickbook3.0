const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "../brickbook.db");
const db = new sqlite3.Database(dbPath);

class Sale {
  static createSale(saleData, callback) {
    // ---------------------------------------------------------
    // 1. PREPARE DATA - MATCHING DATABASE COLUMN NAMES
    // ---------------------------------------------------------
    const customerId = saleData.customerId || saleData.customer_id || null;
    const customerName =
      saleData.customerName || saleData.customer_name || "Walk-in";
    const date =
      saleData.date ||
      saleData.sale_date ||
      new Date().toISOString().split("T")[0];

    // Amounts
    const totalAmount = Number(
      saleData.totalAmount || saleData.total_amount || 0
    );
    const paidAmount = Number(saleData.paidAmount || saleData.paid_amount || 0);
    const dueAmount =
      saleData.dueAmount !== undefined
        ? Number(saleData.dueAmount)
        : totalAmount - paidAmount;
    const advancePaid = Number(saleData.advancePaid || 0);
    const balanceDue = dueAmount; // balance_due should equal due_amount

    // Status & Meta - Use your actual database column names
    const status = saleData.status || saleData.paymentStatus || "Completed";
    const deliveryStatus = saleData.deliveryStatus || "Pending";
    const paymentMode = saleData.paymentMode || "Cash";
    const paymentType = saleData.paymentType || "Cash";
    const category = saleData.category || "General";
    const dueDate = saleData.dueDate || saleData.due_date || null;
    const discountType = saleData.discount?.type || "Fixed";
    const discountValue = Number(saleData.discount?.value || 0);

    // Items Logic
    let items = [];
    if (Array.isArray(saleData.items) && saleData.items.length > 0) {
      items = saleData.items;
    } else {
      // Fallback for simple dashboard form
      const simpleName =
        saleData.productName || saleData.product_name || "General Item";
      items = [
        {
          name: simpleName,
          quantity: Number(saleData.quantity || 1),
          price: totalAmount,
          amount: totalAmount,
        },
      ];
    }

    // Determine Main Product Name for the Sales Table Summary
    let productName = saleData.productName || saleData.product_name;
    if (!productName && items.length > 0) {
      productName =
        items.length === 1
          ? items[0].name
          : `${items[0].name} +${items.length - 1} more`;
    }

    console.log("=== SALE DATA PREPARED ===");
    console.log("Payment Type:", paymentType);
    console.log("Total Amount:", totalAmount);
    console.log("Paid Amount:", paidAmount);
    console.log("Due Amount:", dueAmount);
    console.log("Advance Paid:", advancePaid);
    console.log("Customer ID:", customerId);
    console.log("Customer Name:", customerName);

    // ---------------------------------------------------------
    // 2. EXECUTE TRANSACTION - WITH WALLET BALANCE VALIDATION
    // ---------------------------------------------------------
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Check wallet balance before proceeding for advance payments
      if (
        customerId &&
        (paymentType === "Advance + Cash" || paymentType === "Full Advance")
      ) {
        db.get(
          "SELECT wallet_balance FROM customers WHERE id = ?",
          [customerId],
          (err, customer) => {
            if (err) {
              db.run("ROLLBACK");
              return callback(err);
            }

            if (!customer) {
              db.run("ROLLBACK");
              return callback(new Error("Customer not found"));
            }

            const currentWalletBalance = Number(customer.wallet_balance || 0);

            // CRITICAL FIX: Check if wallet has sufficient balance
            if (currentWalletBalance < advancePaid) {
              db.run("ROLLBACK");
              return callback(
                new Error(
                  `Insufficient wallet balance. Required: ${advancePaid}, Available: ${currentWalletBalance}`
                )
              );
            }

            // Proceed with sale insertion
            insertSale();
          }
        );
      } else {
        // For non-advance payments, proceed directly
        insertSale();
      }

      function insertSale() {
        // Using the correct column names including original_id
        const insertSaleSql = `
          INSERT INTO sales (
            original_id, customer_id, customer_name, product_name, sale_date, 
            total_amount, paid_amount, due_amount, balance_due,
            advance_paid, payment_type, payment_mode, payment_status, 
            delivery_status, category, due_date, discount_type, 
            discount_value, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
          saleData.id || null, // This becomes original_id
          customerId,
          customerName,
          productName,
          date,
          totalAmount,
          paidAmount,
          dueAmount,
          balanceDue,
          advancePaid,
          paymentType,
          paymentMode,
          status,
          deliveryStatus,
          category,
          dueDate,
          discountType,
          discountValue,
          status,
          saleData.notes || "",
        ];

        console.log("Executing sale insert SQL:", insertSaleSql);
        console.log("With params:", params);

        db.run(insertSaleSql, params, function (err) {
          if (err) {
            console.error("❌ DB INSERT ERROR (Sale):", err.message);
            console.error("SQL:", insertSaleSql);
            console.error("Params:", params);
            db.run("ROLLBACK");
            return callback(err);
          }

          const saleId = this.lastID;
          console.log("✅ Sale inserted with ID:", saleId);

          // If no items to insert, just commit
          if (items.length === 0) {
            console.log("No items to insert, committing...");
            updateCustomerAndCommit(saleId);
            return;
          }

          // Insert Items
          const stmt = db.prepare(
            `INSERT INTO sale_items (sale_id, item_name, quantity, unit_price, amount, total_price) VALUES (?, ?, ?, ?, ?, ?)`
          );

          let errorOccurred = false;
          items.forEach((item) => {
            const iName =
              item.name || item.itemName || item.item_name || "Item";
            const iQty = Number(item.quantity || 1);
            const iPrice = Number(item.price || item.unit_price || 0);
            const iAmount = Number(
              item.amount || item.total_price || iQty * iPrice
            );

            console.log("Inserting item:", { iName, iQty, iPrice, iAmount });

            stmt.run(
              [saleId, iName, iQty, iPrice, iAmount, iAmount],
              (iErr) => {
                if (iErr) {
                  console.error("Item insert error:", iErr.message);
                  errorOccurred = true;
                }
              }
            );
          });

          stmt.finalize(() => {
            if (errorOccurred) {
              db.run("ROLLBACK");
              return callback(new Error("Failed to insert one or more items"));
            }

            updateCustomerAndCommit(saleId);
          });
        });
      }

      function updateCustomerAndCommit(saleId) {
        // UPDATE CUSTOMER - WITH PROPER WALLET BALANCE LOGIC
        if (customerId) {
          console.log("=== UPDATING CUSTOMER BALANCE ===");
          console.log("Payment Type:", paymentType);
          console.log("Due Amount:", dueAmount);
          console.log("Advance Paid:", advancePaid);
          console.log("Total Amount:", totalAmount);
          console.log("Customer ID:", customerId);

          let updateCustSql = "";
          let updateParams = [];

          // FIXED LOGIC: Proper handling of different payment types
          if (paymentType === "Dues + Cash") {
            // For "Dues + Cash": Add dueAmount to outstanding_balance
            // Cash portion doesn't affect wallet
            updateCustSql = `
              UPDATE customers 
              SET 
                outstanding_balance = COALESCE(outstanding_balance, 0) + ?, 
                total_purchases = COALESCE(total_purchases, 0) + ?,
                last_active = datetime('now')
              WHERE id = ?
            `;
            updateParams = [dueAmount, totalAmount, customerId];
            console.log(
              "Dues + Cash - Adding to outstanding_balance:",
              dueAmount
            );
          } else if (paymentType === "Advance + Cash") {
            // For "Advance + Cash": Subtract advancePaid from wallet_balance
            // Add dueAmount to outstanding_balance
            updateCustSql = `
              UPDATE customers 
              SET 
                wallet_balance = COALESCE(wallet_balance, 0) - ?,
                outstanding_balance = COALESCE(outstanding_balance, 0) + ?,
                total_purchases = COALESCE(total_purchases, 0) + ?,
                last_active = datetime('now')
              WHERE id = ?
            `;
            updateParams = [advancePaid, dueAmount, totalAmount, customerId];
            console.log(
              "Advance + Cash - Subtracting from wallet:",
              advancePaid,
              "Adding to outstanding:",
              dueAmount
            );
          } else if (paymentType === "Full Advance") {
            // For "Full Advance": Subtract totalAmount from wallet_balance
            updateCustSql = `
              UPDATE customers 
              SET 
                wallet_balance = COALESCE(wallet_balance, 0) - ?,
                total_purchases = COALESCE(total_purchases, 0) + ?,
                last_active = datetime('now')
              WHERE id = ?
            `;
            updateParams = [totalAmount, totalAmount, customerId];
            console.log("Full Advance - Subtracting from wallet:", totalAmount);
          } else if (paymentType === "Credit") {
            // For Credit: Add full amount to outstanding_balance
            updateCustSql = `
              UPDATE customers 
              SET 
                outstanding_balance = COALESCE(outstanding_balance, 0) + ?,
                total_purchases = COALESCE(total_purchases, 0) + ?,
                last_active = datetime('now')
              WHERE id = ?
            `;
            updateParams = [totalAmount, totalAmount, customerId];
            console.log("Credit - Adding to outstanding_balance:", totalAmount);
          } else {
            // For Cash: Only update total_purchases
            updateCustSql = `
              UPDATE customers 
              SET 
                total_purchases = COALESCE(total_purchases, 0) + ?,
                last_active = datetime('now')
              WHERE id = ?
            `;
            updateParams = [totalAmount, customerId];
            console.log("Cash - Only updating total purchases");
          }

          console.log("Executing customer update SQL:", updateCustSql);
          console.log("With params:", updateParams);

          db.run(updateCustSql, updateParams, (uErr) => {
            if (uErr) {
              console.error("❌ DB UPDATE ERROR (Customer):", uErr.message);
              console.error("SQL:", updateCustSql);
              console.error("Params:", updateParams);
              db.run("ROLLBACK");
              return callback(uErr);
            }

            console.log("✅ Customer updated successfully");

            // Verify the update
            db.get(
              "SELECT outstanding_balance, wallet_balance FROM customers WHERE id = ?",
              [customerId],
              (verifyErr, updatedCustomer) => {
                if (verifyErr) {
                  console.error("Error verifying update:", verifyErr.message);
                } else {
                  console.log(
                    `✅ Customer verification - Outstanding: ${updatedCustomer.outstanding_balance}, Wallet: ${updatedCustomer.wallet_balance}`
                  );

                  // CRITICAL: Ensure wallet balance never goes negative
                  if (updatedCustomer.wallet_balance < 0) {
                    console.error("⚠️ WALLET BALANCE IS NEGATIVE! Fixing...");
                    // Reset to 0 if somehow negative
                    db.run(
                      "UPDATE customers SET wallet_balance = 0 WHERE id = ?",
                      [customerId],
                      (fixErr) => {
                        if (fixErr)
                          console.error("Error fixing wallet:", fixErr);
                      }
                    );
                  }
                }

                commitTransaction(saleId);
              }
            );
          });
        } else {
          // No customer ID (walk-in customer)
          console.log("No customer ID, committing without customer update");
          commitTransaction(saleId);
        }
      }

      function commitTransaction(saleId) {
        db.run("COMMIT", (cErr) => {
          if (cErr) {
            console.error("Error committing transaction:", cErr.message);
            return callback(cErr);
          }

          callback(null, {
            id: saleId,
            original_id: saleData.id || null,
            customer_id: customerId,
            customer_name: customerName,
            product_name: productName,
            sale_date: date,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            due_amount: dueAmount,
            balance_due: balanceDue,
            advance_paid: advancePaid,
            payment_type: paymentType,
            payment_mode: paymentMode,
            payment_status: status,
            delivery_status: deliveryStatus,
            category: category,
            due_date: dueDate,
            discount_type: discountType,
            discount_value: discountValue,
            status: status,
            notes: saleData.notes || "",
          });
        });
      }
    });
  }

  // Add deleteSale method
  static deleteSale(saleId, callback) {
    console.log(`=== DELETING SALE: ${saleId} ===`);

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // First get the sale details including customer and payment info
      db.get(
        `SELECT s.*, c.wallet_balance, c.outstanding_balance 
         FROM sales s 
         LEFT JOIN customers c ON s.customer_id = c.id 
         WHERE s.id = ?`,
        [saleId],
        (err, sale) => {
          if (err) {
            db.run("ROLLBACK");
            return callback(err);
          }

          if (!sale) {
            db.run("ROLLBACK");
            return callback(new Error("Sale not found"));
          }

          console.log("Sale found:", {
            id: sale.id,
            customer_id: sale.customer_id,
            payment_type: sale.payment_type,
            advance_paid: sale.advance_paid,
            due_amount: sale.due_amount,
            total_amount: sale.total_amount,
          });

          // Reverse customer balance changes based on payment type
          if (sale.customer_id) {
            let updateSql = "";
            let updateParams = [];

            if (sale.payment_type === "Dues + Cash") {
              // Reverse: Subtract due_amount from outstanding_balance
              updateSql = `
                UPDATE customers 
                SET 
                  outstanding_balance = COALESCE(outstanding_balance, 0) - ?,
                  total_purchases = COALESCE(total_purchases, 0) - ?,
                  last_active = datetime('now')
                WHERE id = ?
              `;
              updateParams = [
                sale.due_amount,
                sale.total_amount,
                sale.customer_id,
              ];
            } else if (sale.payment_type === "Advance + Cash") {
              // Reverse: Add advance_paid back to wallet, subtract due_amount from outstanding
              updateSql = `
                UPDATE customers 
                SET 
                  wallet_balance = COALESCE(wallet_balance, 0) + ?,
                  outstanding_balance = COALESCE(outstanding_balance, 0) - ?,
                  total_purchases = COALESCE(total_purchases, 0) - ?,
                  last_active = datetime('now')
                WHERE id = ?
              `;
              updateParams = [
                sale.advance_paid,
                sale.due_amount,
                sale.total_amount,
                sale.customer_id,
              ];
            } else if (sale.payment_type === "Full Advance") {
              // Reverse: Add total_amount back to wallet
              updateSql = `
                UPDATE customers 
                SET 
                  wallet_balance = COALESCE(wallet_balance, 0) + ?,
                  total_purchases = COALESCE(total_purchases, 0) - ?,
                  last_active = datetime('now')
                WHERE id = ?
              `;
              updateParams = [
                sale.total_amount,
                sale.total_amount,
                sale.customer_id,
              ];
            } else if (sale.payment_type === "Credit") {
              // Reverse: Subtract total_amount from outstanding_balance
              updateSql = `
                UPDATE customers 
                SET 
                  outstanding_balance = COALESCE(outstanding_balance, 0) - ?,
                  total_purchases = COALESCE(total_purchases, 0) - ?,
                  last_active = datetime('now')
                WHERE id = ?
              `;
              updateParams = [
                sale.total_amount,
                sale.total_amount,
                sale.customer_id,
              ];
            } else {
              // For Cash: Just subtract from total_purchases
              updateSql = `
                UPDATE customers 
                SET 
                  total_purchases = COALESCE(total_purchases, 0) - ?,
                  last_active = datetime('now')
                WHERE id = ?
              `;
              updateParams = [sale.total_amount, sale.customer_id];
            }

            console.log("Reversing customer update:", updateSql, updateParams);

            db.run(updateSql, updateParams, (updateErr) => {
              if (updateErr) {
                console.error(
                  "Error reversing customer update:",
                  updateErr.message
                );
                db.run("ROLLBACK");
                return callback(updateErr);
              }

              deleteSaleItems();
            });
          } else {
            // No customer, just delete sale items
            deleteSaleItems();
          }

          function deleteSaleItems() {
            // Delete sale items first (foreign key constraint)
            db.run(
              "DELETE FROM sale_items WHERE sale_id = ?",
              [saleId],
              (itemsErr) => {
                if (itemsErr) {
                  console.error("Error deleting sale items:", itemsErr.message);
                  db.run("ROLLBACK");
                  return callback(itemsErr);
                }

                console.log("Sale items deleted");

                // Now delete the sale
                db.run(
                  "DELETE FROM sales WHERE id = ?",
                  [saleId],
                  (saleErr) => {
                    if (saleErr) {
                      console.error("Error deleting sale:", saleErr.message);
                      db.run("ROLLBACK");
                      return callback(saleErr);
                    }

                    db.run("COMMIT", (commitErr) => {
                      if (commitErr) {
                        console.error(
                          "Error committing transaction:",
                          commitErr.message
                        );
                        return callback(commitErr);
                      }

                      console.log(`✅ Sale ${saleId} deleted successfully`);
                      callback(null, {
                        success: true,
                        message: "Sale deleted successfully",
                        saleId: saleId,
                        reversedCustomerId: sale.customer_id,
                      });
                    });
                  }
                );
              }
            );
          }
        }
      );
    });
  }

  // ... rest of existing methods (getAllSales, getSaleById, getSalesByCustomerId) remain the same
  static getAllSales(callback) {
    const query = `
      SELECT s.*, 
             (SELECT GROUP_CONCAT(item_name || '|' || quantity || '|' || unit_price) 
              FROM sale_items si 
              WHERE si.sale_id = s.id) as items_summary
      FROM sales s
      ORDER BY s.sale_date DESC
    `;

    db.all(query, [], (err, sales) => {
      if (err) return callback(err);

      // Parse items summary for each sale
      const salesWithItems = sales.map((sale) => {
        const items = [];
        if (sale.items_summary) {
          const itemStrings = sale.items_summary.split(",");
          itemStrings.forEach((itemStr) => {
            const [name, quantity, price] = itemStr.split("|");
            items.push({
              item_name: name,
              quantity: parseInt(quantity),
              unit_price: parseFloat(price),
              amount: parseInt(quantity) * parseFloat(price),
            });
          });
        }
        return { ...sale, items };
      });

      callback(null, salesWithItems);
    });
  }

  static getSaleById(id, callback) {
    db.get("SELECT * FROM sales WHERE id = ?", [id], (err, sale) => {
      if (err || !sale) return callback(err, sale);
      db.all(
        "SELECT * FROM sale_items WHERE sale_id = ?",
        [sale.id],
        (iErr, items) => {
          if (iErr) return callback(iErr);
          sale.items = items;
          callback(null, sale);
        }
      );
    });
  }

  static getSalesByCustomerId(customerId, callback) {
    db.all(
      "SELECT * FROM sales WHERE customer_id = ? ORDER BY sale_date DESC",
      [customerId],
      (err, sales) => {
        if (err) return callback(err);

        // For each sale, get its items
        const salesWithItems = [];
        let processed = 0;

        if (sales.length === 0) {
          return callback(null, []);
        }

        sales.forEach((sale) => {
          db.all(
            "SELECT * FROM sale_items WHERE sale_id = ?",
            [sale.id],
            (iErr, items) => {
              if (iErr) {
                console.error(
                  "Error fetching items for sale:",
                  sale.id,
                  iErr.message
                );
                sale.items = [];
              } else {
                sale.items = items;
              }

              salesWithItems.push(sale);
              processed++;

              if (processed === sales.length) {
                callback(null, salesWithItems);
              }
            }
          );
        });
      }
    );
  }
}

module.exports = Sale;
