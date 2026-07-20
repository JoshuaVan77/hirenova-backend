const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const upload = require('../config/upload');
const chatController = require('../controllers/chatController');

// ✅ Import the centralized, secure adminAuth middleware
const adminAuth = require('../middleware/auth');

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
    req.userId = decoded.userId; 
    next();
  } catch (error) {
    // 3. Log error for server-side debugging
    console.error('❌ User Token Verification Failed:', error.name, error.message);
    
    // 4. Send specific, user-friendly error messages
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// ==========================================
// User Chat Routes (Protected)
// ==========================================

/**
 * @route   GET /api/chat/messages
 * @desc    Get user's chat messages
 * @access  Private (User)
 */
router.get('/messages', verifyUserToken, chatController.getUserMessages);

/**
 * @route   POST /api/chat/send
 * @desc    Send a message (text or image) from user
 * @access  Private (User)
 */
router.post('/send', verifyUserToken, upload.single('image'), chatController.sendMessage);

// ==========================================
// Admin Chat Routes (Protected)
// ==========================================

/**
 * @route   GET /api/chat/conversations
 * @desc    Get all user conversations for admin dashboard
 * @access  Private (Admin)
 */
router.get('/conversations', adminAuth, chatController.getConversations);

/**
 * @route   GET /api/chat/messages/:userId
 * @desc    Get specific user's chat messages (Admin view)
 * @access  Private (Admin)
 */
router.get('/messages/:userId', adminAuth, chatController.getUserChatMessages);

/**
 * @route   POST /api/chat/reply
 * @desc    Send a reply from admin to user
 * @access  Private (Admin)
 */
router.post('/reply', adminAuth, chatController.sendAdminReply);

/**
 * @route   POST /api/chat/mark-read
 * @desc    Mark user's messages as read when admin opens the chat
 * @access  Private (Admin)
 */
router.post('/mark-read', adminAuth, chatController.markMessagesAsRead);

module.exports = router;