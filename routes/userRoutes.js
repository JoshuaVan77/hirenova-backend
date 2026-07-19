const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Middleware: Token Verify
const verifyToken = (req, res, next) => {
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

// 1. Get User Profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, phone, email, full_name, nickname, balance, credit_score, trc20_address, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ user: users[0] });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. Submit Top-up Request
router.post('/topup', verifyToken, async (req, res) => {
  try {
    const { amount, trc20_address } = req.body;
    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, trc20_address, status, created_at) VALUES (?, "topup", ?, ?, "pending", NOW())',
      [req.userId, amount, trc20_address]
    );
    res.status(201).json({ message: 'Top-up request submitted' });
  } catch (error) {
    console.error('Top-up Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 3. Submit Withdraw Request (with Payment Password & 40 Tasks Check)
router.post('/withdraw', verifyToken, async (req, res) => {
  try {
    const { amount, trc20_address, payment_password } = req.body;
    const userId = req.userId;
    
    // Step 1: Get user data
    const [users] = await pool.query('SELECT payment_password, balance FROM users WHERE id = ?', [userId]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    
    // Step 2: Verify payment password
    const isValid = await bcrypt.compare(payment_password, users[0].payment_password);
    if (!isValid) {
      console.log('❌ Invalid payment password for user:', userId);
      return res.status(400).json({ message: 'Invalid payment password' });
    }
    
    // Step 3: Check balance
    if (parseFloat(users[0].balance) < parseFloat(amount)) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // Step 4: ✅ Check if completed 40 tasks today
    const today = new Date().toISOString().split('T')[0];
    const [taskCount] = await pool.query(
      'SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ? AND date = ? AND status = "completed"',
      [userId, today]
    );
    
    if (taskCount[0].count < 40) {
      console.log('❌ Withdrawal blocked: Only', taskCount[0].count, '/ 40 tasks completed');
      return res.status(400).json({ message: 'You must complete 40 tasks today to withdraw' });
    }
    
    // Step 5: Insert withdraw request
    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, trc20_address, status, created_at) VALUES (?, "withdraw", ?, ?, "pending", NOW())',
      [userId, amount, trc20_address]
    );
    
    // Step 6: Deduct balance immediately
    await pool.query('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);
    
    console.log('✅ Withdraw request submitted successfully for user:', userId);
    res.status(201).json({ message: 'Withdraw request submitted successfully' });
  } catch (error) {
    console.error('❌ Withdraw Error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// 4. Get Top-up History
router.get('/topup-history', verifyToken, async (req, res) => {
  try {
    const [records] = await pool.query(
      'SELECT * FROM transactions WHERE user_id = ? AND type = "topup" ORDER BY created_at DESC',
      [req.userId]
    );
    res.status(200).json({ records });
  } catch (error) {
    console.error('Get Top-up History Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 5. Get Withdraw History
router.get('/withdraw-history', verifyToken, async (req, res) => {
  try {
    const [records] = await pool.query(
      'SELECT * FROM transactions WHERE user_id = ? AND type = "withdraw" ORDER BY created_at DESC',
      [req.userId]
    );
    res.status(200).json({ records });
  } catch (error) {
    console.error('Get Withdraw History Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;