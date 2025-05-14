const express = require("express");
const {
  createMeetingController,
  cancelMeetingController,
  createGoogleMeetLinkController,
} = require("../controllers/meeting.controller");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Create a meeting with Google Meet
router.post("/", authenticateToken, createMeetingController);

// Cancel a meeting
router.delete("/:meetingId", authenticateToken, cancelMeetingController);

// Create Google Meet link with access token (client-side OAuth)
router.post("/google-meet", createGoogleMeetLinkController);

module.exports = router;
