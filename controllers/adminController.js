const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Helper function to get Admin ID safely from request
const getAdminId = (req) => {
  return req.user?.adminId || req.admin?.adminId || req.adminId || null;
};

// ==========================================
// Admin Authentication
// ==========================================
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const [admins] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (admins.length === 0) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const admin = admins[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { adminId: admin.id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...adminWithoutPassword } = admin;

    res.status(200).json({
      message: 'Login successful',
      token,
      admin: adminWithoutPassword
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==========================================
// User Management
// ==========================================
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, phone, email, full_name, nickname, balance, credit_score, is_banned, created_at FROM users ORDER BY created_at DESC');
    res.status(200).json({ users });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });

    const { credit_score, balance, login_password, payment_password, is_banned } = req.body;
    let updates = [];
    let values = [];

    if (credit_score !== undefined) { updates.push('credit_score = ?'); values.push(credit_score); }
    if (balance !== undefined) { updates.push('balance = ?'); values.push(balance); }
    if (is_banned !== undefined) { updates.push('is_banned = ?'); values.push(is_banned); }
    if (login_password) { 
      updates.push('password = ?'); 
      values.push(await bcrypt.hash(login_password, 10)); 
    }
    if (payment_password) { 
      updates.push('payment_password = ?'); 
      values.push(await bcrypt.hash(payment_password, 10)); 
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    values.push(userId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};

// ==========================================
// Transaction Management (Top-up & Withdraw)
// ==========================================
exports.getTopupRequests = async (req, res) => {
  try {
    const [requests] = await pool.query(`
      SELECT t.*, u.phone, u.full_name 
      FROM transactions t 
      JOIN users u ON t.user_id = u.id 
      WHERE t.type IN ('topup', 'lucky_order_topup')
      ORDER BY t.created_at DESC
    `);
    res.status(200).json({ requests });
  } catch (error) {
    console.error('Get Topup Requests Error:', error);
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};

// ⚠️ CRITICAL PRODUCTION FIX: Wrapped in Database Transaction to prevent partial updates
exports.updateTopupRequest = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const transactionId = parseInt(req.params.id, 10);
    const { status, admin_note } = req.body;
    const adminId = getAdminId(req);

    await connection.beginTransaction();

    // ၁။ Transaction အခြေအနေကို Update လုပ်မယ်
    await connection.query(
      'UPDATE transactions SET status = ?, admin_note = ?, approved_by = ?, updated_at = NOW() WHERE id = ?',
      [status, admin_note || '', adminId, transactionId]
    );

    // ၂။ Approved ဖြစ်ပါက User Balance ထဲသို့ ပိုက်ဆံအလိုအလျောက် ထည့်ပေးမယ်
    if (status === 'approved') {
      const [transactions] = await connection.query(
        'SELECT user_id, amount FROM transactions WHERE id = ?', 
        [transactionId]
      );
      
      if (transactions.length > 0) {
        const userId = transactions[0].user_id;
        const topupAmount = parseFloat(transactions[0].amount || 0);
        
        // Top-up ပိုက်ဆံကို Balance ထဲထည့်မယ်
        await connection.query(
          'UPDATE users SET balance = balance + ? WHERE id = ?',
          [topupAmount, userId]
        );

        // ၃။ ✅ Lucky Order Auto-Complete Logic
        const [pendingLuckyOrders] = await connection.query(
          'SELECT id, task_number, amount, commission FROM lucky_orders WHERE user_id = ? AND status = "pending" ORDER BY created_at ASC LIMIT 1',
          [userId]
        );
        
        if (pendingLuckyOrders.length > 0) {
          const luckyOrder = pendingLuckyOrders[0];
          const commission = parseFloat(luckyOrder.commission || 0);
          const today = new Date().toISOString().split('T')[0];
          const orderNo = `LUCKY-${Date.now()}`;
          
          // (က) Lucky Order Status ကို "completed" သို့ ပြောင်းမယ်
          await connection.query(
            'UPDATE lucky_orders SET status = "completed", completed_at = NOW() WHERE id = ?',
            [luckyOrder.id]
          );
          
          // (ခ) Lucky Order Commission ကို User Balance ထဲ ထပ်ထည့်ပေးမယ်
          await connection.query(
            'UPDATE users SET balance = balance + ? WHERE id = ?',
            [commission, userId]
          );
          
          // (ဂ) Today's Earnings ထဲမှာ ပါလာအောင် user_tasks table ထဲကို မှတ်တမ်းတင်မယ်
          await connection.query(
            `INSERT INTO user_tasks (user_id, task_id, task_number, order_no, order_amount, commission, is_lucky_order, lucky_order_amount, status, date, completed_at) 
             VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'completed', ?, NOW())`,
            [
              userId, 
              luckyOrder.task_number, 
              luckyOrder.task_number, 
              orderNo, 
              luckyOrder.amount, 
              commission, 
              luckyOrder.amount, 
              today
            ]
          );
        }
      }
    }

    await connection.commit();
    res.status(200).json({ message: `Request ${status} successfully` });

  } catch (error) {
    await connection.rollback(); // Error တက်ရင် အကုန်ပြန် Cancel လုပ်မယ်
    console.error('❌ Update Topup Error:', error);
    res.status(500).json({ message: 'Server error: ' + (error.sqlMessage || error.message) });
  } finally {
    connection.release(); // Connection ကို ပြန်လွှတ်ပေးမယ်
  }
};

exports.getWithdrawRequests = async (req, res) => {
  try {
    const [requests] = await pool.query(`
      SELECT t.*, u.phone, u.full_name 
      FROM transactions t 
      JOIN users u ON t.user_id = u.id 
      WHERE t.type = 'withdraw' 
      ORDER BY t.created_at DESC
    `);
    res.status(200).json({ requests });
  } catch (error) {
    console.error('Get Withdraw Requests Error:', error);
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};

exports.updateWithdrawRequest = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id, 10);
    const { status, admin_note } = req.body;
    const adminId = getAdminId(req);

    await pool.query(
      'UPDATE transactions SET status = ?, admin_note = ?, approved_by = ?, updated_at = NOW() WHERE id = ?',
      [status, admin_note, adminId, transactionId]
    );

    res.status(200).json({ message: `Request ${status} successfully` });
  } catch (error) {
    console.error('Update Withdraw Error:', error);
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};

// ==========================================
// Task Management
// ==========================================
exports.getTasks = async (req, res) => {
  try {
    const [tasks] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.status(200).json({ tasks });
  } catch (error) {
    console.error('Get Tasks Error:', error);
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};

exports.addTask = async (req, res) => {
  try {
    const { hotel_name, hotel_image, description, order_amount, commission } = req.body;
    const [result] = await pool.query(
      'INSERT INTO tasks (hotel_name, hotel_image, description, order_amount, commission) VALUES (?, ?, ?, ?, ?)',
      [hotel_name, hotel_image, description, parseFloat(order_amount), parseFloat(commission)]
    );
    res.status(201).json({ message: 'Task added successfully', taskId: result.insertId });
  } catch (error) {
    console.error('Add Task Error:', error);
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};

// ==========================================
// Lucky Order Management
// ==========================================
exports.getLuckyOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT lo.*, u.full_name, u.phone, u.id as user_id, t.hotel_name, t.hotel_image 
      FROM lucky_orders lo
      LEFT JOIN users u ON lo.user_id = u.id
      LEFT JOIN tasks t ON lo.task_number = t.id
      ORDER BY lo.created_at DESC
    `);
    res.status(200).json({ orders });
  } catch (error) {
    console.error('Get Lucky Orders Error:', error);
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};

exports.addLuckyOrder = async (req, res) => {
  try {
    const { user_id, task_number, amount, commission } = req.body;
    const adminId = getAdminId(req);

    if (!user_id || !task_number || !amount || !commission) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [parseInt(user_id, 10)]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });

    const [tasks] = await pool.query('SELECT id FROM tasks WHERE id = ?', [parseInt(task_number, 10)]);
    if (tasks.length === 0) return res.status(404).json({ message: 'Task not found' });

    const [result] = await pool.query(
      'INSERT INTO lucky_orders (user_id, task_number, amount, commission, created_by, status) VALUES (?, ?, ?, ?, ?, ?)',
      [parseInt(user_id, 10), parseInt(task_number, 10), parseFloat(amount), parseFloat(commission), adminId, 'pending']
    );
    
    res.status(201).json({ message: 'Lucky order added successfully', orderId: result.insertId });
  } catch (error) {
    console.error('Add Lucky Order Error:', error);
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};

exports.cancelLuckyOrder = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    await pool.query('UPDATE lucky_orders SET status = ? WHERE id = ?', ['cancelled', orderId]);
    res.status(200).json({ message: 'Lucky order cancelled successfully' });
  } catch (error) {
    console.error('Cancel Lucky Order Error:', error);
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};

// ==========================================
// Invite Code Management
// ==========================================
exports.getInviteCodes = async (req, res) => {
  try {
    const [codes] = await pool.query('SELECT * FROM invite_codes ORDER BY created_at DESC');
    res.status(200).json({ codes });
  } catch (error) {
    console.error('Get Invite Codes Error:', error);
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};

exports.createInviteCode = async (req, res) => {
  try {
    const { code, max_uses } = req.body;
    const adminId = getAdminId(req);

    if (!adminId) return res.status(401).json({ message: 'Admin authentication failed' });
    if (!code) return res.status(400).json({ message: 'Invite code is required' });

    const safeMaxUses = parseInt(max_uses, 10) || 10; // Default to 10 if not provided

    const [result] = await pool.query(
      'INSERT INTO invite_codes (code, created_by, max_uses) VALUES (?, ?, ?)',
      [code, adminId, safeMaxUses]
    );
    res.status(201).json({ message: 'Invite code created successfully', codeId: result.insertId });
  } catch (error) {
    console.error('Create Invite Code Error:', error);
    // Duplicate entry error handling
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'This invite code already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};

// ==========================================
// System Settings
// ==========================================
exports.getSettings = async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM settings');
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });
    res.status(200).json({ settings: settingsObj });
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value, value]
      );
    }
    res.status(200).json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update Settings Error:', error);
    res.status(500).json({ message: 'Server error', error: error.sqlMessage });
  }
};