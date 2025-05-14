const { Pool } = require('pg');
const { 
  getUserIntegrationsService, 
  checkIntegrationService, 
  connectAppService, 
  createIntegrationService 
} = require('../services/integration.service');
const { googleOAuth2Client } = require('../config/oauth.config');
const { 
  IntegrationProviderEnum, 
  IntegrationCategoryEnum, 
  IntegrationAppTypeEnum,
  decodeState 
} = require('../models/integration.models');

// Get all user integrations
const getUserIntegrationsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const integrations = await getUserIntegrationsService(userId);
    
    return res.status(200).json({
      message: "Fetched user integrations successfully",
      integrations,
    });
  } catch (error) {
    console.error("Get user integrations error:", error);
    return res.status(500).json({ 
      message: "Server error while fetching integrations",
      error: error.message 
    });
  }
};

// Check if a specific integration is connected
const checkIntegrationController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { appType } = req.params;
    
    if (!Object.values(IntegrationAppTypeEnum).includes(appType)) {
      return res.status(400).json({ message: "Invalid app type" });
    }
    
    const isConnected = await checkIntegrationService(userId, appType);
    
    return res.status(200).json({
      message: "Integration checked successfully",
      isConnected,
    });
  } catch (error) {
    console.error("Check integration error:", error);
    return res.status(500).json({ 
      message: "Server error while checking integration",
      error: error.message 
    });
  }
};

// Start OAuth flow for connecting to an app
const connectAppController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { appType } = req.params;
    
    if (!Object.values(IntegrationAppTypeEnum).includes(appType)) {
      return res.status(400).json({ message: "Invalid app type" });
    }
    
    const { url } = await connectAppService(userId, appType);
    
    return res.status(200).json({
      url,
    });
  } catch (error) {
    console.error("Connect app error:", error);
    return res.status(500).json({ 
      message: "Server error while connecting app",
      error: error.message 
    });
  }
};

// Handle Google OAuth callback
const googleOAuthCallbackController = async (req, res) => {
  try {
    const { code, state } = req.query;
    const CLIENT_URL = `${process.env.FRONTEND_INTEGRATION_URL || 'http://localhost:3000/settings/integrations'}?app_type=google`;
    
    if (!code || typeof code !== "string") {
      return res.redirect(`${CLIENT_URL}&error=Invalid authorization`);
    }
    
    if (!state || typeof state !== "string") {
      return res.redirect(`${CLIENT_URL}&error=Invalid state parameter`);
    }
    
    const { userId, appType } = decodeState(state);
    
    if (!userId) {
      return res.redirect(`${CLIENT_URL}&error=UserId is required`);
    }
    
    // Exchange code for tokens
    const { tokens } = await googleOAuth2Client.getToken(code);
    
    if (!tokens.access_token) {
      return res.redirect(`${CLIENT_URL}&error=Access Token not passed`);
    }
    
    // Save the integration
    await createIntegrationService({
      userId: userId,
      provider: IntegrationProviderEnum.GOOGLE,
      category: IntegrationCategoryEnum.CALENDAR_AND_VIDEO_CONFERENCING,
      app_type: IntegrationAppTypeEnum.GOOGLE_MEET_AND_CALENDAR,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date || null,
      metadata: {
        scope: tokens.scope,
        token_type: tokens.token_type,
      },
    });
    
    return res.redirect(`${CLIENT_URL}&success=true`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return res.redirect(`${process.env.FRONTEND_INTEGRATION_URL || 'http://localhost:3000/settings/integrations'}?app_type=google&error=${encodeURIComponent(error.message)}`);
  }
};

// Disconnect an integration
const disconnectIntegrationController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { appType } = req.params;
    
    if (!Object.values(IntegrationAppTypeEnum).includes(appType)) {
      return res.status(400).json({ message: "Invalid app type" });
    }
    
    // Delete the integration from the database
    const pool = process.env.DATABASE_URL 
      ? new Pool({ connectionString: process.env.DATABASE_URL })
      : new Pool({
          user: process.env.DB_USER,
          host: process.env.DB_HOST,
          database: process.env.DB_NAME,
          password: process.env.DB_PASSWORD,
          port: process.env.DB_PORT,
        });
    
    const query = `
      DELETE FROM integrations
      WHERE user_id = $1 AND app_type = $2
      RETURNING id
    `;
    
    const result = await pool.query(query, [userId, appType]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Integration not found" });
    }
    
    return res.status(200).json({
      message: "Integration disconnected successfully",
      success: true,
    });
  } catch (error) {
    console.error("Disconnect integration error:", error);
    return res.status(500).json({ 
      message: "Server error while disconnecting integration",
      error: error.message 
    });
  }
};

module.exports = {
  getUserIntegrationsController,
  checkIntegrationController,
  connectAppController,
  disconnectIntegrationController,
  googleOAuthCallbackController
};
