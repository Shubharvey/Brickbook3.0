const express = require("express");
const cors = require("cors");
require("dotenv").config();
const supabase = require("./supabase");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", database: "Supabase" });
});

// SALES API
app.get("/api/sales", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sales")
      .select("*, sale_items(*)")
      .order("saleDate", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sales", async (req, res) => {
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

    // CRITICAL: Get customer's current wallet balance FIRST
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("wallet_balance")
      .eq("id", customerId)
      .single();

    if (customerError) throw customerError;

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

    // 1. Create sale record
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
    };

    const { data: saleResult, error: saleError } = await supabase
      .from("sales")
      .insert([sale])
      .select()
      .single();

    if (saleError) throw saleError;

    // 2. Create sale items
    if (items && items.length > 0) {
      const saleItems = items.map((item) => ({
        sale_id: saleResult.id,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.amount || item.quantity * item.price,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;
    }

    // 3. Update customer wallet ONLY if wallet was used
    if (walletUsed > 0) {
      const newWalletBalance = customer.wallet_balance - walletUsed;

      const { error: walletError } = await supabase
        .from("customers")
        .update({
          wallet_balance: newWalletBalance,
        })
        .eq("id", customerId);

      if (walletError) {
        console.error("Wallet update failed:", walletError);
        // Rollback the sale creation if wallet update fails
        await supabase.from("sales").delete().eq("id", saleResult.id);
        throw walletError;
      }
    }

    // 4. Update customer outstanding balance if due amount > 0
    if (dueAmount > 0) {
      const { data: currentCustomer, error: fetchError } = await supabase
        .from("customers")
        .select("outstanding_balance")
        .eq("id", customerId)
        .single();

      if (!fetchError && currentCustomer) {
        const newOutstandingBalance =
          currentCustomer.outstanding_balance + dueAmount;

        const { error: duesError } = await supabase
          .from("customers")
          .update({
            outstanding_balance: newOutstandingBalance,
          })
          .eq("id", customerId);

        if (duesError) console.error("Dues update failed:", duesError);
      }
    }

    // 5. Return complete sale with items
    const { data: completeSale, error: fetchError } = await supabase
      .from("sales")
      .select("*, sale_items(*)")
      .eq("id", saleResult.id)
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

// CUSTOMERS API
app.get("/api/customers", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/customers", async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const customer = {
      name,
      phone: phone || "",
      address: address || "",
      wallet_balance: 0,
      outstanding_balance: 0,
    };

    const { data, error } = await supabase
      .from("customers")
      .insert([customer])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CUSTOMER WALLET API
app.post("/api/customers/:id/wallet", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, description, notes } = req.body;

    console.log("Wallet request:", { id, amount, type, description, notes });

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Get current balance
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("wallet_balance")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

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

    // Update wallet balance
    const { error: updateError } = await supabase
      .from("customers")
      .update({ wallet_balance: newBalance })
      .eq("id", id);

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

// COLLECT PAYMENT API
app.post("/api/customers/:id/collect-payment", async (req, res) => {
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

    // Get current dues
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("outstanding_balance")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    if (customer.outstanding_balance < amount) {
      return res.status(400).json({
        error: "Payment amount exceeds outstanding balance",
        currentDues: customer.outstanding_balance,
      });
    }

    const newBalance = customer.outstanding_balance - amount;

    // Update outstanding balance
    const { error: updateError } = await supabase
      .from("customers")
      .update({ outstanding_balance: newBalance })
      .eq("id", id);

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
});

// DELETE SALE API
app.delete("/api/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // First get the sale details
    const { data: sale, error: fetchError } = await supabase
      .from("sales")
      .select("customerId, wallet_used, dueAmount, paymentType")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const { customerId, wallet_used = 0, dueAmount = 0, paymentType } = sale;

    // Delete sale items first
    const { error: itemsError } = await supabase
      .from("sale_items")
      .delete()
      .eq("sale_id", id);

    if (itemsError) throw itemsError;

    // Delete the sale
    const { error: deleteError } = await supabase
      .from("sales")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    // Reverse wallet balance if wallet was used
    if (
      wallet_used > 0 &&
      (paymentType === "Advance + Cash" || paymentType === "Full Advance")
    ) {
      const { data: customer, error: custError } = await supabase
        .from("customers")
        .select("wallet_balance")
        .eq("id", customerId)
        .single();

      if (!custError && customer) {
        const newWalletBalance = customer.wallet_balance + wallet_used;

        const { error: walletError } = await supabase
          .from("customers")
          .update({ wallet_balance: newWalletBalance })
          .eq("id", customerId);

        if (walletError) console.error("Wallet reversal failed:", walletError);
      }
    }

    // Reverse outstanding balance if there was due amount
    if (dueAmount > 0) {
      const { data: customer, error: custError } = await supabase
        .from("customers")
        .select("outstanding_balance")
        .eq("id", customerId)
        .single();

      if (!custError && customer) {
        const newOutstandingBalance = customer.outstanding_balance - dueAmount;

        const { error: duesError } = await supabase
          .from("customers")
          .update({ outstanding_balance: newOutstandingBalance })
          .eq("id", customerId);

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

// DELETE CUSTOMER API - COMPLETE CASCADE DELETION (FIXED VERSION)
app.delete("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`Starting deletion for customer ${id}`);

    // 1. Get ALL sales for this customer (not just basic info)
    const { data: customerSales, error: salesError } = await supabase
      .from("sales")
      .select("id, wallet_used, dueAmount, paymentType, customerId")
      .eq("customerId", id);

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

        // 2a. Delete sale_items for this sale
        const { error: itemsError } = await supabase
          .from("sale_items")
          .delete()
          .eq("sale_id", sale.id);

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

        // 2c. Delete the sale
        const { error: deleteSaleError } = await supabase
          .from("sales")
          .delete()
          .eq("id", sale.id);

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

        // Get current balances
        const { data: customer, error: custError } = await supabase
          .from("customers")
          .select("wallet_balance, outstanding_balance")
          .eq("id", id)
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
            .eq("id", id);

          if (updateError) {
            console.error("Balance update failed:", updateError);
            // Don't throw, just log - customer deletion should still proceed
          } else {
            console.log(`Updated customer balances successfully`);
          }
        }
      }
    }

    // 4. Delete any payments linked to this customer
    try {
      const { error: paymentsError } = await supabase
        .from("payments")
        .delete()
        .eq("customer_id", id);

      if (paymentsError && !paymentsError.message.includes("No rows found")) {
        console.error("Payments deletion error:", paymentsError);
      } else {
        console.log("Deleted linked payments (if any)");
      }
    } catch (paymentsErr) {
      console.error("Payments deletion non-critical error:", paymentsErr);
    }

    // 5. Delete any account linked to this customer
    try {
      const { error: accountError } = await supabase
        .from("accounts")
        .delete()
        .eq("customer_id", id);

      if (accountError && !accountError.message.includes("No rows found")) {
        console.error("Account deletion error:", accountError);
      } else {
        console.log("Deleted linked account (if any)");
      }
    } catch (accountErr) {
      console.error("Account deletion non-critical error:", accountErr);
    }

    // 6. Finally delete the customer
    const { error: deleteError } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📊 Database: Supabase`);
});
