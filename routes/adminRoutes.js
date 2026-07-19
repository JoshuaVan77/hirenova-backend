const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin Auth
router.post('/login', adminController.login);

// User Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:id', adminController.updateUser);

// Top-up Requests
router.get('/topup-requests', adminController.getTopupRequests);
router.put('/topup-requests/:id', adminController.updateTopupRequest);

// Withdraw Requests
router.get('/withdraw-requests', adminController.getWithdrawRequests);
router.put('/withdraw-requests/:id', adminController.updateWithdrawRequest);

// Tasks
router.get('/tasks', adminController.getTasks);
router.post('/tasks', adminController.addTask);

// Lucky Orders
router.get('/lucky-orders', adminController.getLuckyOrders);
router.post('/lucky-orders', adminController.addLuckyOrder);

// Invite Codes
router.get('/invite-codes', adminController.getInviteCodes);
router.post('/invite-codes', adminController.createInviteCode);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;