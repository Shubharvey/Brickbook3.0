const db = require("../config/database");

const reportsController = {
  // Get comprehensive dashboard report
  getDashboardReport: (req, res) => {
    const report = {};

    // 1. Sales Report
    const salesQuery = `
      SELECT 
        COUNT(*) as total_sales,
        SUM(total_amount) as total_revenue,
        SUM(paid_amount) as total_collected,
        SUM(balance_due) as total_outstanding,
        AVG(total_amount) as avg_sale_amount
      FROM sales
      WHERE status != 'cancelled' AND DATE(sale_date) >= DATE('now', '-30 days')
    `;

    db.get(salesQuery, [], (err, salesData) => {
      if (err) {
        console.error("Error fetching sales report:", err.message);
        return res.status(500).json({ error: "Failed to fetch sales report" });
      }

      report.sales = salesData;

      // 2. Expenses Report
      const expensesQuery = `
        SELECT 
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount,
          AVG(amount) as avg_expense_amount
        FROM expenses
        WHERE DATE(expense_date) >= DATE('now', '-30 days')
      `;

      db.get(expensesQuery, [], (err, expensesData) => {
        if (err) {
          console.error("Error fetching expenses report:", err.message);
          return res
            .status(500)
            .json({ error: "Failed to fetch expenses report" });
        }

        report.expenses = expensesData;

        // 3. Customers Report
        const customersQuery = `
          SELECT 
            COUNT(*) as total_customers,
            SUM(total_purchases) as total_customer_purchases,
            SUM(outstanding_balance) as total_customer_outstanding,
            SUM(wallet_balance) as total_customer_wallet
          FROM customers
        `;

        db.get(customersQuery, [], (err, customersData) => {
          if (err) {
            console.error("Error fetching customers report:", err.message);
            return res
              .status(500)
              .json({ error: "Failed to fetch customers report" });
          }

          report.customers = customersData;

          // 4. Inventory Report
          const inventoryQuery = `
            SELECT 
              COUNT(*) as total_products,
              SUM(quantity) as total_stock,
              SUM(quantity * price) as total_stock_value,
              SUM(CASE WHEN quantity <= min_stock_level THEN 1 ELSE 0 END) as low_stock_items
            FROM inventory
          `;

          db.get(inventoryQuery, [], (err, inventoryData) => {
            if (err) {
              console.error("Error fetching inventory report:", err.message);
              return res
                .status(500)
                .json({ error: "Failed to fetch inventory report" });
            }

            report.inventory = inventoryData;

            // 5. Accounts Report (from your existing accounts system)
            const accountsQuery = `
              SELECT 
                COUNT(*) as total_accounts,
                SUM(wallet_balance) as total_wallet_balance,
                SUM(due_balance) as total_due_balance
              FROM accounts
            `;

            db.get(accountsQuery, [], (err, accountsData) => {
              if (err) {
                console.error("Error fetching accounts report:", err.message);
                return res
                  .status(500)
                  .json({ error: "Failed to fetch accounts report" });
              }

              report.accounts = accountsData;

              // Calculate net profit/loss
              const revenue = report.sales.total_revenue || 0;
              const expenses = report.expenses.total_amount || 0;
              const netProfit = revenue - expenses;

              report.summary = {
                net_profit: netProfit,
                profit_margin:
                  revenue > 0
                    ? ((netProfit / revenue) * 100).toFixed(2) + "%"
                    : "0%",
                cash_flow:
                  (report.sales.total_collected || 0) -
                  (report.expenses.total_amount || 0),
                report_date: new Date().toISOString(),
                period: "Last 30 days",
              };

              res.json(report);
            });
          });
        });
      });
    });
  },

  // Get sales report with filters
  getSalesReport: (req, res) => {
    const { startDate, endDate, customerId, groupBy = "day" } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Start date and end date are required" });
    }

    let groupByClause;
    switch (groupBy) {
      case "day":
        groupByClause = "DATE(s.sale_date)";
        break;
      case "week":
        groupByClause = "strftime('%Y-%W', s.sale_date)";
        break;
      case "month":
        groupByClause = "strftime('%Y-%m', s.sale_date)";
        break;
      case "year":
        groupByClause = "strftime('%Y', s.sale_date)";
        break;
      default:
        groupByClause = "DATE(s.sale_date)";
    }

    let query = `
      SELECT 
        ${groupByClause} as period,
        COUNT(*) as sale_count,
        SUM(s.total_amount) as total_revenue,
        SUM(s.paid_amount) as total_collected,
        SUM(s.balance_due) as total_outstanding,
        COUNT(DISTINCT s.customer_id) as unique_customers,
        AVG(s.total_amount) as avg_sale_amount
      FROM sales s
      WHERE s.status != 'cancelled' 
        AND DATE(s.sale_date) BETWEEN DATE(?) AND DATE(?)
    `;

    const params = [startDate, endDate];

    if (customerId) {
      query += " AND s.customer_id = ?";
      params.push(customerId);
    }

    query += ` GROUP BY ${groupByClause} ORDER BY period DESC`;

    db.all(query, params, (err, salesData) => {
      if (err) {
        console.error("Error generating sales report:", err.message);
        return res
          .status(500)
          .json({ error: "Failed to generate sales report" });
      }

      // Get top products for the period
      const topProductsQuery = `
        SELECT 
          i.product_name,
          i.product_code,
          SUM(si.quantity) as total_quantity_sold,
          SUM(si.total_price) as total_revenue,
          COUNT(DISTINCT s.id) as sale_count
        FROM sale_items si
        JOIN inventory i ON si.product_id = i.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.status != 'cancelled' 
          AND DATE(s.sale_date) BETWEEN DATE(?) AND DATE(?)
        GROUP BY si.product_id
        ORDER BY total_quantity_sold DESC
        LIMIT 10
      `;

      db.all(topProductsQuery, [startDate, endDate], (err, topProducts) => {
        if (err) {
          console.error("Error fetching top products:", err.message);
          return res
            .status(500)
            .json({ error: "Failed to fetch top products" });
        }

        // Get top customers for the period
        const topCustomersQuery = `
          SELECT 
            c.id,
            c.name,
            c.phone,
            COUNT(s.id) as purchase_count,
            SUM(s.total_amount) as total_spent,
            SUM(s.balance_due) as outstanding_balance
          FROM sales s
          JOIN customers c ON s.customer_id = c.id
          WHERE s.status != 'cancelled' 
            AND DATE(s.sale_date) BETWEEN DATE(?) AND DATE(?)
          GROUP BY c.id
          ORDER BY total_spent DESC
          LIMIT 10
        `;

        db.all(topCustomersQuery, [startDate, endDate], (err, topCustomers) => {
          if (err) {
            console.error("Error fetching top customers:", err.message);
            return res
              .status(500)
              .json({ error: "Failed to fetch top customers" });
          }

          res.json({
            period: { startDate, endDate },
            grouping: groupBy,
            summary: {
              total_sales: salesData.reduce(
                (sum, item) => sum + item.sale_count,
                0
              ),
              total_revenue: salesData.reduce(
                (sum, item) => sum + item.total_revenue,
                0
              ),
              total_collected: salesData.reduce(
                (sum, item) => sum + item.total_collected,
                0
              ),
              total_outstanding: salesData.reduce(
                (sum, item) => sum + item.total_outstanding,
                0
              ),
              unique_customers: salesData.reduce(
                (sum, item) => sum + item.unique_customers,
                0
              ),
            },
            sales_by_period: salesData,
            top_products: topProducts,
            top_customers: topCustomers,
          });
        });
      });
    });
  },

  // Get profit and loss statement
  getProfitLossStatement: (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Start date and end date are required" });
    }

    // Revenue from sales
    const revenueQuery = `
      SELECT 
        'Sales Revenue' as category,
        SUM(total_amount) as amount
      FROM sales
      WHERE status != 'cancelled' 
        AND DATE(sale_date) BETWEEN DATE(?) AND DATE(?)
      
      UNION ALL
      
      -- Other revenue sources (you can add more as needed)
      SELECT 
        'Other Income' as category,
        0 as amount
      LIMIT 1
    `;

    db.all(revenueQuery, [startDate, endDate], (err, revenueItems) => {
      if (err) {
        console.error("Error calculating revenue:", err.message);
        return res.status(500).json({ error: "Failed to calculate revenue" });
      }

      // Expenses by category
      const expensesQuery = `
        SELECT 
          category,
          COUNT(*) as transaction_count,
          SUM(amount) as amount
        FROM expenses
        WHERE DATE(expense_date) BETWEEN DATE(?) AND DATE(?)
        GROUP BY category
        ORDER BY amount DESC
      `;

      db.all(expensesQuery, [startDate, endDate], (err, expenseItems) => {
        if (err) {
          console.error("Error calculating expenses:", err.message);
          return res
            .status(500)
            .json({ error: "Failed to calculate expenses" });
        }

        // Calculate totals
        const totalRevenue = revenueItems.reduce(
          (sum, item) => sum + (item.amount || 0),
          0
        );
        const totalExpenses = expenseItems.reduce(
          (sum, item) => sum + (item.amount || 0),
          0
        );
        const netProfit = totalRevenue - totalExpenses;

        res.json({
          period: { startDate, endDate },
          statement_date: new Date().toISOString(),
          revenue: {
            items: revenueItems.filter((item) => item.amount > 0),
            total: totalRevenue,
          },
          expenses: {
            items: expenseItems,
            total: totalExpenses,
          },
          profit_loss: {
            gross_profit: totalRevenue,
            total_expenses: totalExpenses,
            net_profit: netProfit,
            profit_margin:
              totalRevenue > 0
                ? ((netProfit / totalRevenue) * 100).toFixed(2) + "%"
                : "0%",
          },
        });
      });
    });
  },

  // Get inventory valuation report
  getInventoryValuation: (req, res) => {
    const query = `
      SELECT 
        category,
        COUNT(*) as product_count,
        SUM(quantity) as total_quantity,
        MIN(quantity) as min_quantity,
        MAX(quantity) as max_quantity,
        AVG(price) as avg_price,
        SUM(quantity * price) as total_value,
        SUM(CASE WHEN quantity <= min_stock_level THEN quantity * price ELSE 0 END) as low_stock_value,
        SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count
      FROM inventory
      GROUP BY category
      ORDER BY total_value DESC
    `;

    db.all(query, [], (err, categoryValuation) => {
      if (err) {
        console.error("Error generating inventory valuation:", err.message);
        return res
          .status(500)
          .json({ error: "Failed to generate inventory valuation" });
      }

      // Get total inventory value
      const totalQuery = `
        SELECT 
          SUM(quantity * price) as total_inventory_value,
          SUM(quantity) as total_items,
          COUNT(*) as total_products,
          SUM(CASE WHEN quantity <= min_stock_level THEN quantity * price ELSE 0 END) as total_low_stock_value
        FROM inventory
      `;

      db.get(totalQuery, [], (err, totals) => {
        if (err) {
          console.error("Error calculating inventory totals:", err.message);
          return res
            .status(500)
            .json({ error: "Failed to calculate inventory totals" });
        }

        // Get slow moving items (not sold in last 30 days)
        const slowMovingQuery = `
          SELECT 
            i.id,
            i.product_name,
            i.product_code,
            i.quantity,
            i.price,
            i.category,
            MAX(s.sale_date) as last_sale_date,
            DATEDIFF('now', MAX(s.sale_date)) as days_since_last_sale
          FROM inventory i
          LEFT JOIN sale_items si ON i.id = si.product_id
          LEFT JOIN sales s ON si.sale_id = s.id
          GROUP BY i.id
          HAVING days_since_last_sale > 30 OR last_sale_date IS NULL
          ORDER BY days_since_last_sale DESC
          LIMIT 20
        `;

        db.all(slowMovingQuery, [], (err, slowMovingItems) => {
          if (err) {
            console.error("Error fetching slow moving items:", err.message);
            return res
              .status(500)
              .json({ error: "Failed to fetch slow moving items" });
          }

          res.json({
            report_date: new Date().toISOString(),
            summary: {
              total_inventory_value: totals.total_inventory_value || 0,
              total_items: totals.total_items || 0,
              total_products: totals.total_products || 0,
              total_low_stock_value: totals.total_low_stock_value || 0,
              avg_item_value:
                totals.total_inventory_value / totals.total_items || 0,
            },
            by_category: categoryValuation,
            slow_moving_items: slowMovingItems.map((item) => ({
              ...item,
              item_value: item.quantity * item.price,
              status: item.days_since_last_sale > 90 ? "Stagnant" : "Slow",
            })),
          });
        });
      });
    });
  },

  // Get customer outstanding report
  getCustomerOutstandingReport: (req, res) => {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.total_purchases,
        c.outstanding_balance,
        c.wallet_balance,
        COUNT(s.id) as total_invoices,
        MAX(s.sale_date) as last_purchase_date,
        SUM(s.balance_due) as total_invoice_due
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id AND s.balance_due > 0
      WHERE c.outstanding_balance > 0 OR s.balance_due > 0
      GROUP BY c.id
      ORDER BY c.outstanding_balance DESC
    `;

    db.all(query, [], (err, customers) => {
      if (err) {
        console.error("Error generating outstanding report:", err.message);
        return res
          .status(500)
          .json({ error: "Failed to generate outstanding report" });
      }

      // Calculate totals
      const totals = customers.reduce(
        (acc, customer) => {
          acc.total_outstanding += customer.outstanding_balance || 0;
          acc.total_invoice_due += customer.total_invoice_due || 0;
          acc.total_customers += 1;
          return acc;
        },
        { total_outstanding: 0, total_invoice_due: 0, total_customers: 0 }
      );

      // Age the outstanding balances
      const agedReport = customers.map((customer) => {
        // This is simplified - you might want to query actual invoice dates
        const aging = {
          current: customer.outstanding_balance * 0.7, // Example calculation
          "1-30": customer.outstanding_balance * 0.2,
          "31-60": customer.outstanding_balance * 0.05,
          "61-90": customer.outstanding_balance * 0.03,
          "90+": customer.outstanding_balance * 0.02,
        };

        return {
          ...customer,
          aging,
        };
      });

      res.json({
        report_date: new Date().toISOString(),
        summary: {
          ...totals,
          avg_outstanding_per_customer:
            totals.total_outstanding / totals.total_customers || 0,
        },
        customers: agedReport,
      });
    });
  },

  // Get cash flow report
  getCashFlowReport: (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Start date and end date are required" });
    }

    // Cash inflows (sales collections)
    const inflowsQuery = `
      SELECT 
        DATE(sale_date) as date,
        'Sales' as source,
        SUM(paid_amount) as amount
      FROM sales
      WHERE status != 'cancelled' 
        AND DATE(sale_date) BETWEEN DATE(?) AND DATE(?)
      GROUP BY DATE(sale_date)
      
      UNION ALL
      
      -- Add other inflow sources here (e.g., customer payments, other income)
      SELECT 
        DATE(payment_date) as date,
        'Customer Payments' as source,
        SUM(amount) as amount
      FROM payments
      WHERE DATE(payment_date) BETWEEN DATE(?) AND DATE(?)
      GROUP BY DATE(payment_date)
      
      ORDER BY date DESC
    `;

    db.all(
      inflowsQuery,
      [startDate, endDate, startDate, endDate],
      (err, inflows) => {
        if (err) {
          console.error("Error calculating cash inflows:", err.message);
          return res
            .status(500)
            .json({ error: "Failed to calculate cash inflows" });
        }

        // Cash outflows (expenses)
        const outflowsQuery = `
        SELECT 
          DATE(expense_date) as date,
          category as source,
          SUM(amount) as amount
        FROM expenses
        WHERE DATE(expense_date) BETWEEN DATE(?) AND DATE(?)
        GROUP BY DATE(expense_date), category
        ORDER BY date DESC
      `;

        db.all(outflowsQuery, [startDate, endDate], (err, outflows) => {
          if (err) {
            console.error("Error calculating cash outflows:", err.message);
            return res
              .status(500)
              .json({ error: "Failed to calculate cash outflows" });
          }

          // Group by date
          const dailyCashFlow = {};

          // Process inflows
          inflows.forEach((flow) => {
            const date = flow.date;
            if (!dailyCashFlow[date]) {
              dailyCashFlow[date] = {
                date,
                inflows: 0,
                outflows: 0,
                net_flow: 0,
                details: [],
              };
            }
            dailyCashFlow[date].inflows += flow.amount;
            dailyCashFlow[date].net_flow += flow.amount;
            dailyCashFlow[date].details.push({
              type: "inflow",
              source: flow.source,
              amount: flow.amount,
            });
          });

          // Process outflows
          outflows.forEach((flow) => {
            const date = flow.date;
            if (!dailyCashFlow[date]) {
              dailyCashFlow[date] = {
                date,
                inflows: 0,
                outflows: 0,
                net_flow: 0,
                details: [],
              };
            }
            dailyCashFlow[date].outflows += flow.amount;
            dailyCashFlow[date].net_flow -= flow.amount;
            dailyCashFlow[date].details.push({
              type: "outflow",
              source: flow.source,
              amount: flow.amount,
            });
          });

          // Convert to array and sort
          const cashFlowArray = Object.values(dailyCashFlow).sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );

          // Calculate totals
          const totals = cashFlowArray.reduce(
            (acc, day) => {
              acc.total_inflows += day.inflows;
              acc.total_outflows += day.outflows;
              acc.net_cash_flow += day.net_flow;
              return acc;
            },
            { total_inflows: 0, total_outflows: 0, net_cash_flow: 0 }
          );

          res.json({
            period: { startDate, endDate },
            summary: totals,
            daily_cash_flow: cashFlowArray,
          });
        });
      }
    );
  },

  // Export report data (simplified version)
  exportReport: (req, res) => {
    const { reportType, format = "json", ...filters } = req.query;

    // This is a simplified export function
    // In a real application, you would generate CSV, Excel, or PDF

    const supportedReports = [
      "sales",
      "expenses",
      "inventory",
      "customers",
      "profit-loss",
      "cash-flow",
    ];

    if (!reportType || !supportedReports.includes(reportType)) {
      return res.status(400).json({
        error: "Valid report type is required",
        supportedReports,
      });
    }

    // For now, return JSON with export metadata
    // You would implement actual export logic here

    res.json({
      export: {
        report_type: reportType,
        format: format,
        filters: filters,
        generated_at: new Date().toISOString(),
        download_url: `/api/reports/export/${reportType}-${Date.now()}.${format}`,
        note: "Export functionality to be implemented",
      },
    });
  },
};

module.exports = reportsController;
