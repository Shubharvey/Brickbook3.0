const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Get all locations
router.get("/", (req, res) => {
  db.all("SELECT * FROM locations", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create new location
router.post("/", (req, res) => {
  const { id, name } = req.body;
  db.run(
    "INSERT INTO locations (id, name) VALUES (?, ?)",
    [id, name],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, name });
    }
  );
});

module.exports = router;
