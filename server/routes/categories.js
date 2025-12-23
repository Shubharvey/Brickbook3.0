const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Get all categories
router.get("/", (req, res) => {
  db.all("SELECT * FROM categories", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const categories = rows.map((c) => ({
      id: c.id,
      name: c.name,
      locationId: c.location_id,
      type: c.type,
    }));

    res.json(categories);
  });
});

// Create new category
router.post("/", (req, res) => {
  const { id, name, locationId, type } = req.body;
  db.run(
    "INSERT INTO categories (id, name, location_id, type) VALUES (?, ?, ?, ?)",
    [id, name, locationId, type],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json(req.body);
    }
  );
});

// Delete category
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.serialize(() => {
    db.all(
      "SELECT id FROM accounts WHERE category_id = ?",
      [id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const accountIds = rows.map((r) => r.id);

        if (accountIds.length > 0) {
          const placeholders = accountIds.map(() => "?").join(",");
          db.run(
            `DELETE FROM transactions WHERE account_id IN (${placeholders})`,
            accountIds
          );
          db.run(`DELETE FROM accounts WHERE category_id = ?`, [id]);
        }
        db.run("DELETE FROM categories WHERE id = ?", [id], function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, deletedCategoryId: id });
        });
      }
    );
  });
});

module.exports = router;
