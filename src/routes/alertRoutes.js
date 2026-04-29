const express = require("express");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const SOSAlert = require("../models/SOSAlert");
const User = require("../models/User");
const { getSocket } = require("../socketHub");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const { buildUpload, hasCloudinaryConfig, uploadAudioToCloudinary } = require("../middleware/uploadEvidence");

const router = express.Router();

function evidenceFileFilter(_req, file, cb) {
  const okImage = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
  const okAudio = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"].includes(file.mimetype);
  if (okImage || okAudio) return cb(null, true);
  return cb(new Error("Unsupported evidence type"), false);
}

const cloudUpload = buildUpload("safetour_evidence");

const diskUpload = multer({
  storage: multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, path.join(process.cwd(), "uploads"));
    },
    filename: function (_req, file, cb) {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = ext || (file.mimetype.startsWith("image/") ? ".jpg" : ".bin");
      const suffix = Math.random().toString(16).slice(2);
      cb(null, `evidence-${Date.now()}-${suffix}${safeExt}`);
    }
  }),
  fileFilter: evidenceFileFilter,
  limits: { fileSize: 12 * 1024 * 1024 }
});

const evidenceUpload = (cloudUpload || diskUpload);

router.post("/sos", auth, async (req, res) => {
  const { lat, lng, note, evidence } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ message: "lat and lng must be numbers" });
  }

  const alert = await SOSAlert.create({
    userId: req.user.sub,
    lat,
    lng,
    note: note || "Emergency SOS",
    evidence: {
      imageUrl: evidence?.imageUrl || "",
      audioUrl: evidence?.audioUrl || "",
      capturedAt: evidence ? new Date() : null
    }
  });

  const payload = {
    id: alert._id,
    userId: req.user.sub,
    name: req.user.name,
    lat,
    lng,
    note: alert.note,
    evidence: alert.evidence,
    createdAt: alert.createdAt
  };

  const io = getSocket();
  if (io) {
    io.to("admins").emit("sos-alert", payload);
    io.to("admins").emit("sos:new", payload);
  }

  return res.status(201).json({ message: "SOS sent", alert: payload });
});

// Upload evidence AFTER SOS so police get the alert instantly.
// Tourist can upload only for their own SOS. Admin can upload for any.
router.post(
  "/:id/evidence",
  auth,
  evidenceUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 }
  ]),
  async (req, res) => {
    const alertId = req.params.id;
    const alert = await SOSAlert.findById(alertId);
    if (!alert) return res.status(404).json({ message: "Alert not found" });

    const isOwner = alert.userId?.toString() === req.user.sub;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

    const imageFile = req.files?.image?.[0];
    const audioFile = req.files?.audio?.[0];

    let imageUrl = imageFile
      ? (imageFile.path?.startsWith("http") ? imageFile.path : `/uploads/${path.basename(imageFile.path)}`)
      : (alert.evidence?.imageUrl || "");
    
    let audioUrl = alert.evidence?.audioUrl || "";

    // Handle audio file upload to Cloudinary with proper audio processing
    if (audioFile) {
      try {
        if (hasCloudinaryConfig() && audioFile.mimetype.startsWith('audio/')) {
          console.log('Uploading audio to Cloudinary with proper audio processing...');
          
          // Read the audio file buffer
          const audioBuffer = fs.readFileSync(audioFile.path);
          
          // Upload to Cloudinary as audio
          const cloudinaryResult = await uploadAudioToCloudinary(audioBuffer, audioFile.originalname);
          
          // Construct the proper audio URL
          audioUrl = `https://res.cloudinary.com/${process.env.CLOUD_NAME}/video/upload/${cloudinaryResult.public_id}.webm`;
          
          console.log('Audio uploaded to Cloudinary:', audioUrl);
          
          // Clean up temporary file
          if (audioFile.path) {
            fs.unlinkSync(audioFile.path);
          }
        } else {
          // Fallback to local storage or non-audio files
          audioUrl = audioFile.path?.startsWith("http") ? audioFile.path : `/uploads/${path.basename(audioFile.path)}`;
        }
      } catch (error) {
        console.error('Audio upload error:', error);
        // Fallback to local file path
        audioUrl = audioFile.path?.startsWith("http") ? audioFile.path : `/uploads/${path.basename(audioFile.path)}`;
      }
    }

    alert.evidence = {
      imageUrl,
      audioUrl,
      capturedAt: new Date()
    };

    await alert.save();

    const alertOwner = await User.findById(alert.userId).select("name email");

    const payload = {
      id: alert._id,
      userId: req.user.sub, // ownership doesn't matter for UI; police merges by id
      name: alertOwner?.name || req.user.name,
      lat: alert.lat,
      lng: alert.lng,
      status: alert.status,
      note: alert.note,
      evidence: alert.evidence,
      createdAt: alert.createdAt
    };

    const io = getSocket();
    if (io) {
      io.to("admins").emit("sos-alert", payload);
      io.to("admins").emit("sos:new", payload);
    }

    return res.json({ message: `Evidence uploaded (${hasCloudinaryConfig() ? "cloud" : "local"})`, alert });
  }
);

router.get("/all", auth, requireRole("admin"), async (_req, res) => {
  const alerts = await SOSAlert.find().sort({ createdAt: -1 }).limit(200).populate("userId", "name email");
  return res.json(alerts);
});

router.patch("/:id/respond", auth, requireRole("admin"), async (req, res) => {
  const status = req.body.status || "acknowledged";
  if (!["open", "acknowledged", "resolved"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const updated = await SOSAlert.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!updated) {
    return res.status(404).json({ message: "Alert not found" });
  }
  return res.json(updated);
});

module.exports = router;
