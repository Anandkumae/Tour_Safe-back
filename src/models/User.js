const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    authProvider: { type: String, enum: ["local", "google", "otp"], default: "local" },
    googleId: { type: String, default: null },
    phone: { type: String, default: null },
    role: { type: String, enum: ["tourist", "admin"], default: "tourist" },
    trackingEnabled: { type: Boolean, default: false },
    loginCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
