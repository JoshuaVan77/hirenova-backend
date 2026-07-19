const express = require('express');
const router = express.Router();
const userTaskController = require('../controllers/userTaskController');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Token Verification Middleware
const verifyToken = (req, res, next) => {
  console.log('🔍 verifyToken middleware running...');
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    console.log('❌ No token provided in headers');
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded successfully. User ID:', decoded.userId);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.log('❌ Invalid token:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

console.log('✅✅✅ userTaskRoutes.js LOADED SUCCESSFULLY! ✅✅✅');

// 1. Get Today's Tasks
router.get('/today', verifyToken, (req, res) => {
  console.log('📍 ROUTE HIT: GET /today');
  userTaskController.getTodayTasks(req, res);
});

// 2. Get Today's Earnings
router.get('/earnings/today', verifyToken, (req, res) => {
  console.log('📍 ROUTE HIT: GET /earnings/today');
  userTaskController.getTodayEarnings(req, res);
});

// 3. Submit Completed Task
router.post('/submit', verifyToken, (req, res) => {
  console.log('📍📍 ROUTE HIT: POST /submit <--- THIS MUST PRINT! 📍📍');
  console.log('📦 REQUEST BODY:', req.body);
  userTaskController.submitTask(req, res);
});

// 4. Check Lucky Order
router.post('/check-lucky', verifyToken, (req, res) => {
  console.log('📍 ROUTE HIT: POST /check-lucky');
  userTaskController.checkLuckyOrder(req, res);
});

// ✅ 5. NEW: Acknowledge Lucky Order (User က Confirm နှိပ်တဲ့အခါ ခေါ်မယ်)
router.post('/acknowledge-lucky', verifyToken, (req, res) => {
  console.log('📍 ROUTE HIT: POST /acknowledge-lucky');
  userTaskController.acknowledgeLuckyOrder(req, res);
});

// 6. Get Unfinished Tasks (Pending Lucky Orders)
router.get('/unfinished', verifyToken, (req, res) => {
  console.log('📍 ROUTE HIT: GET /unfinished');
  userTaskController.getUnfinishedTasks(req, res);
});

// 7. Get Completed Tasks History
router.get('/completed', verifyToken, (req, res) => {
  console.log('📍 ROUTE HIT: GET /completed');
  userTaskController.getCompletedTasks(req, res);
});

module.exports = router;