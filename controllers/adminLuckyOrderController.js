const { pool } = require('../config/database');

// ==========================================
// Get All Lucky Orders (Admin)
// ==========================================
exports.getLuckyOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT lo.*, u.phone, u.full_name, a.username as admin_name
      FROM lucky_orders lo
      JOIN users u ON lo.user_id = u.id
      LEFT JOIN admins a ON lo.created_by = a.id
      ORDER BY lo.created_at DESC
    `);
    res.status(200).json({ orders: orders || [] });
  } catch (error) {
    console.error('Get Lucky Orders Error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      details: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// Create New Lucky Order (Admin)
// ==========================================
exports.createLuckyOrder = async (req, res) => {
  try {
    // ✅ FIX 1: Frontend က 'phone' လို့ပို့တာမို့ 'phone' ကို ယူသုံးပါမယ်
    const { phone, task_number, amount, commission } = req.body;
    const adminId = req.adminId || req.user?.adminId;

    if (!adminId) {
      return res.status(401).json({ message: 'Admin authentication failed' });
    }

    // ✅ FIX 2: Validation မှာလည်း 'phone' ကို စစ်ဆေးပါမယ်
    if (!phone || !task_number || amount === undefined || commission === undefined) {
      return res.status(400).json({ message: 'All fields (phone, task_number, amount, commission) are required' });
    }

    // Strict Validation
    const parsedTaskNumber = parseInt(task_number, 10);
    const parsedAmount = parseFloat(amount);
    const parsedCommission = parseFloat(commission);

    if (isNaN(parsedTaskNumber) || parsedTaskNumber < 1 || parsedTaskNumber > 40) {
      return res.status(400).json({ message: 'Task number must be a number between 1 and 40' });
    }

    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ message: 'Amount must be a valid positive number' });
    }

    if (isNaN(parsedCommission) || parsedCommission < 0) {
      return res.status(400).json({ message: 'Commission must be a valid positive number' });
    }

    // ✅ FIX 3: Database query မှာလည်း 'phone' variable ကို သုံးပါမယ်
    const [users] = await pool.query('SELECT id, phone FROM users WHERE phone = ?', [phone.trim()]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found with this phone number' });
    }

    const userId = users[0].id;

    // Check if lucky order already exists for this user and task number
    const [existing] = await pool.query(
      'SELECT id FROM lucky_orders WHERE user_id = ? AND task_number = ? AND status IN ("assigned", "pending")',
      [userId, parsedTaskNumber]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'A lucky order already exists for this user at this task number' });
    }

    // Insert with status 'assigned'
    await pool.query(
      'INSERT INTO lucky_orders (user_id, task_number, amount, commission, created_by, status) VALUES (?, ?, ?, ?, ?, "assigned")',
      [userId, parsedTaskNumber, parsedAmount, parsedCommission, adminId]
    );

    res.status(201).json({ message: 'Lucky order assigned successfully' });
  } catch (error) {
    console.error('Create Lucky Order Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Duplicate entry error' });
    }
    res.status(500).json({ 
      message: 'Server error', 
      details: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// Cancel Lucky Order
// ==========================================
exports.cancelLuckyOrder = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const [result] = await pool.query(
      'UPDATE lucky_orders SET status = "cancelled" WHERE id = ?', 
      [orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lucky order not found or already cancelled' });
    }

    res.status(200).json({ message: 'Lucky order cancelled successfully' });
  } catch (error) {
    console.error('Cancel Lucky Order Error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      details: error.sqlMessage || error.message 
    });
  }
};