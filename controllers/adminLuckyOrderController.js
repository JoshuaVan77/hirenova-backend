const { pool } = require('../config/database');

// Get All Lucky Orders (Admin)
exports.getLuckyOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT lo.*, u.phone, u.full_name, a.username as admin_name
      FROM lucky_orders lo
      JOIN users u ON lo.user_id = u.id
      LEFT JOIN admins a ON lo.created_by = a.id
      ORDER BY lo.created_at DESC
    `);
    res.status(200).json({ orders });
  } catch (error) {
    console.error('Get Lucky Orders Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create New Lucky Order (Admin)
exports.createLuckyOrder = async (req, res) => {
  try {
    const { user_phone, task_number, amount, commission } = req.body;
    const adminId = req.adminId || 1;

    // Find user by phone
    const [users] = await pool.query('SELECT id FROM users WHERE phone = ?', [user_phone]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found with this phone number' });
    }

    const userId = users[0].id;

    // Check if task number is valid
    if (task_number < 1 || task_number > 40) {
      return res.status(400).json({ message: 'Task number must be between 1 and 40' });
    }

    // Check if lucky order already exists for this user and task number
    const [existing] = await pool.query(
      'SELECT id FROM lucky_orders WHERE user_id = ? AND task_number = ? AND status = "pending"',
      [userId, task_number]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'A pending lucky order already exists for this user at this task number' });
    }

    await pool.query(
      'INSERT INTO lucky_orders (user_id, task_number, amount, commission, created_by, status) VALUES (?, ?, ?, ?, ?, "pending")',
      [userId, parseInt(task_number), parseFloat(amount), parseFloat(commission), adminId]
    );

    res.status(201).json({ message: 'Lucky order assigned successfully' });
  } catch (error) {
    console.error('Create Lucky Order Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel Lucky Order
exports.cancelLuckyOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE lucky_orders SET status = "cancelled" WHERE id = ?', [id]);
    res.status(200).json({ message: 'Lucky order cancelled successfully' });
  } catch (error) {
    console.error('Cancel Lucky Order Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};