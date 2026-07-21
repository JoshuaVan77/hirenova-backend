const express = require('express');
const router = express.Router();

// ✅ Safely Import Middleware (Handles both default exports & named exports)
const authModule = require('../middleware/auth');
const adminAuth = typeof authModule === 'function' 
  ? authModule 
  : (authModule.adminAuth || authModule.verifyAdmin || authModule.authenticateToken || authModule);

// ✅ Import Admin Lucky Order Controller
const adminController = require('../controllers/adminLuckyOrderController');

// Safety Check: Throw readable error in console if controller functions are missing
if (!adminController.getLuckyOrders || !adminController.createLuckyOrder || !adminController.cancelLuckyOrder) {
  console.error('❌ ERROR: One or more controller functions in adminLuckyOrderController are undefined!');
}

/**
 * @route   GET /api/admin/lucky-orders
 * @desc    Get all lucky orders with user and admin details
 * @access  Private (Admin)
 */
router.get('/', adminAuth, adminController.getLuckyOrders);

/**
 * @route   POST /api/admin/lucky-orders
 * @desc    Create/Assign a new lucky order to a user
 * @access  Private (Admin)
 */
router.post('/', adminAuth, adminController.createLuckyOrder);

/**
 * @route   PUT /api/admin/lucky-orders/:id/cancel
 * @desc    Cancel a pending/assigned lucky order
 * @access  Private (Admin)
 */
router.put('/:id/cancel', adminAuth, adminController.cancelLuckyOrder);

module.exports = router;