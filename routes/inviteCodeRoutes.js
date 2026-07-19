const express = require('express');
const router = express.Router();
const inviteCodeController = require('../controllers/inviteCodeController');
const jwt = require('jsonwebtoken');

// Admin Token Verify (Optional fallback)
const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    req.adminId = 1; 
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    req.adminId = 1;
    next();
  }
};

router.get('/', verifyAdminToken, inviteCodeController.getInviteCodes);
router.post('/', verifyAdminToken, inviteCodeController.createInviteCode);
router.put('/:id', verifyAdminToken, inviteCodeController.toggleInviteCode);

module.exports = router;