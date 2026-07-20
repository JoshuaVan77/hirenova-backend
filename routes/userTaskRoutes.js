const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const userTaskController = require('../controllers/userTaskController');

// ==========================================
// User Token Verification Middleware
// ==========================================
const verifyUserToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // 1. Check if header exists and starts with 'Bearer '
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided or invalid format.' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // Controller က ဒီ req.userId ကို သုံးပါမယ်
    next();
  } catch (error) {
    // 3. Log error for server-side debugging (Railway Logs)
    console.error('❌ User Token Verification Failed:', error.name, error.message);
    
    // 4. Send specific, user-friendly error messages
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// ==========================================
// User Task Routes (All Protected)
// ==========================================

/**
 * @route   GET /api/user/tasks/today
 * @desc    Get random active tasks for today
 * @access  Private (User)
 */
router.get('/today', verifyUserToken, userTaskController.getTodayTasks);

/**
 * @route   GET /api/user/tasks/earnings/today
 * @desc    Get total earnings for today
 * @access  Private (User)
 */
router.get('/earnings/today', verifyUserToken, userTaskController.getTodayEarnings);

/**
 * @route   POST /api/user/tasks/submit
 * @desc    Submit a completed task (Handles normal & lucky orders)
 * @access  Private (User)
 */
router.post('/submit', verifyUserToken, userTaskController.submitTask);

/**
 * @route   POST /api/user/tasks/check-lucky
 * @desc    Check if current task is a lucky order
 * @access  Private (User)
 */
router.post('/check-lucky', verifyUserToken, userTaskController.checkLuckyOrder);

/**
 * @route   POST /api/user/tasks/acknowledge-lucky
 * @desc    User acknowledges a lucky order (moves status to pending)
 * @access  Private (User)
 */
router.post('/acknowledge-lucky', verifyUserToken, userTaskController.acknowledgeLuckyOrder);

/**
 * @route   GET /api/user/tasks/unfinished
 * @desc    Get pending lucky orders for the user
 * @access  Private (User)
 */
router.get('/unfinished', verifyUserToken, userTaskController.getUnfinishedTasks);

/**
 * @route   GET /api/user/tasks/completed
 * @desc    Get history of completed tasks
 * @access  Private (
</think>

အရမ်းကောင်းပါတယ်! `userTaskRoutes.js` ကို လက်ခံရရှိပါပြီ။ 

ဒီဖိုင်က User တွေ Task လုပ်တဲ့ အဓိက Route ဖြစ်တဲ့အတွက် အရေးကြီးပါတယ်။ လက်ရှိ Code မှာ Debugging အတွက် ထည့်ထားတဲ့ `console.log` တွေ အများကြီး ပါနေပါတယ်။ Production (Live) မှာ ဒီလို Log တွေ အများကြီးထွက်နေရင် Railway Logs ကို ဖတ်ရခက်စေသလို၊ Server Performance ကိုပါ အနည်းငယ် ထိခိုက်စေနိုင်ပါတယ်။

ထို့အပြင် Token Verification Middleware ကို ပိုမိုလုံခြုံစိတ်ချရအောင် (Bearer token format ကို စစ်ဆေးအောင်) နဲ့ Error Handling ကို ပိုကောင်းအောင် ပြင်ဆင်ပေးလိုက်ပါတယ်။

---

### ✅ **Complete Updated `userTaskRoutes.js` (Production Ready)**

ဒီ Code ကို Copy ကူးပြီး `backend/routes/userTaskRoutes.js` ဖိုင်တစ်ခုလုံးကို **အစားထိုး (Replace)** လိုက်ပါ။

```javascript
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const userTaskController = require('../controllers/userTaskController');

// ==========================================
// User Token Verification Middleware
// ==========================================
const verifyUserToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // 1. Check if header exists and starts with 'Bearer '
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided or invalid format.' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // Controller က ဒီ req.userId ကို သုံးပါမယ်
    next();
  } catch (error) {
    // 3. Log error for server-side debugging (Railway Logs)
    console.error('❌ User Token Verification Failed:', error.name, error.message);
    
    // 4. Send specific, user-friendly error messages
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// ==========================================
// User Task Routes (All Protected)
// ==========================================

/**
 * @route   GET /api/user/tasks/today
 * @desc    Get random active tasks for today
 * @access  Private (User)
 */
router.get('/today', verifyUserToken, userTaskController.getTodayTasks);

/**
 * @route   GET /api/user/tasks/earnings/today
 * @desc    Get total earnings for today
 * @access  Private (User)
 */
router.get('/earnings/today', verifyUserToken, userTaskController.getTodayEarnings);

/**
 * @route   POST /api/user/tasks/submit
 * @desc    Submit a completed task (Handles normal & lucky orders)
 * @access  Private (User)
 */
router.post('/submit', verifyUserToken, userTaskController.submitTask);

/**
 * @route   POST /api/user/tasks/check-lucky
 * @desc    Check if current task is a lucky order
 * @access  Private (User)
 */
router.post('/check-lucky', verifyUserToken, userTaskController.checkLuckyOrder);

/**
 * @route   POST /api/user/tasks/acknowledge-lucky
 * @desc    User acknowledges a lucky order (moves status to pending)
 * @access  Private (User)
 */
router.post('/acknowledge-lucky', verifyUserToken, userTaskController.acknowledgeLuckyOrder);

/**
 * @route   GET /api/user/tasks/unfinished
 * @desc    Get pending lucky orders for the user
 * @access  Private (User)
 */
router.get('/unfinished', verifyUserToken, userTaskController.getUnfinishedTasks);

/**
 * @route   GET /api/user/tasks/completed
 * @desc    Get history of completed tasks
 * @access  Private (User)
 */
router.get('/completed', verifyUserToken, userTaskController.getCompletedTasks);

module.exports = router;