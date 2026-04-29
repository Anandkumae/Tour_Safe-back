const mongoose = require("mongoose");

const sosAlertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    status: { type: String, enum: ["open", "acknowledged", "resolved"], default: "open" },
    note: { type: String, default: "" },
    evidence: {
      imageUrl: { type: String, default: "" },
      audioUrl: { type: String, default: "" },
      capturedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SOSAlert", sosAlertSchema);
