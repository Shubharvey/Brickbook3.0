const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.resolve(__dirname, "../brickbook.db");
const db = new sqlite3.Database(dbPath);

const createTables = () => {
  // Create sales table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_id TEXT,
      customer_id TEXT,
      customer_name TEXT,
      sale_date DATE NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      due_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      payment_status TEXT CHECK(payment_status IN ('Paid', 'Partial', 'Pending')) DEFAULT 'Pending',
      delivery_status TEXT CHECK(delivery_status IN ('Pending', 'Scheduled', 'Delivered')) DEFAULT 'Pending',
      payment_mode TEXT,
      payment_type TEXT,
      discount_type TEXT,
      discount_value DECIMAL(10,2) DEFAULT 0,
      advance_paid DECIMAL(10,2) DEFAULT 0,
      due_date DATE,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating sales table:", err.message);
      } else {
        console.log("Sales table created/verified");
      }
    }
  );

  // Create sale_items table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating sale_items table:", err.message);
      } else {
        console.log("Sale_items table created/verified");
      }
    }
  );

  // Create customers table if it doesn't exist (for reference)
  db.run(
    `
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      type TEXT DEFAULT 'Regular',
      wallet_balance DECIMAL(10,2) DEFAULT 0,
      total_dues DECIMAL(10,2) DEFAULT 0,
      last_active DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating customers table:", err.message);
      } else {
        console.log("Customers table created/verified");
      }
    }
  );

  // Create indexes for better performance
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id)",
    (err) => {
      if (err) console.error("Error creating index:", err.message);
    }
  );

  db.run(
    "CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)",
    (err) => {
      if (err) console.error("Error creating index:", err.message);
    }
  );

  db.run(
    "CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)",
    (err) => {
      if (err) console.error("Error creating index:", err.message);
    }
  );

  console.log("Database tables checked/created successfully");
  db.close();
};

createTables();
