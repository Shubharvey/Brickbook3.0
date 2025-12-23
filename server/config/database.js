const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "brickbook.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Accounts table
  db.run(`CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_number TEXT UNIQUE,
    customer_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    balance DECIMAL(15,2) DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Customers table
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT,
    address TEXT,
    total_purchases DECIMAL(15,2) DEFAULT 0,
    outstanding_balance DECIMAL(15,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Products/Inventory table
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    product_code TEXT UNIQUE,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    price DECIMAL(15,2) DEFAULT 0,
    min_stock_level INTEGER DEFAULT 10,
    supplier TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Sales table
  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE,
    account_id INTEGER,
    customer_id INTEGER,
    total_amount DECIMAL(15,2) DEFAULT 0,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    balance_due DECIMAL(15,2) DEFAULT 0,
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (account_id) REFERENCES accounts (id),
    FOREIGN KEY (customer_id) REFERENCES customers (id)
  )`);

  // Sale items table
  db.run(`CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price DECIMAL(15,2),
    total_price DECIMAL(15,2),
    FOREIGN KEY (sale_id) REFERENCES sales (id),
    FOREIGN KEY (product_id) REFERENCES inventory (id)
  )`);

  // Expenses table
  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) DEFAULT 0,
    expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_to TEXT,
    payment_method TEXT DEFAULT 'cash'
  )`);

  // Deliveries table
  db.run(`CREATE TABLE IF NOT EXISTS deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    delivery_address TEXT,
    status TEXT DEFAULT 'pending',
    delivery_date DATETIME,
    delivered_at DATETIME,
    driver_name TEXT,
    vehicle_number TEXT,
    FOREIGN KEY (sale_id) REFERENCES sales (id)
  )`);

  // Payments table
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    amount DECIMAL(15,2) DEFAULT 0,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_method TEXT DEFAULT 'cash',
    reference_number TEXT,
    notes TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts (id)
  )`);

  console.log("Database tables initialized successfully");
}

module.exports = db;
