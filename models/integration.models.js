/**
 * Integration models for MeetNing application
 * Defines the structure for OAuth integrations like Google Meet and Calendar
 */

// Define integration entity types
const IntegrationProviderEnum = {
  GOOGLE: "GOOGLE",
  ZOOM: "ZOOM",
  MICROSOFT: "MICROSOFT"
};

const IntegrationCategoryEnum = {
  CALENDAR: "CALENDAR",
  VIDEO_CONFERENCING: "VIDEO_CONFERENCING",
  CALENDAR_AND_VIDEO_CONFERENCING: "CALENDAR_AND_VIDEO_CONFERENCING"
};

const IntegrationAppTypeEnum = {
  GOOGLE_MEET_AND_CALENDAR: "GOOGLE_MEET_AND_CALENDAR",
  ZOOM_MEETING: "ZOOM_MEETING",
  OUTLOOK_CALENDAR: "OUTLOOK_CALENDAR"
};

// Mapping helper functions
const appTypeToProviderMap = {
  [IntegrationAppTypeEnum.GOOGLE_MEET_AND_CALENDAR]: IntegrationProviderEnum.GOOGLE,
  [IntegrationAppTypeEnum.ZOOM_MEETING]: IntegrationProviderEnum.ZOOM,
  [IntegrationAppTypeEnum.OUTLOOK_CALENDAR]: IntegrationProviderEnum.MICROSOFT
};

const appTypeToTitleMap = {
  [IntegrationAppTypeEnum.GOOGLE_MEET_AND_CALENDAR]: "Google Meet & Calendar",
  [IntegrationAppTypeEnum.ZOOM_MEETING]: "Zoom",
  [IntegrationAppTypeEnum.OUTLOOK_CALENDAR]: "Microsoft Outlook"
};

const appTypeToCategoryMap = {
  [IntegrationAppTypeEnum.GOOGLE_MEET_AND_CALENDAR]: IntegrationCategoryEnum.CALENDAR_AND_VIDEO_CONFERENCING,
  [IntegrationAppTypeEnum.ZOOM_MEETING]: IntegrationCategoryEnum.VIDEO_CONFERENCING,
  [IntegrationAppTypeEnum.OUTLOOK_CALENDAR]: IntegrationCategoryEnum.CALENDAR
};

// Encode and decode state for OAuth flow
const encodeState = (data) => {
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

const decodeState = (state) => {
  try {
    return JSON.parse(Buffer.from(state, 'base64').toString());
  } catch (error) {
    console.error("Failed to decode state:", error);
    return {};
  }
};

module.exports = {
  IntegrationProviderEnum,
  IntegrationCategoryEnum,
  IntegrationAppTypeEnum,
  appTypeToProviderMap,
  appTypeToTitleMap,
  appTypeToCategoryMap,
  encodeState,
  decodeState
};
