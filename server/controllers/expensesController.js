const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.resolve(__dirname, "../brickbook.db");
const db = new sqlite3.Database(dbPath);

const expensesController = {
  // Get all expenses
  getAllExpenses: (req, res) => {
    const { startDate, endDate, category, paymentMethod } = req.query;

    let query = `
      SELECT 
        id,
        category,
        description,
        amount,
        expense_date,
        paid_to,
        payment_method,
        created_at
      FROM expenses
    `;

    const conditions = [];
    const params = [];

    if (startDate && endDate) {
      conditions.push("DATE(expense_date) BETWEEN DATE(?) AND DATE(?)");
      params.push(startDate, endDate);
    }

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }

    if (paymentMethod) {
      conditions.push("payment_method = ?");
      params.push(paymentMethod);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY expense_date DESC";

    db.all(query, params, (err, expenses) => {
      if (err) {
        console.error("Error fetching expenses:", err.message);
        return res.status(500).json({ error: "Failed to fetch expenses" });
      }
      res.json(expenses);
    });
  },

  // Get single expense by ID
  getExpenseById: (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM expenses WHERE id = ?", [id], (err, expense) => {
      if (err) {
        console.error("Error fetching expense:", err.message);
        return res.status(500).json({ error: "Failed to fetch expense" });
      }

      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }

      res.json(expense);
    });
  },

  // Create new expense
  createExpense: (req, res) => {
    const {
      category,
      description,
      amount,
      expense_date,
      paid_to,
      payment_method = "cash",
    } = req.body;

    // Validation
    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    const query = `
      INSERT INTO expenses (
        category, description, amount, expense_date, paid_to, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const expenseDate = expense_date || new Date().toISOString();

    db.run(
      query,
      [
        category,
        description || null,
        amount,
        expenseDate,
        paid_to || null,
        payment_method,
      ],
      function (err) {
        if (err) {
          console.error("Error creating expense:", err.message);
          return res.status(500).json({ error: "Failed to create expense" });
        }

        res.status(201).json({
          id: this.lastID,
          category,
          description,
          amount,
          expense_date: expenseDate,
          paid_to,
          payment_method,
          message: "Expense recorded successfully",
        });
      }
    );
  },

  // Update expense
  updateExpense: (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ error: "Expense ID is required" });
    }

    const allowedFields = [
      "category",
      "description",
      "amount",
      "expense_date",
      "paid_to",
      "payment_method",
    ];

    const updateFields = [];
    const values = [];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        // Validate amount
        if (field === "amount" && updates[field] <= 0) {
          return res.status(400).json({ error: "Amount must be positive" });
        }

        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(id);

    const query = `UPDATE expenses SET ${updateFields.join(", ")} WHERE id = ?`;

    db.run(query, values, function (err) {
      if (err) {
        console.error("Error updating expense:", err.message);
        return res.status(500).json({ error: "Failed to update expense" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Expense not found" });
      }

      res.json({
        success: true,
        id,
        updatedFields: updateFields,
        message: "Expense updated successfully",
      });
    });
  },

  // Delete expense
  deleteExpense: (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM expenses WHERE id = ?", [id], function (err) {
      if (err) {
        console.error("Error deleting expense:", err.message);
        return res.status(500).json({ error: "Failed to delete expense" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Expense not found" });
      }

      res.json({
        success: true,
        deletedId: id,
        message: "Expense deleted successfully",
      });
    });
  },

  // Get expenses statistics
  getExpensesStats: (req, res) => {
    const { period = "month" } = req.query; // day, week, month, year, custom

    let dateCondition = "";
    switch (period) {
      case "day":
        dateCondition = "DATE(expense_date) = DATE('now')";
        break;
      case "week":
        dateCondition =
          "strftime('%Y-%W', expense_date) = strftime('%Y-%W', 'now')";
        break;
      case "month":
        dateCondition =
          "strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')";
        break;
      case "year":
        dateCondition = "strftime('%Y', expense_date) = strftime('%Y', 'now')";
        break;
      default:
        dateCondition =
          "strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')";
    }

    // Get total expenses for period
    const totalQuery = `
      SELECT 
        COUNT(*) as total_expenses,
        SUM(amount) as total_amount,
        AVG(amount) as avg_expense_amount,
        MIN(expense_date) as first_expense_date,
        MAX(expense_date) as last_expense_date
      FROM expenses
      WHERE ${dateCondition}
    `;

    db.get(totalQuery, [], (err, totalStats) => {
      if (err) {
        console.error("Error fetching expenses stats:", err.message);
        return res
          .status(500)
          .json({ error: "Failed to fetch expenses statistics" });
      }

      // Get expenses by category
      const categoryQuery = `
        SELECT 
          category,
          COUNT(*) as expense_count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount
        FROM expenses
        WHERE ${dateCondition}
        GROUP BY category
        ORDER BY total_amount DESC
      `;

      db.all(categoryQuery, [], (err, categoryStats) => {
        if (err) {
          console.error("Error fetching category stats:", err.message);
          return res
            .status(500)
            .json({ error: "Failed to fetch category statistics" });
        }

        // Get monthly trend (last 6 months)
        const trendQuery = `
          SELECT 
            strftime('%Y-%m', expense_date) as month,
            COUNT(*) as expense_count,
            SUM(amount) as total_amount
          FROM expenses
          WHERE expense_date >= date('now', '-6 months')
          GROUP BY strftime('%Y-%m', expense_date)
          ORDER BY month DESC
        `;

        db.all(trendQuery, [], (err, monthlyTrend) => {
          if (err) {
            console.error("Error fetching monthly trend:", err.message);
            return res
              .status(500)
              .json({ error: "Failed to fetch monthly trend" });
          }

          res.json({
            period,
            statistics: {
              ...totalStats,
              total_expenses: totalStats.total_expenses || 0,
              total_amount: totalStats.total_amount || 0,
              avg_expense_amount: totalStats.avg_expense_amount || 0,
            },
            by_category: categoryStats || [],
            monthly_trend: monthlyTrend || [],
          });
        });
      });
    });
  },

  // Get expense categories
  getExpenseCategories: (req, res) => {
    const query = `
      SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenses
      GROUP BY category
      ORDER BY category ASC
    `;

    db.all(query, [], (err, categories) => {
      if (err) {
        console.error("Error fetching expense categories:", err.message);
        return res
          .status(500)
          .json({ error: "Failed to fetch expense categories" });
      }
      res.json(categories);
    });
  },

  // Bulk add expenses (for imports)
  bulkCreateExpenses: (req, res) => {
    const expenses = req.body;

    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      return res.status(400).json({ error: "Expenses array is required" });
    }

    const stmt = db.prepare(`
      INSERT INTO expenses (category, description, amount, expense_date, paid_to, payment_method)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let successCount = 0;
    const errors = [];

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      expenses.forEach((expense, index) => {
        // Validate required fields
        if (!expense.category || !expense.amount || expense.amount <= 0) {
          errors.push({
            index,
            expense: expense.description || "Unknown",
            error: "Missing category or invalid amount",
          });
          return;
        }

        try {
          stmt.run(
            expense.category,
            expense.description || null,
            expense.amount,
            expense.expense_date || new Date().toISOString(),
            expense.paid_to || null,
            expense.payment_method || "cash"
          );
          successCount++;
        } catch (err) {
          errors.push({
            index,
            expense: expense.description || "Unknown",
            error: err.message,
          });
        }
      });

      db.run("COMMIT", (err) => {
        if (err) {
          console.error("Error committing bulk insert:", err.message);
          return res.status(500).json({
            error: "Failed to save expenses",
            details: err.message,
          });
        }

        stmt.finalize();

        res.json({
          success: true,
          inserted: successCount,
          errors: errors.length > 0 ? errors : undefined,
          message: `Successfully recorded ${successCount} expense(s)`,
        });
      });
    });
  },

  // Search expenses
  searchExpenses: (req, res) => {
    const { q, startDate, endDate } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({ error: "Search query is required" });
    }

    let query = `
      SELECT 
        id,
        category,
        description,
        amount,
        expense_date,
        paid_to,
        payment_method
      FROM expenses
      WHERE (category LIKE ? OR description LIKE ? OR paid_to LIKE ?)
    `;

    const params = [`%${q}%`, `%${q}%`, `%${q}%`];

    if (startDate && endDate) {
      query += " AND DATE(expense_date) BETWEEN DATE(?) AND DATE(?)";
      params.push(startDate, endDate);
    }

    query += " ORDER BY expense_date DESC LIMIT 50";

    db.all(query, params, (err, results) => {
      if (err) {
        console.error("Error searching expenses:", err.message);
        return res.status(500).json({ error: "Failed to search expenses" });
      }
      res.json(results);
    });
  },

  // Get expenses summary by date range
  getExpensesSummary: (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Start date and end date are required" });
    }

    const query = `
      SELECT 
        DATE(expense_date) as date,
        COUNT(*) as expense_count,
        SUM(amount) as daily_total,
        GROUP_CONCAT(category || ': ' || amount) as breakdown
      FROM expenses
      WHERE DATE(expense_date) BETWEEN DATE(?) AND DATE(?)
      GROUP BY DATE(expense_date)
      ORDER BY date DESC
    `;

    db.all(query, [startDate, endDate], (err, dailySummaries) => {
      if (err) {
        console.error("Error fetching expenses summary:", err.message);
        return res
          .status(500)
          .json({ error: "Failed to fetch expenses summary" });
      }

      // Parse breakdown string
      const parsedSummaries = dailySummaries.map((summary) => ({
        ...summary,
        breakdown: summary.breakdown
          ? summary.breakdown.split(",").map((item) => {
              const [category, amount] = item.split(": ");
              return { category, amount: parseFloat(amount) };
            })
          : [],
      }));

      // Calculate totals
      const totalExpenses = parsedSummaries.reduce(
        (sum, day) => sum + day.daily_total,
        0
      );
      const totalCount = parsedSummaries.reduce(
        (sum, day) => sum + day.expense_count,
        0
      );

      res.json({
        period: { startDate, endDate },
        summary: {
          total_expenses: totalExpenses,
          total_count: totalCount,
          avg_daily_expense: totalExpenses / parsedSummaries.length || 0,
        },
        daily_breakdown: parsedSummaries,
      });
    });
  },
};

module.exports = expensesController;
