const mongoose = require("mongoose");

const tripShareSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    shareToken: { type: String, required: true, unique: true, index: true },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("TripShareSession", tripShareSessionSchema);
