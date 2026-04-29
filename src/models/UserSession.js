const mongoose = require("mongoose");

const userSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    isRevoked: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserSession", userSessionSchema);
