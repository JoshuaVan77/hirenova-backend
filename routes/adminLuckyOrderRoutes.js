const express = require('express');
const router = express.Router();

// ✅ Import centralized secure admin authentication middleware
const adminAuth = require('../middleware/auth');

// ✅ Import controller containing Lucky Order logic
const adminController = require('../controllers/adminLuckyOrderController'); // ဖိုင်နာမည် မှန်ကန်ကြောင်း သေချာပါစေ

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
// ✅ FIX: 'addLuckyOrder' အစား Controller ထဲက နာမည်အတိုင်း 'createLuckyOrder' ကို ပြောင်းပါ
router.post('/', adminAuth, adminController.createLuckyOrder);

/**
 * @route   PUT /api/admin/lucky-orders/:id/cancel
 * @desc    Cancel a specific lucky order
 * @access  Private (Admin)
 */
router.put('/:id/cancel', adminAuth, adminController.cancelLuckyOrder);

module.exports = router;