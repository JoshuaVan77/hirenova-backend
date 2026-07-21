const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// ✅ CRITICAL SECURITY FIX: Import the secure adminAuth middleware
const adminAuth = require('../middleware/auth');

// ==========================================
// Admin Authentication (Public - No Auth Required)
// ==========================================
/**
 * @route   POST /api/admin/login
 * @desc    Authenticate admin and return JWT Token
 * @access  Public
 */
router.post('/login', adminController.login);

// ==========================================
// Admin Profile & Credentials Management (Protected)
// ==========================================
/**
 * @route   PUT /api/admin/change-password
 * @desc    Change Admin Password
 * @access  Private (Admin)
 */
router.put('/change-password', adminAuth, adminController.changeAdminPassword);

/**
 * @route   PUT /api/admin/update-username
 * @desc    Update Admin Username
 * @access  Private (Admin)
 */
router.put('/update-username', adminAuth, adminController.updateAdminUsername);

/**
 * @route   PUT /api/admin/update-profile
 * @desc    Update Admin Profile (Username & Password together)
 * @access  Private (Admin)
 */
router.put('/update-profile', adminAuth, adminController.updateAdminProfile);

// ==========================================
// User Management (Protected)
// ==========================================
router.get('/users', adminAuth, adminController.getAllUsers);
router.put('/users/:id', adminAuth, adminController.updateUser);

// ==========================================
// Transaction Management (Protected)
// ==========================================
router.get('/topup-requests', adminAuth, adminController.getTopupRequests);
router.put('/topup-requests/:id', adminAuth, adminController.updateTopupRequest);

router.get('/withdraw-requests', adminAuth, adminController.getWithdrawRequests);
router.put('/withdraw-requests/:id', adminAuth, adminController.updateWithdrawRequest);

// ==========================================
// Task Management (Protected)
// ==========================================
router.get('/tasks', adminAuth, adminController.getTasks);
router.post('/tasks', adminAuth, adminController.addTask);

// ==========================================
// Lucky Order Management (Protected)
// ==========================================
router.get('/lucky-orders', adminAuth, adminController.getLuckyOrders);
router.post('/lucky-orders', adminAuth, adminController.addLuckyOrder);
router.put('/lucky-orders/:id/cancel', adminAuth, adminController.cancelLuckyOrder);

// ==========================================
// Invite Code Management (Protected)
// ==========================================
router.get('/invite-codes', adminAuth, adminController.getInviteCodes);
router.post('/invite-codes', adminAuth, adminController.createInviteCode);

// ==========================================
// System Settings (Protected)
// ==========================================
router.get('/settings', adminAuth, adminController.getSettings);
router.put('/settings', adminAuth, adminController.updateSettings);

module.exports = router;