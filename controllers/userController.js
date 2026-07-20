const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

// ==========================================
// 1. Get User Profile
// ==========================================
exports.getProfile = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, phone, email, full_name, nickname, balance, credit_score, trc20_address, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ user: users[0] });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ message: 'Server error', details: error.sqlMessage || error.message });
  }
};

// ==========================================
// 2. Submit Top-up Request
// ==========================================
exports.requestTopup = async (req, res) => {
  try {
    const { amount, trc20_address } = req.body;
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid top-up amount' });
    }

    await pool.query(
      'INSERT INTO transactions (user_id, type, amount, trc20_address, status, created_at) VALUES (?, "topup", ?, ?, "pending", NOW())',
      [req.userId, parsedAmount, trc20_address || '']
    );
    res.status(201).json({ message: 'Top-up request submitted successfully' });
  } catch (error) {
    console.error('Top-up Error:', error);
    res.status(500).json({ message: 'Server error', details: error.sqlMessage || error.message });
  }
};

// ==========================================
// 3. Submit Withdraw Request (WITH TRANSACTION)
// ==========================================
exports.requestWithdraw = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { amount, trc20_address, payment_password } = req.body;
    const userId = req.userId;
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid withdraw amount' });
    }

    await connection.beginTransaction();

    // Step 1: Get user data
    const [users] = await connection.query('SELECT payment_password, balance FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Step 2: Verify payment password
    const isValid = await bcrypt.compare(payment_password, users[0].payment_password);
    if (!isValid) {
      await connection.rollback();
      return res.status(400).json({ message: 'Invalid payment password' });
    }
    
    // Step 3: Check balance
    if (parseFloat(users[0].balance) < parsedAmount) {
      await connection.rollback();
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // Step 4: Check if completed 40 tasks today
    const today = new Date().toISOString().split('T')[0];
    const [taskCount] = await connection.query(
      'SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ? AND date = ? AND status = "completed"',
      [userId, today]
    );
    
    if (taskCount[0].count < 40) {
      await connection.rollback();
      return res.status(400).json({ message: 'You must complete 40 tasks today to withdraw' });
    }
    
    // Step 5: Insert withdraw request
    await connection.query(
      'INSERT INTO transactions (user_id, type, amount, trc20_address, status, created_at) VALUES (?, "withdraw", ?, ?, "pending", NOW())',
      [userId, parsedAmount, trc20_address || '']
    );
    
    // Step 6: Deduct balance immediately
    await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [parsedAmount, userId]);
    
    await connection.commit();
    res.status(201).json({ message: 'Withdraw request submitted successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Withdraw Error:', error);
    res.status(500).json({ message: 'Server error', details: error.sqlMessage || error.message });
  } finally {
    connection.release();
  }
};

// ==========================================
// 4. Get Top-up History
// ==========================================
exports.getTopupHistory = async (req, res) => {
  try {
    const [records] = await pool.query(
      'SELECT * FROM transactions WHERE user_id = ? AND type IN ("topup", "lucky_order_topup") ORDER BY created_at DESC',
      [req.userId]
    );
    res.status(200).json({ records: records || [] });
  } catch (error) {
    console.error('Get Top-up History Error:', error);
    res.status(500).json({ message: 'Server error', details: error.sqlMessage || error.message });
  }
};

// ==========================================
// 5. Get Withdraw History
// ==========================================
exports.getWithdrawHistory = async (req, res) => {
  try {
    const [records] = await pool.query(
      'SELECT * FROM transactions WHERE user_id = ? AND type = "withdraw" ORDER BY created_at DESC',
      [req.userId]
    );
    res.status(200).json({ records: records || [] });
  } catch (error) {
    console.error('Get Withdraw History Error:', error);
    res.status(500).json({ message: 'Server error', details: error.sqlMessage || error.message });
  }
};