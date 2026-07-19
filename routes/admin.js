const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/auth'); // ✅ Middleware import
const {
  login,
  getAllUsers,
  updateUser,
  getTopupRequests,
  updateTopupRequest,
  getWithdrawRequests,
  updateWithdrawRequest,
  getTasks,
  addTask,
  getLuckyOrders,
  addLuckyOrder,
  getInviteCodes,
  createInviteCode,
  getSettings,
  updateSettings
} = require('../controllers/adminController');

// Login route (no auth needed)
router.post('/login', login);

// Protected routes (auth needed)
router.get('/users', adminAuth, getAllUsers);
router.put('/users/:id', adminAuth, updateUser);

router.get('/topup-requests', adminAuth, getTopupRequests);
router.put('/topup-requests/:id', adminAuth, updateTopupRequest);

router.get('/withdraw-requests', adminAuth, getWithdrawRequests);
router.put('/withdraw-requests/:id', adminAuth, updateWithdrawRequest);

router.get('/tasks', adminAuth, getTasks);
router.post('/tasks', adminAuth, addTask);

router.get('/lucky-orders', adminAuth, getLuckyOrders);
router.post('/lucky-orders', adminAuth, addLuckyOrder); // ✅ Auth middleware added

router.get('/invite-codes', adminAuth, getInviteCodes);
router.post('/invite-codes', adminAuth, createInviteCode);

router.get('/settings', adminAuth, getSettings);
router.put('/settings', adminAuth, updateSettings);

module.exports = router;