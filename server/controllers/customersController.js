// Use the centralized database instance
const { db } = require("../index");

const customersController = {
  // Get all customers - TRANSFORMED for frontend
  getAllCustomers: (req, res) => {
    console.log("=== FETCHING CUSTOMERS FROM DATABASE ===");

    const query = `
      SELECT 
        id, 
        name, 
        phone, 
        email, 
        address, 
        total_purchases, 
        outstanding_balance, 
        wallet_balance,
        type,
        created_at,
        last_active
      FROM customers
      ORDER BY name ASC
    `;

    console.log("Executing query:", query);

    db.all(query, [], (err, customers) => {
      if (err) {
        console.error("❌ Error fetching customers:", err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log(`✅ Found ${customers.length} customers in database`);

      const transformedCustomers = customers.map((customer) => {
        const walletBalance = Math.max(
          0,
          parseFloat(customer.wallet_balance || 0)
        );
        const totalDues = Math.max(
          0,
          parseFloat(customer.outstanding_balance || 0)
        );

        const transformed = {
          id: customer.id.toString(),
          name: customer.name || "Unknown",
          phone: customer.phone || "",
          type: customer.type || "Regular",
          walletBalance: walletBalance,
          wallet_balance: walletBalance, // Keep for backward compatibility if needed
          totalDues: totalDues,
          outstanding_balance: totalDues, // Keep for backward compatibility if needed
          lastActive: customer.last_active
            ? customer.last_active.split(" ")[0]
            : customer.created_at
            ? customer.created_at.split(" ")[0]
            : new Date().toISOString().split("T")[0],
          last_active: customer.last_active || customer.created_at, // Keep for backward compatibility if needed
          email: customer.email || "",
          address: customer.address || "",
          total_purchases: parseFloat(customer.total_purchases || 0),
        };

        if (parseFloat(customer.wallet_balance || 0) < 0) {
          console.warn(
            `⚠️ Customer ${customer.name} had negative wallet balance: ${customer.wallet_balance}, fixed to: ${walletBalance}`
          );
        }

        console.log(
          `Customer: ${customer.name} - Dues: ${transformed.totalDues}, Wallet: ${transformed.walletBalance}`
        );
        return transformed;
      });

      const customersWithDues = transformedCustomers.filter(
        (c) => c.totalDues > 0
      );
      console.log(
        `📊 ${customersWithDues.length} customers have outstanding dues`
      );
      customersWithDues.forEach((c) => {
        console.log(
          `   - ${c.name}: ₹${c.totalDues} (Wallet: ₹${c.walletBalance})`
        );
      });

      res.json(transformedCustomers);
    });
  },

  // Get single customer by ID with their sales - ENHANCED
  getCustomerById: (req, res) => {
    const { id } = req.params;
    console.log(`Fetching customer details for ID: ${id}`);

    db.get("SELECT * FROM customers WHERE id = ?", [id], (err, customer) => {
      if (err) {
        console.error("Error fetching customer:", err.message);
        return res.status(500).json({ error: err.message });
      }

      if (!customer) {
        console.log(`Customer with ID ${id} not found`);
        return res.status(404).json({ error: "Customer not found" });
      }

      const walletBalance = Math.max(
        0,
        parseFloat(customer.wallet_balance || 0)
      );
      const totalDues = Math.max(
        0,
        parseFloat(customer.outstanding_balance || 0)
      );

      const transformedCustomer = {
        id: customer.id.toString(),
        name: customer.name,
        phone: customer.phone || "",
        type: customer.type || "Regular",
        walletBalance: walletBalance,
        totalDues: totalDues,
        lastActive: customer.last_active
          ? customer.last_active.split(" ")[0]
          : customer.created_at
          ? customer.created_at.split(" ")[0]
          : new Date().toISOString().split("T")[0],
        email: customer.email || "",
        address: customer.address || "",
        total_purchases: parseFloat(customer.total_purchases || 0),
        outstanding_balance: totalDues, // Keep for backward compatibility
        wallet_balance: walletBalance, // Keep for backward compatibility
      };

      console.log(`Customer found: ${transformedCustomer.name}`);
      console.log(
        `Dues: ₹${transformedCustomer.totalDues}, Wallet: ₹${transformedCustomer.walletBalance}`
      );

      const salesQuery = `
        SELECT 
          s.id as sale_id,
          s.sale_date,
          s.total_amount,
          s.paid_amount,
          s.due_amount,
          s.balance_due,
          s.payment_type,
          s.payment_status,
          si.item_name,
          si.quantity,
          si.unit_price,
          si.amount
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        WHERE s.customer_id = ?
        ORDER BY s.sale_date DESC
      `;

      db.all(salesQuery, [id], (err, salesRows) => {
        if (err) {
          console.error("Error fetching customer sales:", err.message);
          return res.status(500).json({ error: err.message });
        }

        const salesMap = {};
        salesRows.forEach((row) => {
          if (!salesMap[row.sale_id]) {
            salesMap[row.sale_id] = {
              id: row.sale_id.toString(),
              date: row.sale_date,
              totalAmount: parseFloat(row.total_amount || 0),
              paidAmount: parseFloat(row.paid_amount || 0),
              dueAmount: parseFloat(row.due_amount || 0),
              balanceDue: parseFloat(row.balance_due || 0),
              paymentType: row.payment_type || "Cash",
              paymentStatus: row.payment_status || "Pending",
              items: [],
            };
          }

          if (row.item_name) {
            salesMap[row.sale_id].items.push({
              name: row.item_name,
              quantity: parseInt(row.quantity || 0),
              price: parseFloat(row.unit_price || 0),
              amount: parseFloat(row.amount || 0),
            });
          }
        });

        const formattedSales = Object.values(salesMap);
        console.log(`Found ${formattedSales.length} sales for customer`);

        const totalDuesFromSales = formattedSales.reduce(
          (sum, sale) => sum + (sale.dueAmount || sale.balanceDue || 0),
          0
        );

        console.log(`Total dues from sales: ₹${totalDuesFromSales}`);
        console.log(
          `Customer outstanding_balance: ₹${transformedCustomer.totalDues}`
        );

        res.json({
          customer: transformedCustomer,
          sales: formattedSales,
          totalSales: formattedSales.length,
          totalSpent: formattedSales.reduce(
            (sum, sale) => sum + (sale.totalAmount || 0),
            0
          ),
          totalDuesFromSales: totalDuesFromSales,
          verification: {
            databaseOutstanding: transformedCustomer.totalDues,
            calculatedFromSales: totalDuesFromSales,
            match:
              Math.abs(transformedCustomer.totalDues - totalDuesFromSales) <
              0.01,
          },
        });
      });
    });
  },

  // Create new customer - IMPROVED
  createCustomer: (req, res) => {
    const { name, phone, email, address, type } = req.body;
    console.log("Creating new customer:", { name, phone, type });

    if (!name) {
      return res.status(400).json({ error: "Customer name is required" });
    }

    const query = `
      INSERT INTO customers (name, phone, email, address, type) 
      VALUES (?, ?, ?, ?, ?)
    `;

    const customerType = type || "Regular";

    db.run(
      query,
      [name, phone || null, email || null, address || null, customerType],
      function (err) {
        if (err) {
          console.error("Error creating customer:", err.message);

          if (err.message.includes("UNIQUE constraint failed")) {
            return res
              .status(409)
              .json({ error: "Phone number already exists" });
          }

          return res.status(500).json({ error: err.message });
        }

        db.get(
          "SELECT * FROM customers WHERE id = ?",
          [this.lastID],
          (err, newCustomer) => {
            if (err) {
              console.error("Error fetching new customer:", err.message);
              return res.status(500).json({ error: err.message });
            }

            const transformedCustomer = {
              id: newCustomer.id.toString(),
              name: newCustomer.name,
              phone: newCustomer.phone || "",
              type: newCustomer.type || customerType,
              walletBalance: Math.max(
                0,
                parseFloat(newCustomer.wallet_balance || 0)
              ),
              totalDues: Math.max(
                0,
                parseFloat(newCustomer.outstanding_balance || 0)
              ),
              lastActive: newCustomer.last_active
                ? newCustomer.last_active.split(" ")[0]
                : newCustomer.created_at
                ? newCustomer.created_at.split(" ")[0]
                : new Date().toISOString().split("T")[0],
              email: newCustomer.email || "",
              address: newCustomer.address || "",
              wallet_balance: Math.max(
                0,
                parseFloat(newCustomer.wallet_balance || 0)
              ), // Keep for backward compatibility
              outstanding_balance: Math.max(
                0,
                parseFloat(newCustomer.outstanding_balance || 0)
              ), // Keep for backward compatibility
            };

            res.status(201).json({
              ...transformedCustomer,
              message: "Customer created successfully",
            });
          }
        );
      }
    );
  },

  // Update customer with balance updates - ADD WALLET VALIDATION
  updateCustomer: (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    console.log(`Updating customer ${id}:`, updates);

    if (!id) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    db.get(
      "SELECT * FROM customers WHERE id = ?",
      [id],
      (err, existingCustomer) => {
        if (err) {
          console.error("Error checking customer:", err.message);
          return res.status(500).json({ error: err.message });
        }

        if (!existingCustomer) {
          return res.status(404).json({ error: "Customer not found" });
        }

        // Ensure walletBalance and outstanding_balance are always non-negative
        if (updates.walletBalance !== undefined) {
          updates.wallet_balance = Math.max(
            0,
            parseFloat(updates.walletBalance)
          );
          console.log(
            `Wallet balance adjusted to non-negative: ${updates.wallet_balance}`
          );
        }
        if (updates.wallet_balance !== undefined) {
          updates.wallet_balance = Math.max(
            0,
            parseFloat(updates.wallet_balance)
          );
          console.log(
            `Wallet balance (raw) adjusted to non-negative: ${updates.wallet_balance}`
          );
        }

        if (updates.totalDues !== undefined) {
          updates.outstanding_balance = Math.max(
            0,
            parseFloat(updates.totalDues)
          );
          console.log(
            `Outstanding balance adjusted to non-negative: ${updates.outstanding_balance}`
          );
        }
        if (updates.outstanding_balance !== undefined) {
          updates.outstanding_balance = Math.max(
            0,
            parseFloat(updates.outstanding_balance)
          );
          console.log(
            `Outstanding balance (raw) adjusted to non-negative: ${updates.outstanding_balance}`
          );
        }

        const allowedFields = [
          "name",
          "phone",
          "email",
          "address",
          "type",
          "wallet_balance",
          "outstanding_balance",
        ];
        const updateFields = [];
        const values = [];

        allowedFields.forEach((field) => {
          if (updates[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            values.push(updates[field]);
          }
          // Handle 'walletBalance' and 'totalDues' which map to 'wallet_balance' and 'outstanding_balance'
          if (
            field === "wallet_balance" &&
            updates.walletBalance !== undefined &&
            updates.wallet_balance === undefined
          ) {
            updateFields.push(`${field} = ?`);
            values.push(updates.walletBalance);
          }
          if (
            field === "outstanding_balance" &&
            updates.totalDues !== undefined &&
            updates.outstanding_balance === undefined
          ) {
            updateFields.push(`${field} = ?`);
            values.push(updates.totalDues);
          }
        });

        if (updateFields.length === 0) {
          return res.status(400).json({ error: "No valid fields to update" });
        }

        updateFields.push("last_active = datetime('now')");
        values.push(id); // ID for WHERE clause

        const query = `UPDATE customers SET ${updateFields.join(
          ", "
        )} WHERE id = ?`;
        console.log("Update query:", query);
        console.log("Update values:", values);

        db.run(query, values, function (err) {
          if (err) {
            console.error("Error updating customer:", err.message);
            return res.status(500).json({ error: err.message });
          }

          console.log(`Customer updated, changes: ${this.changes}`);

          db.get(
            "SELECT * FROM customers WHERE id = ?",
            [id],
            (err, updatedCustomer) => {
              if (err) {
                console.error("Error fetching updated customer:", err.message);
                return res.status(500).json({ error: err.message });
              }

              const transformedCustomer = {
                id: updatedCustomer.id.toString(),
                name: updatedCustomer.name,
                phone: updatedCustomer.phone || "",
                type: updatedCustomer.type || "Regular",
                walletBalance: Math.max(
                  0,
                  parseFloat(updatedCustomer.wallet_balance || 0)
                ),
                totalDues: Math.max(
                  0,
                  parseFloat(updatedCustomer.outstanding_balance || 0)
                ),
                lastActive: updatedCustomer.last_active
                  ? updatedCustomer.last_active.split(" ")[0]
                  : updatedCustomer.created_at
                  ? updatedCustomer.created_at.split(" ")[0]
                  : new Date().toISOString().split("T")[0],
                email: updatedCustomer.email || "",
                address: updatedCustomer.address || "",
              };

              res.json({
                success: true,
                customer: transformedCustomer,
                updatedFields: updateFields,
                message: "Customer updated successfully",
              });
            }
          );
        });
      }
    );
  },

  // Delete customer
  deleteCustomer: (req, res) => {
    const { id } = req.params;
    console.log(`Attempting to delete customer ${id}`);

    db.get("SELECT * FROM customers WHERE id = ?", [id], (err, customer) => {
      if (err) {
        console.error("Error checking customer:", err.message);
        return res.status(500).json({ error: err.message });
      }

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      if (parseFloat(customer.outstanding_balance || 0) > 0) {
        return res.status(400).json({
          error: "Cannot delete customer with outstanding balance",
          outstandingBalance: customer.outstanding_balance,
        });
      }

      db.get(
        "SELECT COUNT(*) as salesCount FROM sales WHERE customer_id = ?",
        [id],
        (err, result) => {
          if (err) {
            console.error("Error checking customer sales:", err.message);
            return res.status(500).json({ error: err.message });
          }

          if (result.salesCount > 0) {
            return res.status(400).json({
              error: "Cannot delete customer with existing sales",
              salesCount: result.salesCount,
            });
          }

          db.run("DELETE FROM customers WHERE id = ?", [id], function (err) {
            if (err) {
              console.error("Error deleting customer:", err.message);
              return res.status(500).json({ error: err.message });
            }

            console.log(`Customer ${id} deleted successfully`);
            res.json({
              success: true,
              deletedId: id,
              deletedName: customer.name,
              message: "Customer deleted successfully",
            });
          });
        }
      );
    });
  },

  // Search customers by name or phone
  searchCustomers: (req, res) => {
    const { query } = req.query;

    console.log(`Searching customers for: "${query}"`);

    if (!query || query.trim() === "") {
      return res.status(400).json({ error: "Search query is required" });
    }

    const searchTerm = `%${query}%`;
    const searchQuery = `
      SELECT 
        id, 
        name, 
        phone, 
        email, 
        outstanding_balance,
        wallet_balance,
        type
      FROM customers 
      WHERE name LIKE ? OR phone LIKE ?
      ORDER BY 
        CASE 
          WHEN name LIKE ? THEN 1
          WHEN phone LIKE ? THEN 2
          ELSE 3
        END,
        name ASC
      LIMIT 20
    `;

    db.all(
      searchQuery,
      [searchTerm, searchTerm, searchTerm, searchTerm],
      (err, customers) => {
        if (err) {
          console.error("Error searching customers:", err.message);
          return res.status(500).json({ error: err.message });
        }

        const transformedResults = customers.map((customer) => ({
          id: customer.id.toString(),
          name: customer.name,
          phone: customer.phone || "",
          type: customer.type || "Regular",
          walletBalance: Math.max(0, parseFloat(customer.wallet_balance || 0)),
          totalDues: Math.max(0, parseFloat(customer.outstanding_balance || 0)),
          email: customer.email || "",
        }));

        console.log(`Found ${transformedResults.length} matching customers`);
        res.json(transformedResults);
      }
    );
  },

  // Get customer statistics
  getCustomerStats: (req, res) => {
    console.log("Fetching customer statistics");

    const query = `
      SELECT 
        COUNT(*) as total_customers,
        SUM(total_purchases) as total_purchases,
        SUM(outstanding_balance) as total_outstanding,
        SUM(wallet_balance) as total_wallet_balance,
        AVG(total_purchases) as avg_purchases_per_customer,
        COUNT(CASE WHEN outstanding_balance > 0 THEN 1 END) as customers_with_dues,
        COUNT(CASE WHEN wallet_balance > 0 THEN 1 END) as customers_with_wallet
      FROM customers
    `;

    db.get(query, [], (err, stats) => {
      if (err) {
        console.error("Error fetching customer stats:", err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log("Customer statistics:", stats);
      res.json(stats);
    });
  },

  // Get customers with dues only
  getCustomersWithDues: (req, res) => {
    console.log("Fetching customers with outstanding dues");

    const query = `
      SELECT 
        id, 
        name, 
        phone, 
        outstanding_balance,
        wallet_balance,
        last_active
      FROM customers
      WHERE outstanding_balance > 0
      ORDER BY outstanding_balance DESC
    `;

    db.all(query, [], (err, customers) => {
      if (err) {
        console.error("Error fetching customers with dues:", err.message);
        return res.status(500).json({ error: err.message });
      }

      const transformedCustomers = customers.map((customer) => ({
        id: customer.id.toString(),
        name: customer.name,
        phone: customer.phone || "",
        totalDues: parseFloat(customer.outstanding_balance || 0),
        walletBalance: Math.max(0, parseFloat(customer.wallet_balance || 0)),
        lastActive: customer.last_active || "Unknown",
      }));

      console.log(`Found ${transformedCustomers.length} customers with dues`);
      res.json(transformedCustomers);
    });
  },

  // Get customers with wallet balance only
  getCustomersWithWallet: (req, res) => {
    console.log("Fetching customers with wallet balance");

    const query = `
      SELECT 
        id, 
        name, 
        phone, 
        wallet_balance,
        outstanding_balance
      FROM customers
      WHERE wallet_balance > 0
      ORDER BY wallet_balance DESC
    `;

    db.all(query, [], (err, customers) => {
      if (err) {
        console.error("Error fetching customers with wallet:", err.message);
        return res.status(500).json({ error: err.message });
      }

      const transformedCustomers = customers.map((customer) => ({
        id: customer.id.toString(),
        name: customer.name,
        phone: customer.phone || "",
        walletBalance: Math.max(0, parseFloat(customer.wallet_balance || 0)),
        totalDues: parseFloat(customer.outstanding_balance || 0),
      }));

      console.log(
        `Found ${transformedCustomers.length} customers with wallet balance`
      );
      res.json(transformedCustomers);
    });
  },

  // Fix negative wallet balances
  fixWalletBalances: (req, res) => {
    console.log("Fixing negative wallet balances...");

    const query = `
      UPDATE customers 
      SET wallet_balance = 0 
      WHERE wallet_balance < 0
    `;

    db.run(query, [], function (err) {
      if (err) {
        console.error("Error fixing wallet balances:", err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log(`Fixed ${this.changes} negative wallet balances`);
      res.json({
        success: true,
        fixedCount: this.changes,
        message: `Fixed ${this.changes} negative wallet balances`,
      });
    });
  },

  // NEW: Add to customer wallet (credit or debit) and record transaction
  addToWallet: (req, res) => {
    const { id } = req.params;
    const { amount, type = "credit", description = "", notes = "" } = req.body;

    console.log(`Processing wallet update for customer ${id}:`, {
      amount,
      type,
      description,
      notes,
    });

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({
        error: "Type must be either 'credit' or 'debit'",
      });
    }

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      db.get("SELECT * FROM customers WHERE id = ?", [id], (err, customer) => {
        if (err) {
          db.run("ROLLBACK");
          console.error("Error fetching customer:", err.message);
          return res.status(500).json({ error: err.message });
        }

        if (!customer) {
          db.run("ROLLBACK");
          return res.status(404).json({ error: "Customer not found" });
        }

        let newWalletBalance = parseFloat(customer.wallet_balance || 0);
        const amountFloat = parseFloat(amount);

        if (type === "credit") {
          newWalletBalance += amountFloat;
        } else {
          // Debit: Ensure wallet balance doesn't go negative
          if (newWalletBalance < amountFloat) {
            db.run("ROLLBACK");
            return res.status(400).json({
              error: "Insufficient wallet balance for debit",
              currentWallet: newWalletBalance,
              requestedDebit: amountFloat,
            });
          }
          newWalletBalance -= amountFloat;
        }

        console.log(
          `Old wallet: ${customer.wallet_balance}, New wallet: ${newWalletBalance}`
        );

        // Update customer wallet
        db.run(
          `
          UPDATE customers 
          SET wallet_balance = ?, 
              last_active = datetime('now')
          WHERE id = ?
          `,
          [newWalletBalance, id],
          (err) => {
            if (err) {
              db.run("ROLLBACK");
              console.error("Error updating wallet:", err.message);
              return res.status(500).json({ error: err.message });
            }

            // Record transaction
            db.run(
              `
              INSERT INTO transactions 
              (customer_id, amount, type, description, notes, created_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
              `,
              [id, amountFloat, type, description || `Wallet ${type}`, notes],
              (err) => {
                if (err) {
                  db.run("ROLLBACK");
                  console.error(
                    "Error creating transaction record:",
                    err.message
                  );
                  return res.status(500).json({ error: err.message });
                }

                db.run("COMMIT", (err) => {
                  if (err) {
                    console.error("Error committing transaction:", err.message);
                    return res.status(500).json({ error: err.message });
                  }

                  // Get updated customer
                  db.get(
                    "SELECT * FROM customers WHERE id = ?",
                    [id],
                    (err, updatedCustomer) => {
                      if (err) {
                        console.error(
                          "Error fetching updated customer:",
                          err.message
                        );
                        return res.status(500).json({ error: err.message });
                      }

                      const transformedCustomer = {
                        id: updatedCustomer.id.toString(),
                        name: updatedCustomer.name,
                        phone: updatedCustomer.phone || "",
                        type: updatedCustomer.type || "Regular",
                        walletBalance: Math.max(
                          0,
                          parseFloat(updatedCustomer.wallet_balance || 0)
                        ),
                        totalDues: Math.max(
                          0,
                          parseFloat(updatedCustomer.outstanding_balance || 0)
                        ),
                        lastActive: updatedCustomer.last_active
                          ? updatedCustomer.last_active.split(" ")[0]
                          : updatedCustomer.created_at
                          ? updatedCustomer.created_at.split(" ")[0]
                          : new Date().toISOString().split("T")[0],
                      };

                      console.log(
                        `Wallet ${type} successfully for ${updatedCustomer.name}: ₹${transformedCustomer.walletBalance}`
                      );

                      res.json({
                        success: true,
                        customer: transformedCustomer,
                        message: `Wallet ${
                          type === "credit" ? "credited" : "debited"
                        } successfully`,
                      });
                    }
                  );
                });
              }
            );
          }
        );
      });
    });
  },

  // NEW: Collect payment from customer (reduces dues, or adds to wallet if no dues)
  collectPaymentFromCustomer: (req, res) => {
    const { id } = req.params;
    const {
      amount,
      paymentMode = "Cash",
      description = "Payment collected",
      notes = "",
    } = req.body;

    console.log(`Collecting payment for customer ${id}:`, {
      amount,
      paymentMode,
      description,
    });

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ error: "Valid payment amount is required" });
    }

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      db.get("SELECT * FROM customers WHERE id = ?", [id], (err, customer) => {
        if (err) {
          db.run("ROLLBACK");
          console.error("Error fetching customer:", err.message);
          return res.status(500).json({ error: err.message });
        }

        if (!customer) {
          db.run("ROLLBACK");
          return res.status(404).json({ error: "Customer not found" });
        }

        let currentOutstanding = parseFloat(customer.outstanding_balance || 0);
        let currentWallet = parseFloat(customer.wallet_balance || 0);
        const paymentAmount = parseFloat(amount);

        let amountToDues = Math.min(paymentAmount, currentOutstanding);
        let remainingPayment = paymentAmount - amountToDues;

        currentOutstanding -= amountToDues;
        currentWallet += remainingPayment; // Any excess payment goes to wallet

        // Update customer balances
        db.run(
          `
          UPDATE customers 
          SET outstanding_balance = ?, 
              wallet_balance = ?, 
              last_active = datetime('now')
          WHERE id = ?
          `,
          [currentOutstanding, currentWallet, id],
          (err) => {
            if (err) {
              db.run("ROLLBACK");
              console.error(
                "Error updating customer balances for payment:",
                err.message
              );
              return res.status(500).json({ error: err.message });
            }

            // Record transaction for the payment
            const transactionDescription = description;
            const transactionType = "payment"; // Specific type for collected payments

            db.run(
              `
              INSERT INTO transactions 
              (customer_id, amount, type, description, notes, created_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
              `,
              [
                id,
                paymentAmount,
                transactionType,
                transactionDescription,
                notes,
              ],
              (err) => {
                if (err) {
                  db.run("ROLLBACK");
                  console.error(
                    "Error creating payment transaction record:",
                    err.message
                  );
                  return res.status(500).json({ error: err.message });
                }

                db.run("COMMIT", (err) => {
                  if (err) {
                    console.error("Error committing transaction:", err.message);
                    return res.status(500).json({ error: err.message });
                  }

                  // Get updated customer
                  db.get(
                    "SELECT * FROM customers WHERE id = ?",
                    [id],
                    (err, updatedCustomer) => {
                      if (err) {
                        console.error(
                          "Error fetching updated customer:",
                          err.message
                        );
                        return res.status(500).json({ error: err.message });
                      }

                      const transformedCustomer = {
                        id: updatedCustomer.id.toString(),
                        name: updatedCustomer.name,
                        phone: updatedCustomer.phone || "",
                        type: updatedCustomer.type || "Regular",
                        walletBalance: Math.max(
                          0,
                          parseFloat(updatedCustomer.wallet_balance || 0)
                        ),
                        totalDues: Math.max(
                          0,
                          parseFloat(updatedCustomer.outstanding_balance || 0)
                        ),
                        lastActive: updatedCustomer.last_active
                          ? updatedCustomer.last_active.split(" ")[0]
                          : updatedCustomer.created_at
                          ? updatedCustomer.created_at.split(" ")[0]
                          : new Date().toISOString().split("T")[0],
                      };

                      console.log(
                        `Payment collected for ${updatedCustomer.name}. Dues remaining: ₹${transformedCustomer.totalDues}, Wallet: ₹${transformedCustomer.walletBalance}`
                      );

                      res.json({
                        success: true,
                        customer: transformedCustomer,
                        paymentReceived: paymentAmount,
                        appliedToDues: amountToDues,
                        addedToWallet: remainingPayment,
                        message: `Payment of ₹${paymentAmount} collected successfully.`,
                      });
                    }
                  );
                });
              }
            );
          }
        );
      });
    });
  },

  // NEW: Get customer wallet transactions
  getWalletTransactions: (req, res) => {
    const { id } = req.params;
    console.log(`Fetching wallet transactions for customer ${id}`);

    const query = `
      SELECT 
        id,
        customer_id,
        amount,
        type,
        description,
        notes,
        created_at
      FROM transactions
      WHERE customer_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `;

    db.all(query, [id], (err, transactions) => {
      if (err) {
        console.error("Error fetching transactions:", err.message);
        return res.status(500).json({ error: err.message });
      }

      console.log(`Found ${transactions.length} transactions`);
      res.json(transactions);
    });
  },

  // NEW: Apply wallet to dues
  applyWalletToDues: (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;

    console.log(`Applying wallet to dues for customer ${id}:`, { amount });

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      db.get("SELECT * FROM customers WHERE id = ?", [id], (err, customer) => {
        if (err) {
          db.run("ROLLBACK");
          console.error("Error fetching customer:", err.message);
          return res.status(500).json({ error: err.message });
        }

        if (!customer) {
          db.run("ROLLBACK");
          return res.status(404).json({ error: "Customer not found" });
        }

        const currentWallet = parseFloat(customer.wallet_balance || 0);
        const currentDues = parseFloat(customer.outstanding_balance || 0);
        const amountFloat = parseFloat(amount);

        if (currentWallet < amountFloat) {
          db.run("ROLLBACK");
          return res.status(400).json({
            error: "Insufficient wallet balance",
            currentWallet,
            requestedAmount: amountFloat,
          });
        }

        if (currentDues === 0) {
          db.run("ROLLBACK");
          return res.status(400).json({
            error: "Customer has no outstanding dues to apply wallet to",
            currentDues,
          });
        }

        const amountToApply = Math.min(amountFloat, currentDues);

        // Update wallet and dues
        db.run(
          `
          UPDATE customers 
          SET wallet_balance = wallet_balance - ?,
              outstanding_balance = outstanding_balance - ?,
              last_active = datetime('now')
          WHERE id = ?
          `,
          [amountToApply, amountToApply, id],
          (err) => {
            if (err) {
              db.run("ROLLBACK");
              console.error("Error updating balances:", err.message);
              return res.status(500).json({ error: err.message });
            }

            // Create transaction record
            const transactionQuery = `
              INSERT INTO transactions 
              (customer_id, amount, type, description, notes, created_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
            `;

            db.run(
              transactionQuery,
              [
                id,
                amountToApply,
                "dues_applied", // Specific type for wallet applied to dues
                "Applied to outstanding dues",
                `Applied wallet balance to reduce dues from ₹${currentDues.toFixed(
                  2
                )} to ₹${(currentDues - amountToApply).toFixed(2)}`,
              ],
              (err) => {
                if (err) {
                  db.run("ROLLBACK");
                  console.error("Error creating transaction:", err.message);
                  return res.status(500).json({ error: err.message });
                }

                db.run("COMMIT", (err) => {
                  if (err) {
                    console.error("Error committing transaction:", err.message);
                    return res.status(500).json({ error: err.message });
                  }

                  // Get updated customer
                  db.get(
                    "SELECT * FROM customers WHERE id = ?",
                    [id],
                    (err, updatedCustomer) => {
                      if (err) {
                        console.error(
                          "Error fetching updated customer:",
                          err.message
                        );
                        return res.status(500).json({ error: err.message });
                      }

                      const transformedCustomer = {
                        id: updatedCustomer.id.toString(),
                        name: updatedCustomer.name,
                        phone: updatedCustomer.phone || "",
                        type: updatedCustomer.type || "Regular",
                        walletBalance: Math.max(
                          0,
                          parseFloat(updatedCustomer.wallet_balance || 0)
                        ),
                        totalDues: Math.max(
                          0,
                          parseFloat(updatedCustomer.outstanding_balance || 0)
                        ),
                      };

                      console.log(
                        `Applied ₹${amountToApply} from wallet to dues for ${updatedCustomer.name}`
                      );

                      res.json({
                        success: true,
                        customer: transformedCustomer,
                        appliedAmount: amountToApply,
                        remainingDues: parseFloat(
                          updatedCustomer.outstanding_balance || 0
                        ),
                        remainingWallet: parseFloat(
                          updatedCustomer.wallet_balance || 0
                        ),
                        message: `Applied ₹${amountToApply} from wallet to outstanding dues`,
                      });
                    }
                  );
                });
              }
            );
          }
        );
      });
    });
  },
};

module.exports = customersController;
