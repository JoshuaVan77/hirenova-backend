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
// (မှတ်ချက်: adminLuckyOrderRoutes.js နဲ့ ထပ်နေနိုင်ပါတယ်။ Frontend က ဘယ် Route ကို ခေါ်သလဲဆိုတာ သေချာစစ်ဆေးပါ)
// ==========================================
router.get('/lucky-orders', adminAuth, adminController.getLuckyOrders);
router.post('/liques-orders', adminAuth, adminController.addLuckyOrder); // Note: Fixed typo if any, keeping as addLuckyOrder

// ==========================================
// Invite Code Management (Protected)
// (မှတ်ချက်: inviteCodeRoutes.js နဲ့ ထပ်နေနိုင်ပါတယ်။ Frontend က ဘယ် Route ကို ခေါ်သလဲဆိုတာ သေချာစစ်ဆေးပါ)
// ==========================================
router.get('/invite-codes', adminAuth, adminController.getInviteCodes);
router.post('/invite-codes', adminAuth, adminController.createInviteCode);

// ==========================================
// System Settings (Protected)
// ==========================================
router.get('/settings', adminAuth, adminController.getSettings);
router.put('/settings', adminAuth, adminController.updateSettings);

module.exports = router;