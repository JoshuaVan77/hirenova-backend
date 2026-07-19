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
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { credit_score, balance, login_password, payment_password, is_banned } = req.body;

    let updates = [];
    let values = [];

    if (credit_score !== undefined) {
      updates.push('credit_score = ?');
      values.push(credit_score);
    }
    if (balance !== undefined) {
      updates.push('balance = ?');
      values.push(balance);
    }
    if (is_banned !== undefined) {
      updates.push('is_banned = ?');
      values.push(is_banned);
    }
    if (login_password) {
      const hashedPassword = await bcrypt.hash(login_password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }
    if (payment_password) {
      const hashedPaymentPassword = await bcrypt.hash(payment_password, 10);
      updates.push('payment_password = ?');
      values.push(hashedPaymentPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    values.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ message: 'Server error' });
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
      WHERE t.type = 'topup' OR t.type = 'lucky_order_topup'
      ORDER BY t.created_at DESC
    `);
    res.status(200).json({ requests });
  } catch (error) {
    console.error('Get Topup Requests Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTopupRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body;
    const adminId = getAdminId(req);

    console.log("🔍 Updating transaction ID:", id, "with status:", status, "adminId:", adminId);

    // ၁။ Transaction အခြေအနေကို Update လုပ်မယ်
    await pool.query(
      'UPDATE transactions SET status = ?, admin_note = ?, approved_by = ?, updated_at = NOW() WHERE id = ?',
      [status, admin_note || '', adminId, id]
    );

    // ၂။ Approved ဖြစ်ပါက User Balance ထဲသို့ ပိုက်ဆံအလိုအလျောက် ထည့်ပေးမယ်
    if (status === 'approved') {
      const [transaction] = await pool.query(
        'SELECT user_id, amount FROM transactions WHERE id = ?', 
        [id]
      );
      
      if (transaction.length > 0) {
        const userId = transaction[0].user_id;
        const topupAmount = parseFloat(transaction[0].amount || 0);
        
        console.log(`💰 Adding top-up amount ${topupAmount} to user ${userId} balance...`);
        
        // Top-up ပိုက်ဆံကို Balance ထဲထည့်မယ်
        await pool.query(
          'UPDATE users SET balance = balance + ? WHERE id = ?',
          [topupAmount, userId]
        );

        // ၃။ ✅ Lucky Order Auto-Complete Logic
        // ဤ User တွင် Pending ဖြစ်နေသော Lucky Order ရှိမရှိ စစ်ဆေးမယ်
        const [pendingLuckyOrders] = await pool.query(
          'SELECT id, task_number, amount, commission FROM lucky_orders WHERE user_id = ? AND status = "pending" ORDER BY created_at ASC LIMIT 1',
          [userId]
        );
        
        if (pendingLuckyOrders.length > 0) {
          const luckyOrder = pendingLuckyOrders[0];
          const commission = parseFloat(luckyOrder.commission || 0);
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
          const orderNo = `LUCKY-${Date.now()}`;
          
          console.log(`✅ Lucky Order found! Task #${luckyOrder.task_number}, Commission: $${commission}`);
          
          // (က) Lucky Order Status ကို "completed" သို့ ပြောင်းမယ် (Order Page မှာ ပျောက်သွားစေရန်)
          await pool.query(
            'UPDATE lucky_orders SET status = "completed", completed_at = NOW() WHERE id = ?',
            [luckyOrder.id]
          );
          
          // (ခ) Lucky Order Commission ကို User Balance ထဲ ထပ်ထည့်ပေးမယ်
          await pool.query(
            'UPDATE users SET balance = balance + ? WHERE id = ?',
            [commission, userId]
          );
          
          // (ဂ) ✅ Today's Earnings ထဲမှာ ပါလာအောင် user_tasks table ထဲကို မှတ်တမ်းတင်မယ်
          await pool.query(
            `INSERT INTO user_tasks (user_id, task_id, task_number, order_no, order_amount, commission, is_lucky_order, lucky_order_amount, status, date, completed_at) 
             VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'completed', ?, NOW())`,
            [
              userId, 
              luckyOrder.task_number, // task_id နေရာတွင် task_number ကို အစားထိုးသုံးပါမည်
              luckyOrder.task_number, 
              orderNo, 
              luckyOrder.amount, 
              commission, 
              luckyOrder.amount, 
              today
            ]
          );
          
          console.log(`🎉 Lucky Order auto-completed! Commission $${commission} added to balance and today's earnings.`);
        }

        console.log("✅ Balance updated successfully for user:", userId);
      } else {
        console.log("❌ Transaction not found in database!");
      }
    }

    res.status(200).json({ message: `Request ${status} successfully` });
  } catch (error) {
    console.error('❌ Update Topup Error:', error);
    console.error('SQL Error:', error.sqlMessage);
    res.status(500).json({ message: 'Server error: ' + error.message });
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
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateWithdrawRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body;
    const adminId = getAdminId(req);

    await pool.query(
      'UPDATE transactions SET status = ?, admin_note = ?, approved_by = ?, updated_at = NOW() WHERE id = ?',
      [status, admin_note, adminId, id]
    );

    res.status(200).json({ message: `Request ${status} successfully` });
  } catch (error) {
    console.error('Update Withdraw Error:', error);
    res.status(500).json({ message: 'Server error' });
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
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addTask = async (req, res) => {
  try {
    const { hotel_name, hotel_image, description, order_amount, commission } = req.body;
    const [result] = await pool.query(
      'INSERT INTO tasks (hotel_name, hotel_image, description, order_amount, commission) VALUES (?, ?, ?, ?, ?)',
      [hotel_name, hotel_image, description, order_amount, commission]
    );
    res.status(201).json({ message: 'Task added successfully', taskId: result.insertId });
  } catch (error) {
    console.error('Add Task Error:', error);
    res.status(500).json({ message: 'Server error' });
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
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ FIXED: Admin က Lucky Order ထည့်တဲ့အခါ status ကို 'assigned' ထားရမယ်
exports.addLuckyOrder = async (req, res) => {
  try {
    const { user_id, task_number, amount, commission } = req.body;
    const adminId = getAdminId(req);

    if (!user_id || !task_number || !amount || !commission) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    if (!adminId) {
      return res.status(401).json({ message: 'Admin authentication failed' });
    }

    // ✅ User ID ဖြင့် User ကို ရှာပါ
    const [users] = await pool.query('SELECT id, phone FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) {
      return res.status(404).json({ message: `User not found with ID: ${user_id}` });
    }

    // Task ရှိမရှိ စစ်ဆေးပါ
    const [tasks] = await pool.query('SELECT id FROM tasks WHERE id = ?', [task_number]);
    if (tasks.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // ✅ lucky_orders table ထဲကို user_id ဖြင့် သိမ်းပါ (Status ကို 'assigned' ထားပါ)
    const [result] = await pool.query(
      'INSERT INTO lucky_orders (user_id, task_number, amount, commission, created_by, status) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, task_number, amount, commission, adminId, 'assigned'] // <-- 'pending' အစား 'assigned'
    );
    
    res.status(201).json({ 
      message: 'Lucky order added successfully', 
      orderId: result.insertId 
    });
  } catch (error) {
    console.error('Add Lucky Order Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.cancelLuckyOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE lucky_orders SET status = ? WHERE id = ?',
      ['cancelled', id]
    );
    res.status(200).json({ message: 'Lucky order cancelled successfully' });
  } catch (error) {
    console.error('Cancel Lucky Order Error:', error);
    res.status(500).json({ message: 'Server error' });
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
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createInviteCode = async (req, res) => {
  try {
    const { code, max_uses } = req.body;
    const adminId = getAdminId(req);

    if (!adminId) {
      return res.status(401).json({ message: 'Admin authentication failed' });
    }

    const [result] = await pool.query(
      'INSERT INTO invite_codes (code, created_by, max_uses) VALUES (?, ?, ?)',
      [code, adminId, max_uses]
    );
    res.status(201).json({ message: 'Invite code created successfully', codeId: result.insertId });
  } catch (error) {
    console.error('Create Invite Code Error:', error);
    res.status(500).json({ message: 'Server error' });
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
    res.status(500).json({ message: 'Server error' });
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
    res.status(500).json({ message: 'Server error' });
  }
};