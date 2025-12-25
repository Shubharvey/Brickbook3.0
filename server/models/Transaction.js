// Use the centralized database instance
const { db } = require("../index");

class Transaction {
  /**
   * Creates a new transaction record.
   * @param {object} transactionData - The transaction data.
   * @param {number} transactionData.customer_id - The ID of the customer.
   * @param {number} transactionData.amount - The amount of the transaction.
   * @param {'credit' | 'debit' | 'payment' | 'dues_applied'} transactionData.type - Type of transaction.
   * @param {string} transactionData.description - A short description of the transaction.
   * @param {string} [transactionData.notes] - Optional detailed notes.
   * @param {function} callback - Callback function (err, result).
   */
  static create(transactionData, callback) {
    const { customer_id, amount, type, description, notes } = transactionData;
    const query = `
      INSERT INTO transactions 
      (customer_id, amount, type, description, notes, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `;
    db.run(
      query,
      [customer_id, amount, type, description, notes],
      function (err) {
        if (err) {
          console.error("Error creating transaction:", err.message);
          return callback(err);
        }
        callback(null, { id: this.lastID, ...transactionData });
      }
    );
  }

  /**
   * Retrieves all transactions for a given customer.
   * @param {number} customerId - The ID of the customer.
   * @param {function} callback - Callback function (err, transactions).
   */
  static findByCustomerId(customerId, callback) {
    const query = `
      SELECT 
        id, customer_id, amount, type, description, notes, created_at
      FROM transactions
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `;
    db.all(query, [customerId], (err, rows) => {
      if (err) {
        console.error(
          "Error fetching transactions by customer ID:",
          err.message
        );
        return callback(err);
      }
      callback(null, rows);
    });
  }

  /**
   * Retrieves a single transaction by its ID.
   * @param {number} transactionId - The ID of the transaction.
   * @param {function} callback - Callback function (err, transaction).
   */
  static findById(transactionId, callback) {
    const query = `
      SELECT 
        id, customer_id, amount, type, description, notes, created_at
      FROM transactions
      WHERE id = ?
    `;
    db.get(query, [transactionId], (err, row) => {
      if (err) {
        console.error("Error fetching transaction by ID:", err.message);
        return callback(err);
      }
      callback(null, row);
    });
  }
}

module.exports = Transaction;
