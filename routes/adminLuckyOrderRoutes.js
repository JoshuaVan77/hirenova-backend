const express = require('express');
const router = express.Router();

// ✅ Import centralized secure admin authentication middleware
// (Token စစ်ဆေးတာ၊ Role စစ်ဆေးတာတွေကို ဒီတစ်နေရာတည်းမှာပဲ စီမံခန့်ခွဲထားပါတယ်)
const adminAuth = require('../middleware/auth');

// ✅ Import controller containing Lucky Order logic
const adminController = require('../controllers/adminController');

/**
 * @route   GET /api/admin/lucky-orders
 * @desc    Get all lucky orders
 * @access  Private (Admin)
 */
router.get('/', adminAuth, adminController.getLuckyOrders);

/**
 * @route   POST /api/admin/lucky-orders
 * @desc    Create a new lucky order
 * @access  Private (Admin)
 */
router.post('/', adminAuth, adminController.addLuckyOrder);

/**
 * @route   PUT /api/admin/lucky-orders/:id/cancel
 * @desc    Cancel a specific lucky order
 * @access  Private (Admin)
 */
router.put('/:id/cancel', adminAuth, adminController.cancelLuckyOrder);

module.exports = router;