const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// ✅ CRITICAL SECURITY FIX: Use the centralized, secure adminAuth middleware
// Token မရှိရင် သို့မဟုတ် မမှန်ရင် 401 Unauthorized ပြန်ပို့ပါလိမ့်မယ်။ (Admin ID 1 ကို အလိုအလျောက် မပေးတော့ပါ)
const adminAuth = require('../middleware/auth');

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics (Total users, pending topups, revenue, recent transactions)
 * @access  Private (Admin)
 */
router.get('/stats', adminAuth, dashboardController.getDashboardStats);

module.exports = router;