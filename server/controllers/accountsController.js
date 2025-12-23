const db = require("../config/database");

const accountsController = {
  // Get all accounts with transactions
  getAllAccounts: (req, res) => {
    db.all("SELECT * FROM accounts", [], (err, accounts) => {
      if (err) {
        console.error("Error fetching accounts:", err.message);
        return res.status(500).json({ error: "Failed to fetch accounts" });
      }

      const accountPromises = accounts.map((acc) => {
        return new Promise((resolve, reject) => {
          db.all(
            "SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC",
            [acc.id],
            (err, txs) => {
              if (err) {
                reject(err);
                return;
              }

              resolve({
                id: acc.id,
                name: acc.name,
                walletBalance: acc.wallet_balance,
                dueBalance: acc.due_balance,
                joiningDate: acc.joining_date,
                categoryId: acc.category_id,
                locationId: acc.location_id,
                transactions: txs || [],
              });
            }
          );
        });
      });

      Promise.all(accountPromises)
        .then((fullAccounts) => {
          res.json(fullAccounts);
        })
        .catch((err) => {
          console.error("Error processing accounts:", err.message);
          res.status(500).json({ error: "Failed to process account data" });
        });
    });
  },

  // Create new account
  createAccount: (req, res) => {
    const {
      id,
      name,
      walletBalance = 0,
      dueBalance = 0,
      joiningDate,
      categoryId,
      locationId,
    } = req.body;

    // Validation
    if (!id || !name) {
      return res.status(400).json({ error: "ID and name are required" });
    }

    db.run(
      `INSERT INTO accounts (id, name, wallet_balance, due_balance, joining_date, category_id, location_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        walletBalance,
        dueBalance,
        joiningDate,
        categoryId,
        locationId,
      ],
      function (err) {
        if (err) {
          console.error("Error creating account:", err.message);

          if (err.message.includes("UNIQUE constraint failed")) {
            return res.status(409).json({ error: "Account ID already exists" });
          }

          return res.status(500).json({ error: "Failed to create account" });
        }

        res.status(201).json({
          id,
          name,
          walletBalance,
          dueBalance,
          joiningDate,
          categoryId,
          locationId,
          message: "Account created successfully",
        });
      }
    );
  },

  // Bulk add accounts
  bulkCreateAccounts: (req, res) => {
    const accounts = req.body;

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ error: "Accounts array is required" });
    }

    const stmt = db.prepare(
      `INSERT INTO accounts (id, name, wallet_balance, due_balance, joining_date, category_id, location_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    let successCount = 0;
    const errors = [];

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      accounts.forEach((acc, index) => {
        try {
          stmt.run(
            acc.id || `TEMP_${Date.now()}_${index}`,
            acc.name,
            acc.walletBalance || 0,
            acc.dueBalance || 0,
            acc.joiningDate || new Date().toISOString(),
            acc.categoryId,
            acc.locationId
          );
          successCount++;
        } catch (err) {
          errors.push({
            index,
            account: acc.name || "Unknown",
            error: err.message,
          });
        }
      });

      db.run("COMMIT", (err) => {
        if (err) {
          console.error("Error committing bulk insert:", err.message);
          return res.status(500).json({
            error: "Failed to save accounts",
            details: err.message,
          });
        }

        stmt.finalize();

        res.json({
          success: true,
          inserted: successCount,
          errors: errors.length > 0 ? errors : undefined,
          message: `Successfully created ${successCount} account(s)`,
        });
      });
    });
  },

  // Delete account
  deleteAccount: (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Account ID is required" });
    }

    db.serialize(() => {
      // First, check if account exists
      db.get("SELECT * FROM accounts WHERE id = ?", [id], (err, account) => {
        if (err) {
          console.error("Error checking account:", err.message);
          return res.status(500).json({ error: "Database error" });
        }

        if (!account) {
          return res.status(404).json({ error: "Account not found" });
        }

        // Delete transactions first (foreign key constraint)
        db.run("DELETE FROM transactions WHERE account_id = ?", [id], (err) => {
          if (err) {
            console.error("Error deleting transactions:", err.message);
            return res
              .status(500)
              .json({ error: "Failed to delete account transactions" });
          }

          // Delete the account
          db.run("DELETE FROM accounts WHERE id = ?", [id], function (err) {
            if (err) {
              console.error("Error deleting account:", err.message);
              return res
                .status(500)
                .json({ error: "Failed to delete account" });
            }

            res.json({
              success: true,
              deletedId: id,
              message:
                "Account and associated transactions deleted successfully",
            });
          });
        });
      });
    });
  },

  // Bulk delete accounts
  bulkDeleteAccounts: (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Account IDs array is required" });
    }

    const placeholders = ids.map(() => "?").join(",");

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Delete transactions first
      db.run(
        `DELETE FROM transactions WHERE account_id IN (${placeholders})`,
        ids,
        (err) => {
          if (err) {
            db.run("ROLLBACK");
            console.error("Error deleting transactions:", err.message);
            return res
              .status(500)
              .json({ error: "Failed to delete transactions" });
          }

          // Delete accounts
          db.run(
            `DELETE FROM accounts WHERE id IN (${placeholders})`,
            ids,
            (err) => {
              if (err) {
                db.run("ROLLBACK");
                console.error("Error deleting accounts:", err.message);
                return res
                  .status(500)
                  .json({ error: "Failed to delete accounts" });
              }

              db.run("COMMIT", (err) => {
                if (err) {
                  console.error("Error committing delete:", err.message);
                  return res.status(500).json({ error: "Transaction failed" });
                }

                res.json({
                  success: true,
                  count: ids.length,
                  message: `Successfully deleted ${ids.length} account(s)`,
                });
              });
            }
          );
        }
      );
    });
  },

  // Get single account by ID
  getAccountById: (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM accounts WHERE id = ?", [id], (err, account) => {
      if (err) {
        console.error("Error fetching account:", err.message);
        return res.status(500).json({ error: "Failed to fetch account" });
      }

      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      // Get transactions for this account
      db.all(
        "SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC",
        [id],
        (err, transactions) => {
          if (err) {
            console.error("Error fetching transactions:", err.message);
            return res
              .status(500)
              .json({ error: "Failed to fetch account transactions" });
          }

          res.json({
            id: account.id,
            name: account.name,
            walletBalance: account.wallet_balance,
            dueBalance: account.due_balance,
            joiningDate: account.joining_date,
            categoryId: account.category_id,
            locationId: account.location_id,
            transactions: transactions || [],
          });
        }
      );
    });
  },

  // Update account
  updateAccount: (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ error: "Account ID is required" });
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];

    const allowedFields = [
      "name",
      "walletBalance",
      "dueBalance",
      "categoryId",
      "locationId",
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        if (field === "walletBalance" || field === "dueBalance") {
          updateFields.push(
            `${
              field === "walletBalance" ? "wallet_balance" : "due_balance"
            } = ?`
          );
          values.push(updates[field]);
        } else if (field === "categoryId") {
          updateFields.push("category_id = ?");
          values.push(updates[field]);
        } else if (field === "locationId") {
          updateFields.push("location_id = ?");
          values.push(updates[field]);
        } else {
          updateFields.push(`${field} = ?`);
          values.push(updates[field]);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(id); // Add ID for WHERE clause

    const query = `UPDATE accounts SET ${updateFields.join(", ")} WHERE id = ?`;

    db.run(query, values, function (err) {
      if (err) {
        console.error("Error updating account:", err.message);
        return res.status(500).json({ error: "Failed to update account" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Account not found" });
      }

      res.json({
        success: true,
        id,
        updatedFields: updateFields,
        message: "Account updated successfully",
      });
    });
  },
};

module.exports = accountsController;
