const express = require("express");
const crypto = require("crypto");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const User = require("../models/User");
const LocationPing = require("../models/LocationPing");
const TripShareSession = require("../models/TripShareSession");

const router = express.Router();

router.get("/active", auth, requireRole("admin"), async (_req, res) => {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const activeUsers = await LocationPing.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$userId", lat: { $first: "$lat" }, lng: { $first: "$lng" }, lastSeenAt: { $first: "$createdAt" } } }
  ]);
  const userIds = activeUsers.map((u) => u._id);
  const users = await User.find({ _id: { $in: userIds } }).select("name email");
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  const enriched = activeUsers.map((u) => ({
    userId: u._id,
    name: byId.get(u._id.toString())?.name || "Tourist",
    email: byId.get(u._id.toString())?.email || "",
    lat: u.lat,
    lng: u.lng,
    lastSeenAt: u.lastSeenAt
  }));
  return res.json(enriched);
});

router.post("/trip/share", auth, async (req, res) => {
  const ttlMinutes = Number(req.body.ttlMinutes || 120);
  const shareToken = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const session = await TripShareSession.create({ userId: req.user.sub, shareToken, expiresAt });
  const shareUrl = `${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/trip/${session.shareToken}`;
  return res.status(201).json({ shareToken: session.shareToken, shareUrl, expiresAt: session.expiresAt });
});

router.get("/trip/:token", auth, async (req, res) => {
  const session = await TripShareSession.findOne({
    shareToken: req.params.token,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate("userId", "name email");
  if (!session) {
    return res.status(404).json({ message: "Share session expired or invalid" });
  }
  const latestLocation = await LocationPing.findOne({ userId: session.userId._id }).sort({ createdAt: -1 });
  return res.json({
    traveler: session.userId,
    latestLocation,
    expiresAt: session.expiresAt
  });
});

module.exports = router;
