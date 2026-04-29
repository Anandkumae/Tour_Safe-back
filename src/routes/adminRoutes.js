const express = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const SOSAlert = require("../models/SOSAlert");
const LocationPing = require("../models/LocationPing");
const RiskZone = require("../models/RiskZone");

const router = express.Router();

router.use(auth, requireRole("admin"));

router.get("/sos", async (_req, res) => {
  const alerts = await SOSAlert.find().sort({ createdAt: -1 }).limit(100).populate("userId", "name email");
  return res.json(alerts);
});

router.patch("/sos/:id", async (req, res) => {
  const status = req.body.status;
  if (!["open", "acknowledged", "resolved"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const updated = await SOSAlert.findByIdAndUpdate(req.params.id, { status }, { new: true });
  return res.json(updated);
});

router.get("/live-map", async (_req, res) => {
  const recent = await LocationPing.find().sort({ createdAt: -1 }).limit(200).populate("userId", "name email");
  return res.json(recent);
});

router.get("/heatmap", async (_req, res) => {
  const openAlerts = await SOSAlert.aggregate([
    { $match: { status: { $ne: "resolved" } } },
    { $group: { _id: { lat: "$lat", lng: "$lng" }, count: { $sum: 1 } } }
  ]);
  return res.json(openAlerts);
});

router.post("/risk-zones", async (req, res) => {
  const zone = await RiskZone.create(req.body);
  return res.status(201).json(zone);
});

router.get("/risk-zones", async (_req, res) => {
  const zones = await RiskZone.find().sort({ createdAt: -1 });
  return res.json(zones);
});

module.exports = router;
