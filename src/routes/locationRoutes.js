const express = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const User = require("../models/User");
const LocationPing = require("../models/LocationPing");
const { getSocket } = require("../socketHub");
const { evaluateLocationRisk, buildRouteSuggestion } = require("../services/locationService");

const router = express.Router();

router.post("/update", auth, async (req, res) => {
  const { lat, lng, accuracy } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ message: "lat and lng must be numbers" });
  }

  const user = await User.findById(req.user.sub);
  if (!user?.trackingEnabled) {
    return res.status(403).json({ message: "Tracking disabled by user" });
  }

  const ping = await LocationPing.create({ userId: req.user.sub, lat, lng, accuracy: accuracy || null });
  const { nearbyRisks, predictedRisk } = await evaluateLocationRisk({ ...req.body, lat, lng });
  const routeSuggestion = buildRouteSuggestion(predictedRisk, nearbyRisks);

  const io = getSocket();
  if (io) {
    const locationPayload = { userId: req.user.sub, name: req.user.name, lat, lng, createdAt: ping.createdAt, predictedRisk };
    io.to("admins").emit("location-update", locationPayload);
    io.to("admins").emit("location:update", locationPayload);
    if (nearbyRisks.length > 0 || predictedRisk !== "low") {
      const zonePayload = { userId: req.user.sub, name: req.user.name, nearbyRisks, predictedRisk };
      io.to(req.user.sub).emit("zone-alert", zonePayload);
      io.to(req.user.sub).emit("risk:alert", nearbyRisks);
      io.to("admins").emit("zone-alert", zonePayload);
    }
  }

  return res.status(201).json({
    message: "Location updated",
    location: ping,
    nearbyRisks,
    predictedRisk,
    routeSuggestion
  });
});

router.get("/:userId", auth, async (req, res) => {
  if (req.user.role !== "admin" && req.user.sub !== req.params.userId) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const latest = await LocationPing.findOne({ userId: req.params.userId }).sort({ createdAt: -1 });
  if (!latest) {
    return res.status(404).json({ message: "No location found" });
  }
  return res.json(latest);
});

router.get("/", auth, requireRole("admin"), async (_req, res) => {
  const recent = await LocationPing.find().sort({ createdAt: -1 }).limit(200).populate("userId", "name email");
  return res.json(recent);
});

// Risk preview without saving location (used for login reassurance / quick alerts)
router.post("/risk", auth, async (req, res) => {
  const { lat, lng } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ message: "lat and lng must be numbers" });
  }

  const { nearbyRisks, predictedRisk } = await evaluateLocationRisk({
    lat,
    lng,
    time_of_day: Number(req.body.time_of_day ?? new Date().getHours()),
    crime_rate: Number(req.body.crime_rate ?? 4),
    lighting: Number(req.body.lighting ?? 3),
    footfall: Number(req.body.footfall ?? 5),
    previous_incidents: Number(req.body.previous_incidents ?? 0)
  });

  const greeting =
    predictedRisk === "high"
      ? `🔴 Caution: High-risk zone detected`
      : predictedRisk === "medium"
        ? `🟡 Caution: Moderate risk area`
        : `🟢 You are in a safe area`;

  return res.json({ nearbyRisks, predictedRisk, greeting });
});

module.exports = router;
