const express = require("express");
const auth = require("../middleware/auth");
const RiskZone = require("../models/RiskZone");

const router = express.Router();

router.get("/", auth, async (_req, res) => {
  const zones = await RiskZone.find().sort({ createdAt: -1 });
  return res.json(zones);
});

module.exports = router;
