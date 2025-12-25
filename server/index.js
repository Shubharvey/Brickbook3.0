const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 3001;

// --- MIDDLEWARE ---
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Simple Native Logger (Replaces morgan to avoid dependency errors)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- DATABASE SETUP ---
const dbPath = path.resolve(__dirname, "brickbook.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("CRITICAL DATABASE ERROR:", err.message);
  } else {
    console.log(`DATABASE: Connected to SQLite at ${dbPath}`);
    initializeDatabase();
  }
});

// Export the db instance for other modules
module.exports.db = db;

function initializeDatabase() {
  db.serialize(() => {
    // 1. Customers Table (Already exists, ensures wallet_balance and outstanding_balance are there)
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      wallet_balance DECIMAL(15,2) DEFAULT 0,
      outstanding_balance DECIMAL(15,2) DEFAULT 0,
      total_purchases DECIMAL(15,2) DEFAULT 0,
      type TEXT DEFAULT 'Regular',
      last_active DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Sales Table - UPDATED WITH original_id COLUMN
    db.run(`CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_id TEXT,
      customer_id INTEGER,
      customer_name TEXT,
      product_name TEXT,
      sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_amount DECIMAL(15,2) DEFAULT 0,
      paid_amount DECIMAL(15,2) DEFAULT 0,
      due_amount DECIMAL(15,2) DEFAULT 0,
      balance_due DECIMAL(15,2) DEFAULT 0,
      advance_paid DECIMAL(15,2) DEFAULT 0,
      payment_type TEXT,
      payment_mode TEXT,
      payment_status TEXT CHECK(payment_status IN ('Paid', 'Partial', 'Pending')) DEFAULT 'Pending',
      delivery_status TEXT CHECK(delivery_status IN ('Pending', 'Scheduled', 'Delivered')) DEFAULT 'Pending',
      category TEXT,
      due_date DATETIME,
      discount_type TEXT DEFAULT 'Fixed',
      discount_value DECIMAL(15,2) DEFAULT 0,
      status TEXT DEFAULT 'Completed',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id)
    )`);

    // 3. Sale Items Table - Uses item_name, NOT product_id
    db.run(`CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER,
      item_name TEXT,
      quantity INTEGER,
      unit_price DECIMAL(15,2),
      amount DECIMAL(15,2),
      total_price DECIMAL(15,2),
      FOREIGN KEY (sale_id) REFERENCES sales (id)
    )`);

    // NEW: 4. Transactions Table for customer wallet and payments
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('credit', 'debit', 'payment', 'dues_applied')),
      description TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id)
    )`);

    console.log("DATABASE: Schema initialized successfully.");
  });
}

// --- ROUTES ---

// IMPORT ROUTE FILES
const customersRouter = require("./routes/customers");
const salesRouter = require("./routes/sales");

// Use the correct db instance for routes
app.use("/api/customers", customersRouter); // Use the customers.js route file
app.use("/api/sales", salesRouter); // Use the sales.js route file

// Health Check
app.get("/api/health", (req, res) =>
  res.json({ status: "healthy", timestamp: new Date() })
);

// Get all sales directly (for testing ONLY - remove later)
app.get("/api/sales/all", (req, res) => {
  db.all("SELECT * FROM sales ORDER BY sale_date DESC", [], (err, rows) => {
    if (err) {
      console.error("Error fetching sales:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/customers`);
  console.log(`   POST /api/customers`);
  console.log(`   GET  /api/customers/:id/wallet (POST, GET)`);
  console.log(`   POST /api/customers/:id/collect-payment`);
  console.log(`   GET  /api/sales`);
  console.log(`   POST /api/sales`);
  console.log(`   GET  /api/sales/all (test only)`);
});
