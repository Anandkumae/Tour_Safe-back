const mongoose = require("mongoose");

const riskZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    radiusMeters: { type: Number, required: true, default: 500 },
    riskLevel: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    activeAfterHour: { type: Number, default: 21 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("RiskZone", riskZoneSchema);
