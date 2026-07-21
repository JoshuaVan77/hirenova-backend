const { pool } = require('../config/database');

// ==========================================
// Get All Lucky Orders (Admin)
// ==========================================
exports.getLuckyOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT 
        lo.*, 
        u.phone, 
        u.full_name, 
        a.username as admin_name
      FROM lucky_orders lo
      LEFT JOIN users u ON lo.user_id = u.id
      LEFT JOIN admins a ON lo.created_by = a.id
      ORDER BY lo.created_at DESC
    `);

    res.status(200).json({ 
      success: true, 
      orders: orders || [] 
    });
  } catch (error) {
    console.error('Get Lucky Orders Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching lucky orders', 
      details: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// Create New Lucky Order (Admin)
// ==========================================
exports.createLuckyOrder = async (req, res) => {
  try {
    // 1. Phone number payload flexible extraction
    const phone = req.body.phone || req.body.user_phone;
    const { task_number, amount, commission } = req.body;

    // 2. Admin Authentication Fallback check
    const adminId = req.adminId || req.admin?.id || req.user?.adminId || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin authentication failed. Invalid token or session.' 
      });
    }

    // 3. Validation Check
    if (!phone || !task_number || amount === undefined || commission === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields (phone, task_number, amount, commission) are required' 
      });
    }

    // 4. Parsing and Data Sanitization
    const cleanPhone = String(phone).trim();
    const parsedTaskNumber = parseInt(task_number, 10);
    const parsedAmount = parseFloat(amount);
    const parsedCommission = parseFloat(commission);

    if (!cleanPhone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid user phone number is required' 
      });
    }

    if (isNaN(parsedTaskNumber) || parsedTaskNumber < 1 || parsedTaskNumber > 40) {
      return res.status(400).json({ 
        success: false, 
        message: 'Task number must be an integer between 1 and 40' 
      });
    }

    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount must be a valid non-negative number' 
      });
    }

    if (isNaN(parsedCommission) || parsedCommission < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Commission must be a valid non-negative number' 
      });
    }

    // 5. Check if User exists by phone
    const [users] = await pool.query('SELECT id, phone FROM users WHERE phone = ?', [cleanPhone]);
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `User not found with phone number: ${cleanPhone}` 
      });
    }

    const userId = users[0].id;

    // 6. Check if active lucky order already exists for this task number
    const [existing] = await pool.query(
      'SELECT id FROM lucky_orders WHERE user_id = ? AND task_number = ? AND status IN ("assigned", "pending")',
      [userId, parsedTaskNumber]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `A lucky order already exists for this user at Task #${parsedTaskNumber}` 
      });
    }

    // 7. Insert Lucky Order
    await pool.query(
      'INSERT INTO lucky_orders (user_id, task_number, amount, commission, created_by, status) VALUES (?, ?, ?, ?, ?, "assigned")',
      [userId, parsedTaskNumber, parsedAmount, parsedCommission, adminId]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Lucky order assigned successfully' 
    });

  } catch (error) {
    console.error('Create Lucky Order Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: 'Duplicate entry error: Order already exists' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error while creating lucky order', 
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
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid order ID provided' 
      });
    }

    // Only allow cancelling active/pending orders
    const [result] = await pool.query(
      'UPDATE lucky_orders SET status = "cancelled" WHERE id = ? AND status IN ("assigned", "pending")', 
      [orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lucky order not found, already completed, or already cancelled' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Lucky order cancelled successfully' 
    });

  } catch (error) {
    console.error('Cancel Lucky Order Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while cancelling order', 
      details: error.sqlMessage || error.message 
    });
  }
};