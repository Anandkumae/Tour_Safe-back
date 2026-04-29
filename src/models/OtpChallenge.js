const mongoose = require("mongoose");

const otpChallengeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true, index: true },
    purpose: { type: String, enum: ["login"], default: "login" },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 }
  },
  { timestamps: true }
);

otpChallengeSchema.index({ email: 1, purpose: 1, usedAt: 1, expiresAt: 1 });

module.exports = mongoose.model("OtpChallenge", otpChallengeSchema);

