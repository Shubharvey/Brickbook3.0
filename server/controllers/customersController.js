const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.resolve(__dirname, "../brickbook.db");
const db = new sqlite3.Database(dbPath);

const customersController = {
  // Get all customers - TRANSFORMED for frontend
  getAllCustomers: (req, res) => {
    console.log("=== FETCHING CUSTOMERS FROM DATABASE ===");

    // Get all data from database including type field
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

      // Transform database data to match frontend Customer interface
      const transformedCustomers = customers.map((customer) => {
        // Ensure wallet balance is never negative
        const walletBalance = Math.max(
          0,
          parseFloat(customer.wallet_balance || 0)
        );
        const totalDues = Math.max(
          0,
          parseFloat(customer.outstanding_balance || 0)
        );

        const transformed = {
          // Required by frontend Customer interface
          id: customer.id.toString(),
          name: customer.name || "Unknown",
          phone: customer.phone || "",
          // Use type from database or default to "Regular"
          type: customer.type || "Regular",

          // FIX: Ensure wallet balance is never negative
          walletBalance: walletBalance,
          wallet_balance: walletBalance, // Also send snake_case
          totalDues: totalDues,
          outstanding_balance: totalDues, // Also send snake_case

          // Use last_active if available, otherwise created_at
          lastActive: customer.last_active
            ? customer.last_active.split(" ")[0]
            : customer.created_at
            ? customer.created_at.split(" ")[0]
            : new Date().toISOString().split("T")[0],
          last_active: customer.last_active || customer.created_at,

          // Additional fields for debugging
          email: customer.email || "",
          address: customer.address || "",
          total_purchases: parseFloat(customer.total_purchases || 0),
        };

        // Log warning if wallet was negative in database
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

      // Debug: Show customers with dues
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

    // Get customer details
    db.get("SELECT * FROM customers WHERE id = ?", [id], (err, customer) => {
      if (err) {
        console.error("Error fetching customer:", err.message);
        return res.status(500).json({ error: err.message });
      }

      if (!customer) {
        console.log(`Customer with ID ${id} not found`);
        return res.status(404).json({ error: "Customer not found" });
      }

      // Ensure wallet balance is never negative
      const walletBalance = Math.max(
        0,
        parseFloat(customer.wallet_balance || 0)
      );
      const totalDues = Math.max(
        0,
        parseFloat(customer.outstanding_balance || 0)
      );

      // Transform customer data for frontend
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
        // Send both formats for compatibility
        outstanding_balance: totalDues,
        wallet_balance: walletBalance,
      };

      console.log(`Customer found: ${transformedCustomer.name}`);
      console.log(
        `Dues: ₹${transformedCustomer.totalDues}, Wallet: ₹${transformedCustomer.walletBalance}`
      );

      // Get customer's sales with detailed items
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

        // Group items by sale
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

        // Calculate total dues from sales (for verification)
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

    // Validation
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

        // Get the created customer to return complete data
        db.get(
          "SELECT * FROM customers WHERE id = ?",
          [this.lastID],
          (err, newCustomer) => {
            if (err) {
              console.error("Error fetching new customer:", err.message);
              return res.status(500).json({ error: err.message });
            }

            // Return transformed customer for frontend
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
              // Send both formats
              wallet_balance: Math.max(
                0,
                parseFloat(newCustomer.wallet_balance || 0)
              ),
              outstanding_balance: Math.max(
                0,
                parseFloat(newCustomer.outstanding_balance || 0)
              ),
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

    // Check if customer exists first
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

        // FIX: Ensure wallet balance never goes negative
        if (updates.walletBalance !== undefined) {
          updates.walletBalance = Math.max(
            0,
            parseFloat(updates.walletBalance)
          );
          console.log(
            `Wallet balance adjusted to non-negative: ${updates.walletBalance}`
          );
        }

        if (updates.wallet_balance !== undefined) {
          updates.wallet_balance = Math.max(
            0,
            parseFloat(updates.wallet_balance)
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

            // Handle special field mappings
            if (field === "walletBalance") {
              values.push(updates[field]); // Frontend sends walletBalance
            } else if (field === "totalDues") {
              values.push(updates[field]); // Frontend sends totalDues
            } else {
              values.push(updates[field]);
            }
          }
        });

        if (updateFields.length === 0) {
          return res.status(400).json({ error: "No valid fields to update" });
        }

        // Always update last_active
        updateFields.push("last_active = datetime('now')");

        values.push(id);

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

          // Get updated customer data
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

  // ... rest of existing methods remain the same (deleteCustomer, searchCustomers, etc.)
  deleteCustomer: (req, res) => {
    const { id } = req.params;
    console.log(`Attempting to delete customer ${id}`);

    // Check if customer exists
    db.get("SELECT * FROM customers WHERE id = ?", [id], (err, customer) => {
      if (err) {
        console.error("Error checking customer:", err.message);
        return res.status(500).json({ error: err.message });
      }

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      // Check if customer has any outstanding balance
      if (parseFloat(customer.outstanding_balance || 0) > 0) {
        return res.status(400).json({
          error: "Cannot delete customer with outstanding balance",
          outstandingBalance: customer.outstanding_balance,
        });
      }

      // Check if customer has any sales
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

          // Actually delete the customer
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

  // Search customers by name or phone - ENHANCED
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

        // Transform for frontend with wallet validation
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

  // Get customer statistics - COMPREHENSIVE
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

  // New: Get customers with dues only
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

  // New: Get customers with wallet balance only
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

  // NEW: Fix negative wallet balances
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
};

module.exports = customersController;
