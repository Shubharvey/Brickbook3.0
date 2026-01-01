const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use SERVICE_ROLE for admin access
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware - UNIVERSAL CORS CONFIGURATION
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // List of allowed origins
      const allowedOrigins = [
        "http://localhost:3000", // Your frontend localhost
        "http://localhost:5173", // Vite dev server
        "http://localhost:3001", // Backend itself
        "https://jjbhatta.vercel.app",
        "https://*.vercel.app", // All Vercel subdomains
        /\.vercel\.app$/, // Regex for all vercel domains
        /\.onrender\.com$/, // If you deploy elsewhere
        /\.netlify\.app$/, // If you deploy elsewhere
        "http://192.168.*.*", // Local network
        "http://10.*.*.*", // Local network
        "http://172.16.*.*", // Local network
        "http://172.17.*.*",
        "http://172.18.*.*",
        "http://172.19.*.*",
        "http://172.20.*.*",
        "http://172.21.*.*",
        "http://172.22.*.*",
        "http://172.23.*.*",
        "http://172.24.*.*",
        "http://172.25.*.*",
        "http://172.26.*.*",
        "http://172.27.*.*",
        "http://172.28.*.*",
        "http://172.29.*.*",
        "http://172.30.*.*",
        "http://172.31.*.*",
      ];

      // Check if the origin matches any allowed pattern
      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === "string") {
          return origin === allowed;
        } else if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });

      if (isAllowed || process.env.NODE_ENV === "development") {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        // Still allow it but log (for testing)
        callback(null, true);
        // For production: callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Origin",
      "X-Requested-With",
      "X-Access-Token",
      "X-CSRF-Token",
      "Access-Control-Allow-Headers",
      "Access-Control-Request-Headers",
      "Access-Control-Request-Method",
      "Cache-Control",
      "Pragma",
    ],
    exposedHeaders: [
      "Content-Length",
      "Content-Type",
      "Authorization",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Credentials",
      "X-Powered-By",
    ],
    optionsSuccessStatus: 204,
    preflightContinue: false,
    maxAge: 86400, // 24 hours
    // Handle cookies if needed
    // credentials: true // Already set above
  })
);

// Handle preflight requests explicitly
app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== AUTHENTICATION MIDDLEWARE ====================
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    // Verify the JWT token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("Token validation error:", error?.message);
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
};

// ==================== PUBLIC ROUTES (No Auth Required) ====================
app.get("/", (req, res) => {
  res.send("Business Management API - Multi-tenancy Enabled");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: "Supabase",
    cors: "enabled",
    multi_tenancy: "enabled",
  });
});

// Test endpoint for mobile devices
app.get("/api/test-mobile", (req, res) => {
  res.json({
    success: true,
    message: "Mobile access test successful",
    origin: req.headers.origin || "No origin header",
    userAgent: req.headers["user-agent"],
    timestamp: new Date().toISOString(),
  });
});

// ==================== AUTH ENDPOINTS ====================

// SIGNUP
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, phone, full_name } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      phone,
      options: {
        data: {
          full_name: full_name || "",
          phone: phone || "",
        },
      },
    });

    if (error) throw error;

    // Auto-create profile after signup
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: full_name || data.user.user_metadata?.full_name || "",
        phone: phone || data.user.phone || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    res.json({
      user: data.user,
      message: "Signup successful! Check your email for verification.",
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Ensure profile exists
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name || "",
      phone: data.user.phone || "",
      updated_at: new Date().toISOString(),
    });

    res.json({
      user: data.user,
      session: data.session,
      access_token: data.session.access_token,
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// LOGOUT
app.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PASSWORD RESET
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email } = req.body;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://jjbhatta.vercel.app/reset-password",
    });

    if (error) throw error;

    res.json({
      message: "Password reset email sent. Check your inbox.",
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// AUTO-CREATE PROFILE ENDPOINT
app.post("/api/auth/create-profile", authenticateToken, async (req, res) => {
  try {
    const { full_name, phone } = req.body;

    const { error } = await supabase.from("profiles").upsert({
      id: req.user.id,
      email: req.user.email,
      full_name: full_name || req.user.user_metadata?.full_name || "",
      phone: phone || req.user.phone || "",
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    res.json({ message: "Profile created/updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET USER PROFILE
app.get("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows returned

    res.json({
      user: req.user,
      profile: profile || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE USER PROFILE
app.put("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    const { full_name, phone } = req.body;

    const { error } = await supabase.from("profiles").upsert({
      id: req.user.id,
      email: req.user.email,
      full_name: full_name || "",
      phone: phone || "",
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PROTECTED TEST ENDPOINT
app.get("/api/protected-data", authenticateToken, async (req, res) => {
  res.json({
    message: `Hello ${req.user.email}`,
    userId: req.user.id,
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || "No origin header",
  });
});

// ==================== CUSTOMERS API (Protected with Multi-tenancy) ====================
app.get("/api/customers", authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", req.user.id) // ← CRITICAL: Filter by user_id
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("GET /api/customers error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/customers", authenticateToken, async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const customer = {
      name,
      phone: phone || "",
      address: address || "",
      wallet_balance: 0,
      outstanding_balance: 0,
      user_id: req.user.id, // ← CRITICAL: Add user_id
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("customers")
      .insert([customer])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error("POST /api/customers error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/customers/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("user_id", req.user.id) // ← CRITICAL: Ensure user owns this record
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res
          .status(404)
          .json({ error: "Customer not found or access denied" });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("GET /api/customers/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/customers/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow user_id to be changed
    delete updates.user_id;
    delete updates.id;

    const { data, error } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", id)
      .eq("user_id", req.user.id) // ← CRITICAL: Ensure user owns this record
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res
          .status(404)
          .json({ error: "Customer not found or access denied" });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("PUT /api/customers/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== CUSTOMER WALLET API (Protected with Multi-tenancy) ====================
app.post("/api/customers/:id/wallet", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, description, notes } = req.body;

    console.log("Wallet request:", { id, amount, type, description, notes });

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Get current balance with user_id check
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("wallet_balance")
      .eq("id", id)
      .eq("user_id", req.user.id) // ← CRITICAL: Ensure user owns this record
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res
          .status(404)
          .json({ error: "Customer not found or access denied" });
      }
      throw fetchError;
    }

    // Calculate new balance
    let newBalance;
    let operation = "credit"; // Default to adding to wallet

    if (type && type.toLowerCase() === "debit") {
      if (customer.wallet_balance < amount) {
        return res.status(400).json({
          error: "Insufficient wallet balance",
          currentBalance: customer.wallet_balance,
        });
      }
      newBalance = customer.wallet_balance - amount;
      operation = "debit";
    } else {
      newBalance = customer.wallet_balance + amount;
    }

    // Update wallet balance with user_id check
    const { error: updateError } = await supabase
      .from("customers")
      .update({ wallet_balance: newBalance })
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (updateError) throw updateError;

    res.json({
      success: true,
      newBalance,
      operation,
      message: `Wallet ${
        operation === "credit" ? "credited" : "debited"
      } with ₹${amount}`,
    });
  } catch (err) {
    console.error("Wallet error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== COLLECT PAYMENT API (Protected with Multi-tenancy) ====================
app.post(
  "/api/customers/:id/collect-payment",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, paymentMode, description, notes } = req.body;

      console.log("Collect payment request:", {
        id,
        amount,
        paymentMode,
        description,
        notes,
      });

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // Get current dues with user_id check
      const { data: customer, error: fetchError } = await supabase
        .from("customers")
        .select("outstanding_balance")
        .eq("id", id)
        .eq("user_id", req.user.id) // ← CRITICAL: Ensure user owns this record
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          return res
            .status(404)
            .json({ error: "Customer not found or access denied" });
        }
        throw fetchError;
      }

      if (customer.outstanding_balance < amount) {
        return res.status(400).json({
          error: "Payment amount exceeds outstanding balance",
          currentDues: customer.outstanding_balance,
        });
      }

      const newBalance = customer.outstanding_balance - amount;

      // Update outstanding balance with user_id check
      const { error: updateError } = await supabase
        .from("customers")
        .update({ outstanding_balance: newBalance })
        .eq("id", id)
        .eq("user_id", req.user.id);

      if (updateError) throw updateError;

      res.json({
        success: true,
        newBalance,
        paymentReceived: amount,
        message: `Payment of ₹${amount} collected. Remaining dues: ₹${newBalance}`,
      });
    } catch (err) {
      console.error("Collect payment error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ==================== DELETE CUSTOMER API (Protected with Multi-tenancy) ====================
app.delete("/api/customers/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`Starting deletion for customer ${id} by user ${req.user.id}`);

    // 1. Get ALL sales for this customer with user_id check
    const { data: customerSales, error: salesError } = await supabase
      .from("sales")
      .select("id, wallet_used, dueAmount, paymentType, customerId")
      .eq("customerId", id)
      .eq("user_id", req.user.id); // ← CRITICAL: Only user's sales

    if (salesError) {
      console.error("Error fetching sales:", salesError);
      throw salesError;
    }

    console.log(`Found ${customerSales?.length || 0} sales for customer`);

    let walletToRestore = 0;
    let duesToDeduct = 0;

    // 2. Process each sale individually to avoid batch issues
    if (customerSales && customerSales.length > 0) {
      for (const sale of customerSales) {
        console.log(`Processing sale ${sale.id}`);

        // 2a. Delete sale_items for this sale with user_id check
        const { error: itemsError } = await supabase
          .from("sale_items")
          .delete()
          .eq("sale_id", sale.id)
          .eq("user_id", req.user.id); // ← CRITICAL: Only user's items

        if (itemsError) {
          console.error(
            `Error deleting sale_items for sale ${sale.id}:`,
            itemsError
          );
          throw itemsError;
        }
        console.log(`Deleted sale_items for sale ${sale.id}`);

        // 2b. Calculate wallet and dues to restore
        if (
          sale.wallet_used > 0 &&
          (sale.paymentType === "Advance + Cash" ||
            sale.paymentType === "Full Advance")
        ) {
          walletToRestore += sale.wallet_used;
        }

        if (sale.dueAmount > 0) {
          duesToDeduct += sale.dueAmount;
        }

        // 2c. Delete the sale with user_id check
        const { error: deleteSaleError } = await supabase
          .from("sales")
          .delete()
          .eq("id", sale.id)
          .eq("user_id", req.user.id); // ← CRITICAL: Only user's sales

        if (deleteSaleError) {
          console.error(`Error deleting sale ${sale.id}:`, deleteSaleError);
          throw deleteSaleError;
        }
        console.log(`Deleted sale ${sale.id}`);
      }

      // 3. Update customer balances after deleting all sales
      if (walletToRestore > 0 || duesToDeduct > 0) {
        console.log(
          `Updating balances: Wallet +₹${walletToRestore}, Dues -₹${duesToDeduct}`
        );

        // Get current balances with user_id check
        const { data: customer, error: custError } = await supabase
          .from("customers")
          .select("wallet_balance, outstanding_balance")
          .eq("id", id)
          .eq("user_id", req.user.id) // ← CRITICAL: Only user's customer
          .single();

        if (!custError && customer) {
          const updates = {
            wallet_balance: customer.wallet_balance + walletToRestore,
            outstanding_balance: Math.max(
              0,
              customer.outstanding_balance - duesToDeduct
            ),
          };

          const { error: updateError } = await supabase
            .from("customers")
            .update(updates)
            .eq("id", id)
            .eq("user_id", req.user.id); // ← CRITICAL: Only user's customer

          if (updateError) {
            console.error("Balance update failed:", updateError);
            // Don't throw, just log - customer deletion should still proceed
          } else {
            console.log(`Updated customer balances successfully`);
          }
        }
      }
    }

    // 4. Delete any payments linked to this customer with user_id check
    try {
      const { error: paymentsError } = await supabase
        .from("payments")
        .delete()
        .eq("customer_id", id)
        .eq("user_id", req.user.id); // ← CRITICAL: Only user's payments

      if (paymentsError && !paymentsError.message.includes("No rows found")) {
        console.error("Payments deletion error:", paymentsError);
      } else {
        console.log("Deleted linked payments (if any)");
      }
    } catch (paymentsErr) {
      console.error("Payments deletion non-critical error:", paymentsErr);
    }

    // 5. Delete any account linked to this customer with user_id check
    try {
      const { error: accountError } = await supabase
        .from("accounts")
        .delete()
        .eq("customer_id", id)
        .eq("user_id", req.user.id); // ← CRITICAL: Only user's accounts

      if (accountError && !accountError.message.includes("No rows found")) {
        console.error("Account deletion error:", accountError);
      } else {
        console.log("Deleted linked account (if any)");
      }
    } catch (accountErr) {
      console.error("Account deletion non-critical error:", accountErr);
    }

    // 6. Finally delete the customer with user_id check
    const { error: deleteError } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id); // ← CRITICAL: Only user's customer

    if (deleteError) {
      console.error("Error deleting customer:", deleteError);
      throw deleteError;
    }

    console.log(`Customer ${id} deleted successfully`);

    res.json({
      success: true,
      message: `Customer deleted successfully along with ${
        customerSales?.length || 0
      } sales`,
      restored: {
        wallet: walletToRestore,
        dues: duesToDeduct,
      },
    });
  } catch (err) {
    console.error("Delete customer error:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Make sure all foreign key constraints are handled. Check console for more details.",
    });
  }
});

// ==================== SALES API (Protected with Multi-tenancy) ====================
app.get("/api/sales", authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sales")
      .select("*, sale_items(*), customers(name, phone)")
      .eq("user_id", req.user.id) // ← CRITICAL: Filter by user_id
      .order("saleDate", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("GET /api/sales error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Alternative: Use the sales_view with user_id filter
app.get("/api/sales/view", authenticateToken, async (req, res) => {
  try {
    // Since sales_view is a view, we need to filter by user_id from sales table
    // Let's query sales directly instead
    const { data: salesData, error } = await supabase
      .from("sales")
      .select(
        `
        *,
        customers!sales_customerId_fkey(name, phone)
      `
      )
      .eq("user_id", req.user.id)
      .order("saleDate", { ascending: false });

    if (error) throw error;

    // Transform to match sales_view structure
    const transformedData = salesData.map((sale) => ({
      id: sale.id,
      saledate: sale.saleDate,
      totalamount: sale.totalAmount,
      paidamount: sale.paidAmount,
      paymentstatus: sale.paymentStatus,
      customerid: sale.customerId,
      customername: sale.customers?.name || "",
      customerphone: sale.customers?.phone || "",
    }));

    res.json(transformedData || []);
  } catch (err) {
    console.error("GET /api/sales/view error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sales", authenticateToken, async (req, res) => {
  try {
    const saleData = req.body;
    console.log("Creating sale:", saleData);

    const {
      customerId,
      customerName,
      date,
      items,
      totalAmount,
      paidAmount,
      paymentStatus,
      deliveryStatus,
      paymentMode,
      paymentType,
      advancePaid = 0,
      dueAmount = 0,
      dueDate,
      discount,
    } = saleData;

    // CRITICAL: Get customer's current wallet balance FIRST with user_id check
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("wallet_balance")
      .eq("id", customerId)
      .eq("user_id", req.user.id) // ← CRITICAL: Only user's customer
      .single();

    if (customerError) {
      if (customerError.code === "PGRST116") {
        return res
          .status(404)
          .json({ error: "Customer not found or access denied" });
      }
      throw customerError;
    }

    // Calculate what wallet will be used based on payment type
    let walletUsed = 0;
    let cashPaid = 0;

    switch (paymentType) {
      case "Cash":
        walletUsed = 0;
        cashPaid = totalAmount;
        break;

      case "Credit":
        walletUsed = 0;
        cashPaid = 0;
        break;

      case "Dues + Cash":
        walletUsed = 0;
        cashPaid = advancePaid; // This is CASH paid now, not wallet
        break;

      case "Advance + Cash":
        // advancePaid here is the wallet amount to use
        walletUsed = Math.min(advancePaid, totalAmount);
        if (walletUsed > customer.wallet_balance) {
          return res.status(400).json({
            error: "Insufficient wallet balance",
            currentBalance: customer.wallet_balance,
            requested: walletUsed,
          });
        }
        cashPaid = totalAmount - walletUsed;
        break;

      case "Full Advance":
        // advancePaid here should equal totalAmount (full from wallet)
        walletUsed = totalAmount;
        if (walletUsed > customer.wallet_balance) {
          return res.status(400).json({
            error: "Insufficient wallet balance",
            currentBalance: customer.wallet_balance,
            requested: walletUsed,
          });
        }
        cashPaid = 0;
        break;
    }

    // 1. Create sale record with user_id
    const sale = {
      customerId,
      customerName,
      saleDate: date || new Date().toISOString(),
      totalAmount,
      paidAmount: cashPaid + walletUsed,
      dueAmount: dueAmount || 0,
      wallet_used: walletUsed, // Only for Advance + Cash and Full Advance
      paymentMode,
      paymentType,
      paymentStatus: paymentStatus || "pending",
      deliveryStatus: deliveryStatus || "pending",
      dueDate: dueDate || null,
      discountType: discount?.type || null,
      discountValue: discount?.value || 0,
      status: "completed",
      user_id: req.user.id, // ← CRITICAL: Add user_id
    };

    const { data: saleResult, error: saleError } = await supabase
      .from("sales")
      .insert([sale])
      .select()
      .single();

    if (saleError) throw saleError;

    // 2. Create sale items with user_id
    if (items && items.length > 0) {
      const saleItems = items.map((item) => ({
        sale_id: saleResult.id,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.amount || item.quantity * item.price,
        user_id: req.user.id, // ← CRITICAL: Add user_id to each item
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;
    }

    // 3. Update customer wallet ONLY if wallet was used with user_id check
    if (walletUsed > 0) {
      const newWalletBalance = customer.wallet_balance - walletUsed;

      const { error: walletError } = await supabase
        .from("customers")
        .update({
          wallet_balance: newWalletBalance,
        })
        .eq("id", customerId)
        .eq("user_id", req.user.id); // ← CRITICAL: Only user's customer

      if (walletError) {
        console.error("Wallet update failed:", walletError);
        // Rollback the sale creation if wallet update fails
        await supabase
          .from("sales")
          .delete()
          .eq("id", saleResult.id)
          .eq("user_id", req.user.id);
        throw walletError;
      }
    }

    // 4. Update customer outstanding balance if due amount > 0 with user_id check
    if (dueAmount > 0) {
      const { data: currentCustomer, error: fetchError } = await supabase
        .from("customers")
        .select("outstanding_balance")
        .eq("id", customerId)
        .eq("user_id", req.user.id) // ← CRITICAL: Only user's customer
        .single();

      if (!fetchError && currentCustomer) {
        const newOutstandingBalance =
          currentCustomer.outstanding_balance + dueAmount;

        const { error: duesError } = await supabase
          .from("customers")
          .update({
            outstanding_balance: newOutstandingBalance,
          })
          .eq("id", customerId)
          .eq("user_id", req.user.id); // ← CRITICAL: Only user's customer

        if (duesError) console.error("Dues update failed:", duesError);
      }
    }

    // 5. Return complete sale with items
    const { data: completeSale, error: fetchError } = await supabase
      .from("sales")
      .select("*, sale_items(*)")
      .eq("id", saleResult.id)
      .eq("user_id", req.user.id) // ← CRITICAL: Only user's sale
      .single();

    if (fetchError) {
      console.error("Fetch complete sale error:", fetchError);
      res.status(201).json(saleResult);
    } else {
      res.status(201).json(completeSale);
    }
  } catch (err) {
    console.error("Create sale error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== DELETE SALE API (Protected with Multi-tenancy) ====================
app.delete("/api/sales/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // First get the sale details with user_id check
    const { data: sale, error: fetchError } = await supabase
      .from("sales")
      .select("customerId, wallet_used, dueAmount, paymentType")
      .eq("id", id)
      .eq("user_id", req.user.id) // ← CRITICAL: Only user's sale
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res
          .status(404)
          .json({ error: "Sale not found or access denied" });
      }
      throw fetchError;
    }

    const { customerId, wallet_used = 0, dueAmount = 0, paymentType } = sale;

    // Delete sale items first with user_id check
    const { error: itemsError } = await supabase
      .from("sale_items")
      .delete()
      .eq("sale_id", id)
      .eq("user_id", req.user.id); // ← CRITICAL: Only user's items

    if (itemsError) throw itemsError;

    // Delete the sale with user_id check
    const { error: deleteError } = await supabase
      .from("sales")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id); // ← CRITICAL: Only user's sale

    if (deleteError) throw deleteError;

    // Reverse wallet balance if wallet was used with user_id check
    if (
      wallet_used > 0 &&
      (paymentType === "Advance + Cash" || paymentType === "Full Advance")
    ) {
      const { data: customer, error: custError } = await supabase
        .from("customers")
        .select("wallet_balance")
        .eq("id", customerId)
        .eq("user_id", req.user.id) // ← CRITICAL: Only user's customer
        .single();

      if (!custError && customer) {
        const newWalletBalance = customer.wallet_balance + wallet_used;

        const { error: walletError } = await supabase
          .from("customers")
          .update({ wallet_balance: newWalletBalance })
          .eq("id", customerId)
          .eq("user_id", req.user.id); // ← CRITICAL: Only user's customer

        if (walletError) console.error("Wallet reversal failed:", walletError);
      }
    }

    // Reverse outstanding balance if there was due amount with user_id check
    if (dueAmount > 0) {
      const { data: customer, error: custError } = await supabase
        .from("customers")
        .select("outstanding_balance")
        .eq("id", customerId)
        .eq("user_id", req.user.id) // ← CRITICAL: Only user's customer
        .single();

      if (!custError && customer) {
        const newOutstandingBalance = customer.outstanding_balance - dueAmount;

        const { error: duesError } = await supabase
          .from("customers")
          .update({ outstanding_balance: newOutstandingBalance })
          .eq("id", customerId)
          .eq("user_id", req.user.id); // ← CRITICAL: Only user's customer

        if (duesError) console.error("Dues reversal failed:", duesError);
      }
    }

    res.json({
      success: true,
      message: "Sale deleted and balances adjusted",
      reversed: {
        wallet: wallet_used,
        dues: dueAmount,
      },
    });
  } catch (err) {
    console.error("Delete sale error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== EXPENSES API (Protected with Multi-tenancy) ====================
app.get("/api/expenses", authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", req.user.id) // ← CRITICAL: Filter by user_id
      .order("date", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("GET /api/expenses error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/expenses", authenticateToken, async (req, res) => {
  try {
    const expenseData = req.body;

    const expense = {
      ...expenseData,
      user_id: req.user.id, // ← CRITICAL: Add user_id
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("expenses")
      .insert([expense])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error("POST /api/expenses error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== PAYMENTS API (Protected with Multi-tenancy) ====================
app.get("/api/payments", authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*, customers(name)")
      .eq("user_id", req.user.id) // ← CRITICAL: Filter by user_id
      .order("payment_date", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("GET /api/payments error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== INVENTORY API (Protected with Multi-tenancy) ====================
app.get("/api/inventory", authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("user_id", req.user.id) // ← CRITICAL: Filter by user_id
      .order("product_name", { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("GET /api/inventory error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ACCOUNTS API (Protected with Multi-tenancy) ====================
app.get("/api/accounts", authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", req.user.id) // ← CRITICAL: Filter by user_id
      .order("account_name", { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("GET /api/accounts error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== USER PROFILE API ====================
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .or(`user_id.eq.${req.user.id},id.eq.${req.user.id}`)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Profile doesn't exist yet, return basic user info
        return res.json({
          id: req.user.id,
          email: req.user.email,
          full_name: req.user.user_metadata?.full_name || "",
          avatar_url: req.user.user_metadata?.avatar_url || "",
        });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("GET /api/profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📊 Database: Supabase`);
  console.log(`🔐 Authentication endpoints available`);
  console.log(`👤 Auto-profile creation enabled`);
  console.log(`🌐 CORS: Enabled for all origins (universal access)`);
  console.log(`📱 Mobile access: Enabled for any network`);
  console.log(`🏢 Multi-tenancy: Enabled with RLS`);
  console.log(`🔒 Protected routes require authentication`);
});
