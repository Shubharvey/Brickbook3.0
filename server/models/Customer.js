const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ["Regular", "VIP"],
    default: "Regular",
  },
  // IMPORTANT: This field stores wallet balance
  walletBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Optional: Track when customer was created
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Optional: Track last update
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
customerSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Customer", customerSchema);
