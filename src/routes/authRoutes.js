const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const UserSession = require("../models/UserSession");
const auth = require("../middleware/auth");
const OtpChallenge = require("../models/OtpChallenge");

const router = express.Router();

async function issueTokenForUser(user, req) {
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

  await UserSession.create({
    userId: user._id,
    tokenHash,
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
    expiresAt
  });

  await User.findByIdAndUpdate(user._id, { $inc: { loginCount: 1 }, $set: { lastLoginAt: new Date() } });

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      trackingEnabled: user.trackingEnabled,
      loginCount: (user.loginCount || 0) + 1
    }
  };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      authProvider: "local",
      role: role === "admin" ? "admin" : "tourist"
    });

    return res.status(201).json({ message: "Registered", userId: user._id });
  } catch (err) {
    return res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.passwordHash || (user.authProvider && user.authProvider !== "local")) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const issued = await issueTokenForUser(user, req);
    return res.json(issued);
  } catch (err) {
    return res.status(500).json({ message: "Login failed", error: err.message });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "idToken is required" });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return res.status(500).json({ message: "Server misconfiguration: GOOGLE_CLIENT_ID missing" });
    }

    const oauthClient = new OAuth2Client(googleClientId);
    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: googleClientId
    });
    const payload = ticket.getPayload();
    const email = payload?.email;
    const name = payload?.name || "Google User";
    const googleId = payload?.sub;

    if (!email || !googleId) {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    const normalizedRole = role === "admin" ? "admin" : "tourist";

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash: null,
        authProvider: "google",
        googleId,
        role: normalizedRole
      });
    } else if (!user.googleId) {
      await User.updateOne({ _id: user._id }, { googleId });
    }

    const issued = await issueTokenForUser(user, req);
    return res.json(issued);
  } catch (err) {
    return res.status(401).json({ message: "Google authentication failed", error: err.message });
  }
});

router.post("/otp/send", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email is required" });

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = crypto.createHash("sha256").update(`${normalizedEmail}:${code}`).digest("hex");

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OtpChallenge.updateMany({ email: normalizedEmail, purpose: "login", usedAt: null }, { usedAt: new Date() });
    await OtpChallenge.create({ email: normalizedEmail, purpose: "login", codeHash, expiresAt });

    const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!hasSmtp) {
      // Dev fallback: return the code so OTP flow can still be tested locally.
      return res.json({ message: "OTP code generated (dev mode)", debugCode: code, expiresAt });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: process.env.OTP_FROM_EMAIL || process.env.SMTP_USER,
      to: normalizedEmail,
      subject: "SafeTour AI OTP Code",
      text: `Your login OTP for SafeTour AI is: ${code}. It expires in 5 minutes.`
    });

    return res.json({ message: "OTP sent", expiresAt });
  } catch (err) {
    return res.status(500).json({ message: "Failed to send OTP", error: err.message });
  }
});

router.post("/otp/verify", async (req, res) => {
  try {
    const { email, code, role } = req.body;
    if (!email || !code) return res.status(400).json({ message: "email and code are required" });

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = role === "admin" ? "admin" : "tourist";

    const challenge = await OtpChallenge.findOne({
      email: normalizedEmail,
      purpose: "login",
      usedAt: null,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!challenge) {
      return res.status(401).json({ message: "OTP expired or invalid" });
    }

    const codeHash = crypto.createHash("sha256").update(`${normalizedEmail}:${code}`).digest("hex");
    if (challenge.codeHash !== codeHash) {
      challenge.attempts = (challenge.attempts || 0) + 1;
      await challenge.save();
      return res.status(401).json({ message: "Invalid OTP" });
    }

    challenge.usedAt = new Date();
    await challenge.save();

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const baseName = normalizedEmail.split("@")[0]?.replace(/[._-]+/g, " ")?.trim() || "Traveler";
      user = await User.create({
        name: baseName
          .split(" ")
          .filter(Boolean)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" "),
        email: normalizedEmail,
        passwordHash: null,
        authProvider: "otp",
        role: normalizedRole
      });
    }

    const issued = await issueTokenForUser(user, req);
    return res.json(issued);
  } catch (err) {
    return res.status(500).json({ message: "OTP verification failed", error: err.message });
  }
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.sub).select("-passwordHash");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json({ user });
});

router.post("/logout", auth, async (req, res) => {
  const tokenHash = crypto.createHash("sha256").update(req.token).digest("hex");
  await UserSession.findOneAndUpdate({ tokenHash }, { isRevoked: true });
  return res.json({ message: "Logged out" });
});

module.exports = router;
