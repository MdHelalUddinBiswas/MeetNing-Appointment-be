const {
  createGoogleMeetMeeting,
  cancelMeetingService,
} = require("../services/meeting.service");

/**
 * Create a meeting with Google Meet integration
 */
const createMeetingController = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      eventId,
      title,
      description,
      startTime,
      endTime,
      attendees,
      timezone,
    } = req.body;

    // Validate required fields
    if (!eventId || !startTime || !endTime) {
      return res.status(400).json({
        message:
          "Missing required fields. Please provide eventId, startTime, and endTime.",
      });
    }

    // Create meeting with Google Meet
    const result = await createGoogleMeetMeeting({
      userId,
      eventId,
      title: title || "New Meeting",
      description: description || "",
      startTime,
      endTime,
      attendees: Array.isArray(attendees) ? attendees : [],
      timezone: timezone || "UTC",
    });

    return res.status(201).json({
      message: "Meeting successfully created",
      meetLink: result.meetLink,
      calendarEventId: result.calendarEventId,
      meeting: result.meeting,
    });
  } catch (error) {
    console.error("Create meeting error:", error);
    return res.status(500).json({
      message: "Failed to create meeting",
      error: error.message,
    });
  }
};

/**
 * Cancel an existing meeting
 */
const cancelMeetingController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { meetingId } = req.params;

    if (!meetingId) {
      return res.status(400).json({ message: "Meeting ID is required" });
    }

    // Cancel the meeting
    const result = await cancelMeetingService(meetingId, userId);

    return res.status(200).json({
      message: "Meeting successfully cancelled",
      result,
    });
  } catch (error) {
    console.error("Cancel meeting error:", error);
    return res.status(500).json({
      message: "Failed to cancel meeting",
      error: error.message,
    });
  }
};

/**
 * Create Google Meet link with access token (for client-side OAuth flow)
 */
const createGoogleMeetLinkController = async (req, res) => {
  try {
    const { accessToken, eventDetails } = req.body;

    if (!accessToken) {
      return res.status(401).json({ error: "No access token provided" });
    }

    // Extract start and end times from the event details
    // The frontend sends nested objects, handle both formats
    let startDateTime, endDateTime, timeZone;

    if (eventDetails.start && eventDetails.start.dateTime) {
      // Handle nested format from frontend
      startDateTime = eventDetails.start.dateTime;
      endDateTime = eventDetails.end?.dateTime;
      timeZone = eventDetails.start.timeZone || "UTC";
    } else if (eventDetails.startTime) {
      // Handle flat format
      startDateTime = eventDetails.startTime;
      endDateTime = eventDetails.endTime;
      timeZone = eventDetails.timezone || "UTC";
    } else {
      return res
        .status(400)
        .json({ error: "Missing start/end time information" });
    }

    // Ensure we have valid ISO format dates for both start and end
    if (!startDateTime || !endDateTime) {
      return res.status(400).json({ error: "Invalid start or end time" });
    }

    // Get other event details
    const summary = eventDetails.summary || eventDetails.title || "New Meeting";
    const description =
      eventDetails.description || "Meeting created via MeetNing";

    // Extract attendees, handling different formats
    let attendees = [];
    if (eventDetails.attendees && Array.isArray(eventDetails.attendees)) {
      attendees = eventDetails.attendees;
    } else if (
      eventDetails.participants &&
      Array.isArray(eventDetails.participants)
    ) {
      attendees = eventDetails.participants.map((email) => ({ email }));
    }

    // Create Google Calendar API client
    const { google } = require("googleapis");
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    // Make request to Google Calendar API to create an event with conferencing
    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: {
        summary,
        description,
        start: {
          dateTime: startDateTime,
          timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone,
        },
        conferenceData: {
          createRequest: {
            requestId: `meeting-${Date.now()}`,
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
        attendees: attendees.length > 0 ? attendees : [],
      },
    });

    // Extract the Google Meet link
    const meetLink =
      response.data.hangoutLink ||
      (response.data.conferenceData &&
        response.data.conferenceData.entryPoints &&
        response.data.conferenceData.entryPoints.find((e) => e.uri).uri);

    if (!meetLink) {
      return res
        .status(400)
        .json({ error: "Failed to create Google Meet link" });
    }

    // Return the meet link
    return res.status(200).json({
      meetLink,
      eventId: response.data.id,
    });
  } catch (error) {
    console.error(
      "Google Meet creation error:",
      error.response ? error.response.data : error.message
    );
    return res.status(500).json({
      error: "Failed to create Google Meet",
      details: error.response ? error.response.data : error.message,
    });
  }
};

module.exports = {
  createMeetingController,
  cancelMeetingController,
  createGoogleMeetLinkController,
};
