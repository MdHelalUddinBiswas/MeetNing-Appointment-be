const express = require("express");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  })
);

app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.send("MeetNing API is running");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "MeetNing Appointment AI API is running",
    timestamp: new Date().toISOString(),
  });
});
