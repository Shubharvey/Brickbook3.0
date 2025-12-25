// This file is currently not used.
// The wallet and payment functionalities for customers are managed within
// server/routes/customers.js and server/controllers/customersController.js
// to ensure consistency with the existing 'customers' table schema.

// const express = require("express");
// const router = express.Router();
// const db = require("../config/database"); // This would point to a different DB setup

// // Add transaction and update balance
// router.post("/", (req, res) => {
//   const { id, accountId, date, description, amount, type } = req.body;

//   db.serialize(() => {
//     db.run("BEGIN TRANSACTION");

//     db.run(
//       `INSERT INTO transactions (id, account_id, date, description, amount, type)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [id, accountId, date, description, amount, type]
//     );

//     db.get(
//       "SELECT wallet_balance, due_balance FROM accounts WHERE id = ?",
//       [accountId],
//       (err, row) => {
//         if (err || !row) {
//           db.run("ROLLBACK");
//           return res.status(500).json({ error: "Account not found" });
//         }

//         let { wallet_balance, due_balance } = row;

//         if (type === "CREDIT") {
//           wallet_balance += amount;
//         } else {
//           if (wallet_balance >= amount) {
//             wallet_balance -= amount;
//           } else {
//             due_balance += amount - wallet_balance;
//             wallet_balance = 0;
//           }
//         }

//         db.run(
//           "UPDATE accounts SET wallet_balance = ?, due_balance = ? WHERE id = ?",
//           [wallet_balance, due_balance, accountId],
//           (err) => {
//             if (err) {
//               db.run("ROLLBACK");
//               return res.status(500).json({ error: err.message });
//             }
//             db.run("COMMIT", () => {
//               res.json({
//                 id,
//                 accountId,
//                 walletBalance: wallet_balance,
//                 dueBalance: due_balance,
//               });
//             });
//           }
//         );
//       }
//     );
//   });
// });

// // Bulk transactions
// router.post("/bulk", (req, res) => {
//   const { transactions } = req.body;

//   if (!transactions || transactions.length === 0)
//     return res.json({ success: true });

//   const processTransaction = (index) => {
//     if (index >= transactions.length) {
//       return res.json({ success: true });
//     }

//     const tx = transactions[index];

//     db.get(
//       "SELECT wallet_balance, due_balance FROM accounts WHERE id = ?",
//       [tx.accountId],
//       (err, row) => {
//         if (err || !row) return processTransaction(index + 1);

//         let { wallet_balance, due_balance } = row;

//         if (tx.type === "CREDIT") {
//           wallet_balance += tx.amount;
//         } else {
//           if (wallet_balance >= tx.amount) {
//             wallet_balance -= tx.amount;
//           } else {
//             due_balance += tx.amount - wallet_balance;
//             wallet_balance = 0;
//           }
//         }

//         db.serialize(() => {
//           db.run(
//             "UPDATE accounts SET wallet_balance = ?, due_balance = ? WHERE id = ?",
//             [wallet_balance, due_balance, tx.accountId]
//           );

//           db.run(
//             `INSERT INTO transactions (id, account_id, date, description, amount, type)
//                 VALUES (?, ?, ?, ?, ?, ?)`,
//             [tx.id, tx.accountId, tx.date, tx.description, tx.amount, tx.type],
//             () => {
//               processTransaction(index + 1);
//             }
//           );
//         });
//       }
//     );
//   };

//   processTransaction(0);
// });

// // Delete transaction
// router.delete("/:accountId/:transactionId", (req, res) => {
//   const { accountId, transactionId } = req.params;

//   db.serialize(() => {
//     db.get(
//       "SELECT * FROM transactions WHERE id = ?",
//       [transactionId],
//       (err, tx) => {
//         if (err || !tx)
//           return res.status(404).json({ error: "Transaction not found" });

//         db.get(
//           "SELECT wallet_balance, due_balance FROM accounts WHERE id = ?",
//           [accountId],
//           (err, acc) => {
//             if (err || !acc)
//               return res.status(404).json({ error: "Account not found" });

//             let { wallet_balance, due_balance } = acc;

//             if (tx.type === "CREDIT") {
//               wallet_balance -= tx.amount;
//             } else {
//               due_balance -= tx.amount;
//               if (due_balance < 0) {
//                 wallet_balance += Math.abs(due_balance);
//                 due_balance = 0;
//               }
//             }

//             db.run(
//               "UPDATE accounts SET wallet_balance = ?, due_balance = ? WHERE id = ?",
//               [wallet_balance, due_balance, accountId]
//             );

//             db.run(
//               "DELETE FROM transactions WHERE id = ?",
//               [transactionId],
//               (err) => {
//                 if (err) return res.status(500).json({ error: err.message });
//                 res.json({
//                   success: true,
//                   walletBalance: wallet_balance,
//                   dueBalance: due_balance,
//                 });
//               }
//             );
//           }
//         );
//       }
//     );
//   });
// });

// module.exports = router;
