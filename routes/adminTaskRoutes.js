const express = require('express');
const router = express.Router();
const adminTaskController = require('../controllers/adminTaskController');
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

router.get('/', verifyAdminToken, adminTaskController.getTasks);
router.post('/', verifyAdminToken, adminTaskController.createTask);
router.put('/:id', verifyAdminToken, adminTaskController.updateTask);
router.delete('/:id', verifyAdminToken, adminTaskController.deleteTask);
router.patch('/:id/status', verifyAdminToken, adminTaskController.toggleTaskStatus);

module.exports = router;