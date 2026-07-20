const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const userController = require('../controllers/userController');

// ==========================================
// User Token Verification Middleware
// ==========================================
const verifyUserToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided or invalid format.' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('❌ User Token Verification Failed:', error.name, error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// ==========================================
// User Routes (All Protected)
// ==========================================

/**
 * @route   GET /api/user/profile
 * @desc    Get current user profile
 * @access  Private (User)
 */
router.get('/profile', verifyUserToken, userController.getProfile);

/**
 * @route   POST /api/user/topup
 * @desc    Submit a top-up request
 * @access  Private (User)
 */
router.post('/topup', verifyUserToken, userController.requestTopup);

/**
 * @route   POST /api/user/withdraw
 * @desc    Submit a withdraw request (Checks 40 tasks & payment password)
 * @access  Private (User)
 */
router.post('/withdraw', verifyUserToken, userController.requestWithdraw);

/**
 * @route   GET /api/user/topup-history
 * @desc    Get user's top-up history
 * @access  Private (User)
 */
router.get('/topup-history', verifyUserToken, userController.getTopupHistory);

/**
 * @route   GET /api/user/withdraw-history
 * @desc    Get user's withdraw history
 * @access  Private (User)
 */
router.get('/withdraw-history', verifyUserToken, userController.getWithdrawHistory);

module.exports = router;