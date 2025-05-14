const { google } = require('googleapis');
const { validateGoogleToken, getIntegrationByUserIdAndAppType } = require('./integration.service');
const { IntegrationAppTypeEnum } = require('../models/integration.models');
const { Pool } = require('pg');

// Create database connection
const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

/**
 * Get a configured Calendar API client based on the integration type
 * @param {string} appType - Integration app type
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 * @param {number|null} expiryDate - Token expiry timestamp
 * @returns {Promise<Object>} - Calendar client and type
 */
const getCalendarClient = async (
  appType,
  accessToken,
  refreshToken,
  expiryDate
) => {
  switch (appType) {
    case IntegrationAppTypeEnum.GOOGLE_MEET_AND_CALENDAR:
      // Validate token and refresh if needed
      const validToken = await validateGoogleToken(
        accessToken,
        refreshToken,
        expiryDate
      );
      
      // Configure the Google OAuth client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: validToken });
      
      // Create Google Calendar API client
      const calendar = google.calendar({
        version: "v3",
        auth: oauth2Client,
      });
      
      return {
        calendar,
        calendarType: IntegrationAppTypeEnum.GOOGLE_MEET_AND_CALENDAR,
      };
      
    default:
      throw new Error(`Unsupported Calendar provider: ${appType}`);
  }
};

/**
 * Create a meeting with Google Meet
 * @param {Object} meetingData - Meeting data
 * @returns {Promise<Object>} - Created meeting with Meet link
 */
const createGoogleMeetMeeting = async (meetingData) => {
  const {
    userId,
    eventId,
    title,
    description,
    startTime,
    endTime,
    attendees,
    timezone = "UTC"
  } = meetingData;

  // Get user's Google integration
  const integration = await getIntegrationByUserIdAndAppType(
    userId,
    IntegrationAppTypeEnum.GOOGLE_MEET_AND_CALENDAR
  );

  if (!integration) {
    throw new Error("Google Calendar integration not found");
  }

  // Get calendar client
  const { calendar } = await getCalendarClient(
    integration.app_type,
    integration.access_token,
    integration.refresh_token,
    integration.expiry_date
  );

  // Create Google Calendar event with Meet link
  const response = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    requestBody: {
      summary: title,
      description: description,
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: timezone,
      },
      attendees: Array.isArray(attendees) ? attendees : [],
      conferenceData: {
        createRequest: {
          requestId: `meeting-${eventId}-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    },
  });

  // Extract the Google Meet link
  const meetLink = response.data.hangoutLink ||
    (response.data.conferenceData &&
      response.data.conferenceData.entryPoints &&
      response.data.conferenceData.entryPoints.find((e) => e.uri)?.uri);

  // Create meeting record in database
  const insertQuery = `
    INSERT INTO meetings
    (event_id, user_id, title, description, start_time, end_time, 
     meet_link, calendar_event_id, calendar_app_type, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled')
    RETURNING id, meet_link
  `;

  const result = await pool.query(insertQuery, [
    eventId,
    userId,
    title,
    description,
    new Date(startTime),
    new Date(endTime),
    meetLink,
    response.data.id,
    IntegrationAppTypeEnum.GOOGLE_MEET_AND_CALENDAR,
  ]);

  return {
    meetLink,
    calendarEventId: response.data.id,
    meeting: result.rows[0],
  };
};

/**
 * Cancel a meeting
 * @param {string} meetingId - Meeting ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Cancellation result
 */
const cancelMeetingService = async (meetingId, userId) => {
  // Get meeting details
  const meetingQuery = `
    SELECT 
      m.id, m.calendar_event_id, m.calendar_app_type, m.user_id
    FROM meetings m
    WHERE m.id = $1 AND m.user_id = $2
  `;
  
  const meetingResult = await pool.query(meetingQuery, [meetingId, userId]);
  const meeting = meetingResult.rows[0];
  
  if (!meeting) {
    throw new Error("Meeting not found");
  }
  
  try {
    // Get user's integration
    const integration = await getIntegrationByUserIdAndAppType(
      userId,
      meeting.calendar_app_type
    );
    
    if (integration) {
      // Get calendar client
      const { calendar } = await getCalendarClient(
        integration.app_type,
        integration.access_token,
        integration.refresh_token,
        integration.expiry_date
      );
      
      // Delete the event from Google Calendar
      await calendar.events.delete({
        calendarId: "primary",
        eventId: meeting.calendar_event_id,
      });
    }
  } catch (error) {
    console.error("Failed to delete event from calendar:", error);
    throw new Error("Failed to delete event from calendar");
  }
  
  // Update meeting status in database
  const updateQuery = `
    UPDATE meetings
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = $1
    RETURNING id, status
  `;
  
  const result = await pool.query(updateQuery, [meetingId]);
  
  return { success: true, meeting: result.rows[0] };
};

module.exports = {
  createGoogleMeetMeeting,
  cancelMeetingService,
};
