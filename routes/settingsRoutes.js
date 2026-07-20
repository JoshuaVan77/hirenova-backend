const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// ✅ CRITICAL SECURITY FIX: Import the secure adminAuth middleware
const adminAuth = require('../middleware/auth');

/**
 * @route   GET /api/settings
 * @desc    Get all system settings (Required for User Website to check min_task_balance, etc.)
 * @access  Public
 */
router.get('/', settingsController.getSettings);

/**
 * @route   PUT /api/settings
 * @desc    Update system settings (Admin only)
 * @access  Private (Admin)
 */
router.put('/', adminAuth, settingsController.updateSettings);

module.exports = router;