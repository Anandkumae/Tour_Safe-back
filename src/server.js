require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const touristRoutes = require("./routes/touristRoutes");
const adminRoutes = require("./routes/adminRoutes");
const locationRoutes = require("./routes/locationRoutes");
const alertRoutes = require("./routes/alertRoutes");
const crimeZoneRoutes = require("./routes/crimeZoneRoutes");
const userRoutes = require("./routes/userRoutes");
const routeRoutes = require("./routes/routeRoutes");
const { attachSocket } = require("./socketHub");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN || "*"
  }
});
attachSocket(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Unauthorized"));
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = payload;
    return next();
  } catch (err) {
    return next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  socket.join(socket.user.sub);
  if (socket.user.role === "admin") {
    socket.join("admins");
  }
});

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use("/uploads", express.static("uploads", {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'audio/webm;codecs=opus');
    } else if (filePath.endsWith('.mp4') || filePath.endsWith('.m4a')) {
      res.setHeader('Content-Type', 'audio/mp4');
    } else if (filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (filePath.endsWith('.ogg')) {
      res.setHeader('Content-Type', 'audio/ogg;codecs=opus');
    } else if (filePath.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/wav');
    }
    
    // Add CORS headers for audio files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    
    // Enable range requests for audio streaming
    res.setHeader('Accept-Ranges', 'bytes');
  }
}));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/tourist", touristRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/alert", alertRoutes);
app.use("/api/crime-zones", crimeZoneRoutes);
app.use("/api/users", userRoutes);
app.use("/api/route", routeRoutes);

const port = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`SafeTour backend running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server", err);
    process.exit(1);
  });
