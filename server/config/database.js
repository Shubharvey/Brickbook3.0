const { Pool } = require("pg");
require("dotenv").config(); // Load environment variables

// Determine if we're in production (Vercel) or development
const isProduction = process.env.NODE_ENV === "production";

// Database connection configuration
let connectionConfig;

if (isProduction) {
  // Production: Use DATABASE_URL from Vercel environment variables
  connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for Supabase
    },
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 5000, // How long to wait for a connection
  };
} else {
  // Development: Use local environment variables or fallback
  connectionConfig = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "brickbook",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "your_local_password",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
  };
}

// Create a connection pool
const pool = new Pool(connectionConfig);

// Test the connection
pool.on("connect", () => {
  console.log("✅ PostgreSQL pool connected");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err);
  process.exit(-1);
});

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();

  try {
    console.log("Initializing PostgreSQL database tables...");

    // Start transaction
    await client.query("BEGIN");

    // Accounts table (changed AUTOINCREMENT to SERIAL)
    await client.query(`CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      account_number TEXT UNIQUE,
      customer_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      balance DECIMAL(15,2) DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Customers table
    await client.query(`CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      email TEXT,
      address TEXT,
      total_purchases DECIMAL(15,2) DEFAULT 0,
      outstanding_balance DECIMAL(15,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Products/Inventory table
    await client.query(`CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      product_name TEXT NOT NULL,
      product_code TEXT UNIQUE,
      category TEXT,
      quantity INTEGER DEFAULT 0,
      price DECIMAL(15,2) DEFAULT 0,
      min_stock_level INTEGER DEFAULT 10,
      supplier TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Sales table
    await client.query(`CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      invoice_number TEXT UNIQUE,
      account_id INTEGER,
      customer_id INTEGER,
      total_amount DECIMAL(15,2) DEFAULT 0,
      paid_amount DECIMAL(15,2) DEFAULT 0,
      balance_due DECIMAL(15,2) DEFAULT 0,
      sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE SET NULL,
      FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL
    )`);

    // Sale items table
    await client.query(`CREATE TABLE IF NOT EXISTS sale_items (
      id SERIAL PRIMARY KEY,
      sale_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      unit_price DECIMAL(15,2),
      total_price DECIMAL(15,2),
      FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES inventory (id) ON DELETE SET NULL
    )`);

    // Expenses table
    await client.query(`CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      description TEXT,
      amount DECIMAL(15,2) DEFAULT 0,
      expense_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paid_to TEXT,
      payment_method TEXT DEFAULT 'cash'
    )`);

    // Deliveries table
    await client.query(`CREATE TABLE IF NOT EXISTS deliveries (
      id SERIAL PRIMARY KEY,
      sale_id INTEGER,
      delivery_address TEXT,
      status TEXT DEFAULT 'pending',
      delivery_date TIMESTAMP,
      delivered_at TIMESTAMP,
      driver_name TEXT,
      vehicle_number TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE
    )`);

    // Payments table
    await client.query(`CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      account_id INTEGER,
      amount DECIMAL(15,2) DEFAULT 0,
      payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      payment_method TEXT DEFAULT 'cash',
      reference_number TEXT,
      notes TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE SET NULL
    )`);

    // Create indexes for better performance
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON accounts(account_number)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)"
    );

    // Commit transaction
    await client.query("COMMIT");

    console.log("✅ PostgreSQL tables initialized successfully");

    // Insert sample data if tables are empty (optional)
    await insertSampleData(client);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error initializing database:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Optional: Insert sample data for testing
async function insertSampleData(client) {
  try {
    // Check if accounts table is empty
    const accountsResult = await client.query("SELECT COUNT(*) FROM accounts");
    if (parseInt(accountsResult.rows[0].count) === 0) {
      console.log("Inserting sample data...");

      // Insert sample accounts
      await client.query(`
        INSERT INTO accounts (account_number, customer_name, phone, balance) 
        VALUES 
          ('ACC001', 'John Smith', '+1234567890', 5000.00),
          ('ACC002', 'Jane Doe', '+0987654321', 2500.00)
        ON CONFLICT (account_number) DO NOTHING
      `);

      // Insert sample customers
      await client.query(`
        INSERT INTO customers (name, phone, email) 
        VALUES 
          ('John Smith', '+1234567890', 'john@example.com'),
          ('Jane Doe', '+0987654321', 'jane@example.com')
        ON CONFLICT (phone) DO NOTHING
      `);

      // Insert sample inventory
      await client.query(`
        INSERT INTO inventory (product_name, product_code, category, quantity, price) 
        VALUES 
          ('Bricks Red', 'BRK-RED-001', 'Bricks', 1000, 2.50),
          ('Bricks Grey', 'BRK-GRY-001', 'Bricks', 800, 2.75),
          ('Cement 50kg', 'CMT-50KG', 'Cement', 50, 12.99)
        ON CONFLICT (product_code) DO NOTHING
      `);

      console.log("✅ Sample data inserted");
    }
  } catch (error) {
    console.log(
      "Note: Sample data not inserted (tables may already have data)"
    );
  }
}

// Initialize database when this module is loaded
initializeDatabase().catch(console.error);

// Export the pool for use in other modules
module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
  initializeDatabase,
};
