const express = require('express');
const router = express.Router();

// ✅ Import centralized secure admin authentication middleware
const adminAuth = require('../middleware/auth');

// ✅ FIX: မှန်ကန်တဲ့ Controller ဖိုင်ကို ချိတ်ဆက်ပါ
const luckyOrderController = require('../controllers/adminLuckyOrderController');

/**
 * @route   GET /api/admin/lucky-orders
 * @desc    Get all lucky orders
 * @access  Private (Admin)
 */
router.get('/', adminAuth, luckyOrderController.getLuckyOrders);

/**
 * @route   POST /api/admin/lucky-orders
 * @desc    Create a new lucky order
 * @access  Private (Admin)
 */
// ✅ FIX: createLuckyOrder function ကို ခေါ်သုံးပါ
router.post('/', adminAuth, luckyOrderController.createLuckyOrder);

/**
 * @route   PUT /api/admin/lucky-orders/:id/cancel
 * @desc    Cancel a specific lucky order
 * @access  Private (Admin)
 */
router.put('/:id/cancel', adminAuth, luckyOrderController.cancelLuckyOrder);

module.exports = router;