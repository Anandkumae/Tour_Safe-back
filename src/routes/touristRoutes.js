const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const LocationPing = require("../models/LocationPing");
const SOSAlert = require("../models/SOSAlert");
const RiskZone = require("../models/RiskZone");
const { distanceMeters } = require("../utils/geo");
const { getSocket } = require("../socketHub");
const { predictRisk } = require("../services/mlRiskService");

const router = express.Router();

router.use(auth);

router.post("/tracking/toggle", async (req, res) => {
  const enabled = Boolean(req.body.enabled);
  const user = await User.findByIdAndUpdate(req.user.sub, { trackingEnabled: enabled }, { new: true });
  return res.json({ trackingEnabled: user.trackingEnabled });
});

router.post("/location", async (req, res) => {
  const { lat, lng, accuracy } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ message: "lat and lng must be numbers" });
  }

  const user = await User.findById(req.user.sub);
  if (!user?.trackingEnabled) {
    return res.status(403).json({ message: "Tracking disabled by user" });
  }

  const ping = await LocationPing.create({ userId: req.user.sub, lat, lng, accuracy: accuracy || null });

  const zones = await RiskZone.find();
  const nearbyRisks = zones
    .filter((zone) => distanceMeters(lat, lng, zone.lat, zone.lng) <= zone.radiusMeters)
    .map((zone) => ({
      zone: zone.name,
      riskLevel: zone.riskLevel,
      message: `Caution: ${zone.name} has ${zone.riskLevel} risk, especially after ${zone.activeAfterHour}:00`
    }));

  const predictionFeatures = {
    latitude: lat,
    longitude: lng,
    time_of_day: Number(req.body.time_of_day ?? new Date().getHours()),
    crime_rate: Number(req.body.crime_rate ?? 4),
    lighting: Number(req.body.lighting ?? 3),
    footfall: Number(req.body.footfall ?? 5),
    previous_incidents: Number(req.body.previous_incidents ?? nearbyRisks.length)
  };
  const predictedRisk = await predictRisk(predictionFeatures);

  const io = getSocket();
  if (io) {
    io.to("admins").emit("location:update", { userId: req.user.sub, name: req.user.name, lat, lng, createdAt: ping.createdAt });
    if (nearbyRisks.length > 0) {
      io.to(req.user.sub).emit("risk:alert", nearbyRisks);
    }
  }

  return res.status(201).json({ message: "Location saved", nearbyRisks, predictedRisk });
});

router.post("/sos", async (req, res) => {
  const { lat, lng, note } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ message: "lat and lng must be numbers" });
  }

  const alert = await SOSAlert.create({ userId: req.user.sub, lat, lng, note: note || "" });
  const io = getSocket();
  if (io) {
    io.to("admins").emit("sos:new", { id: alert._id, userId: req.user.sub, name: req.user.name, lat, lng, note: alert.note, createdAt: alert.createdAt });
  }

  return res.status(201).json({ message: "SOS sent", alertId: alert._id });
});

router.get("/safe-zones", async (_req, res) => {
  return res.json({
    safeZones: [
      { type: "police", name: "Central Police Station", lat: 12.9701, lng: 77.5946 },
      { type: "hospital", name: "City Care Hospital", lat: 12.9752, lng: 77.5998 }
    ]
  });
});

module.exports = router;
