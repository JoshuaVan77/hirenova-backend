const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const jwt = require('jsonwebtoken');
const upload = require('../config/upload');

// User Token Verify
const verifyUserToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin Token Verify
const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    req.adminId = 1; // Default admin fallback
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    req.adminId = 1; // Fallback on error
    next();
  }
};

// User Routes
router.get('/messages', verifyUserToken, chatController.getUserMessages);
router.post('/send', verifyUserToken, upload.single('image'), chatController.sendMessage);

// Admin Routes
router.get('/conversations', verifyAdminToken, chatController.getConversations);
router.get('/messages/:userId', verifyAdminToken, chatController.getUserChatMessages);
router.post('/reply', verifyAdminToken, chatController.sendAdminReply);

// ✅ NEW: Mark messages as read (Admin က conversation ကို ဖွင့်ကြည့်တဲ့အခါ ခေါ်မယ်)
router.post('/mark-read', verifyAdminToken, chatController.markMessagesAsRead);

module.exports = router;