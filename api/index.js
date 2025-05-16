const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

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
