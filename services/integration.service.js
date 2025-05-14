const { Pool } = require('pg');
const { googleOAuth2Client } = require('../config/oauth.config');
const {
  IntegrationProviderEnum,
  IntegrationCategoryEnum,
  IntegrationAppTypeEnum,
  appTypeToProviderMap,
  appTypeToTitleMap,
  appTypeToCategoryMap,
  encodeState
} = require('../models/integration.models');

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
 * Get all integrations for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of all available integrations and their connection status
 */
const getUserIntegrationsService = async (userId) => {
  const query = `
    SELECT app_type, provider, category, access_token, refresh_token, expiry_date
    FROM integrations
    WHERE user_id = $1
  `;
  
  const result = await pool.query(query, [userId]);
  const userIntegrations = result.rows;
  
  const connectedMap = new Map(
    userIntegrations.map((integration) => [integration.app_type, true])
  );
  
  return Object.values(IntegrationAppTypeEnum).map((appType) => {
    return {
      provider: appTypeToProviderMap[appType],
      title: appTypeToTitleMap[appType],
      app_type: appType,
      category: appTypeToCategoryMap[appType],
      isConnected: connectedMap.has(appType) || false,
    };
  });
};

/**
 * Check if a specific integration is connected
 * @param {string} userId - User ID
 * @param {string} appType - Integration app type
 * @returns {Promise<boolean>} - Whether the integration is connected
 */
const checkIntegrationService = async (userId, appType) => {
  const query = `
    SELECT id FROM integrations
    WHERE user_id = $1 AND app_type = $2
    LIMIT 1
  `;
  
  const result = await pool.query(query, [userId, appType]);
  return result.rows.length > 0;
};

/**
 * Generate OAuth URL for connecting to an app
 * @param {string} userId - User ID
 * @param {string} appType - Integration app type
 * @returns {Promise<Object>} - Auth URL for the OAuth flow
 */
const connectAppService = async (userId, appType) => {
  const state = encodeState({ userId, appType });
  
  let authUrl;
  
  switch (appType) {
    case IntegrationAppTypeEnum.GOOGLE_MEET_AND_CALENDAR:
      authUrl = googleOAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"],
        prompt: "consent",
        state,
      });
      break;
    default:
      throw new Error("Unsupported app type");
  }
  
  return { url: authUrl };
};

/**
 * Create a new integration record
 * @param {Object} data - Integration data
 * @returns {Promise<Object>} - Created integration
 */
const createIntegrationService = async (data) => {
  const { userId, provider, category, app_type, access_token, refresh_token, expiry_date, metadata } = data;
  
  // Check if integration already exists
  const checkQuery = `
    SELECT id FROM integrations
    WHERE user_id = $1 AND app_type = $2
  `;
  const checkResult = await pool.query(checkQuery, [userId, app_type]);
  
  if (checkResult.rows.length > 0) {
    // Update existing integration
    const updateQuery = `
      UPDATE integrations
      SET access_token = $1, 
          refresh_token = $2,
          expiry_date = $3,
          metadata = $4,
          is_connected = true,
          updated_at = NOW()
      WHERE user_id = $5 AND app_type = $6
      RETURNING id, app_type, is_connected
    `;
    
    const updateResult = await pool.query(
      updateQuery,
      [access_token, refresh_token, expiry_date, JSON.stringify(metadata), userId, app_type]
    );
    
    return updateResult.rows[0];
  }
  
  // Create new integration
  const insertQuery = `
    INSERT INTO integrations 
    (user_id, provider, category, app_type, access_token, refresh_token, expiry_date, metadata, is_connected)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
    RETURNING id, app_type, is_connected
  `;
  
  const insertResult = await pool.query(
    insertQuery,
    [userId, provider, category, app_type, access_token, refresh_token, expiry_date, JSON.stringify(metadata)]
  );
  
  return insertResult.rows[0];
};

/**
 * Get integration by user ID and app type
 * @param {string} userId - User ID
 * @param {string} appType - Integration app type
 * @returns {Promise<Object|null>} - Integration or null if not found
 */
const getIntegrationByUserIdAndAppType = async (userId, appType) => {
  const query = `
    SELECT id, user_id, provider, category, app_type, access_token, refresh_token, expiry_date, metadata
    FROM integrations
    WHERE user_id = $1 AND app_type = $2
    LIMIT 1
  `;
  
  const result = await pool.query(query, [userId, appType]);
  return result.rows.length ? result.rows[0] : null;
};

/**
 * Validate and refresh Google token if needed
 * @param {string} accessToken - Current access token
 * @param {string} refreshToken - Refresh token
 * @param {number|null} expiryDate - Token expiry timestamp
 * @returns {Promise<string>} - Valid access token
 */
const validateGoogleToken = async (accessToken, refreshToken, expiryDate) => {
  if (expiryDate === null || Date.now() >= expiryDate) {
    googleOAuth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    
    try {
      const { credentials } = await googleOAuth2Client.refreshAccessToken();
      
      // Update the token in the database
      const query = `
        UPDATE integrations
        SET access_token = $1, expiry_date = $2
        WHERE refresh_token = $3
      `;
      
      await pool.query(query, [
        credentials.access_token,
        credentials.expiry_date,
        refreshToken
      ]);
      
      return credentials.access_token;
    } catch (error) {
      console.error("Error refreshing access token:", error);
      throw new Error("Failed to refresh access token");
    }
  }
  
  return accessToken;
};

module.exports = {
  getUserIntegrationsService,
  checkIntegrationService,
  connectAppService,
  createIntegrationService,
  getIntegrationByUserIdAndAppType,
  validateGoogleToken
};
