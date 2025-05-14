const express = require('express');
const { 
  getUserIntegrationsController, 
  checkIntegrationController, 
  connectAppController, 
  disconnectIntegrationController,
  googleOAuthCallbackController 
} = require('../controllers/integration.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user integrations
router.get('/all', authenticateToken, getUserIntegrationsController);

// Check if a specific integration is connected
router.get('/check/:appType', authenticateToken, checkIntegrationController);

// Connect to a specific app (Google, Zoom, etc.)
router.get('/connect/:appType', authenticateToken, connectAppController);

// Disconnect a specific integration
router.delete('/disconnect/:appType', authenticateToken, disconnectIntegrationController);

// Google OAuth callback handler
router.get('/google/callback', googleOAuthCallbackController);

module.exports = router;
