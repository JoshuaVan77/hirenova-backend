const express = require('express');
const router = express.Router();
const inviteCodeController = require('../controllers/inviteCodeController');

// ✅ CRITICAL SECURITY FIX: Use the centralized, secure adminAuth middleware
// Token မရှိရင် သို့မဟုတ် မမှန်ရင် 401 Unauthorized ပြန်ပို့ပါလိမ့်မယ်။ (Admin ID 1 ကို အလိုအလျောက် မပေးတော့ပါ)
const adminAuth = require('../middleware/auth');

/**
 * @route   GET /api/invite-codes
 * @desc    Get all invite codes (Admin only)
 * @access  Private (Admin)
 */
router.get('/', adminAuth, inviteCodeController.getInviteCodes);

/**
 * @route   POST /api/invite-codes
 * @desc    Create a new invite code (Admin only)
 * @access  Private (Admin)
 */
router.post('/', adminAuth, inviteCodeController.createInviteCode);

/**
 * @route   PUT /api/invite-codes/:id
 * @desc    Toggle invite code status (Active/Inactive) (Admin only)
 * @access  Private (Admin)
 */
router.put('/:id', adminAuth, inviteCodeController.toggleInviteCode);

module.exports = router;