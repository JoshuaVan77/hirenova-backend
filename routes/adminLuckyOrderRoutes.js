const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// ✅ FIX: adminController.js ကို တိုက်ရိုက် Import လုပ်ပါ 
// (ဘာလို့လဲဆိုတော့ getLuckyOrders, addLuckyOrder, cancelLuckyOrder တွေက ဒီဖိုင်ထဲမှာ ရှိနေလို့ပါ)
const adminController = require('../controllers/adminController');

// ✅ Secure Admin Authentication Middleware
const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // ၁။ Token ပါမပါ စစ်ဆေးခြင်း
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // ၂။ Token မှန်ကန်မှုကို စစ်ဆေးခြင်း
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ၃။ Token ထဲမှာ adminId ပါမပါ သေချာစစ်ဆေးခြင်း
    if (!decoded.adminId) {
      return res.status(403).json({ message: 'Invalid token payload. Admin ID not found.' });
    }

    // ၄။ Request ထဲကို Admin ID ကို သိမ်းဆည်းခြင်း
    req.adminId = decoded.adminId;
    req.user = decoded; // အခြား middleware တွေနဲ့ တစ်ထပ်တည်းဖြစ်အောင် ထည့်သွင်းထားခြင်း
    
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// ✅ Apply middleware to all routes
// GET: Lucky Order စာရင်းကို ဆွဲယူခြင်း
router.get('/', verifyAdminToken, adminController.getLuckyOrders);

// POST: Lucky Order အသစ်ထည့်သွင်းခြင်း
router.post('/', verifyAdminToken, adminController.addLuckyOrder);

// PUT: Lucky Order ကို Cancel လုပ်ခြင်း
router.put('/:id/cancel', verifyAdminToken, adminController.cancelLuckyOrder);

module.exports = router;