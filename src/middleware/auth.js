const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const UserSession = require("../models/UserSession");

async function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const session = await UserSession.findOne({ tokenHash, isRevoked: false, expiresAt: { $gt: new Date() } });
    if (!session) {
      return res.status(401).json({ message: "Session expired or logged out" });
    }
    req.user = payload;
    req.token = token;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = auth;
