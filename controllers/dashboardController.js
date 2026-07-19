const { pool } = require('../config/database');

// Get Dashboard Statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Total Users
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = users[0].count;

    // Pending Top-ups
    const [pendingTopups] = await pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE type = "topup" AND status = "pending"'
    );
    const pendingTopupsCount = pendingTopups[0].count;

    // Pending Withdrawals
    const [pendingWithdrawals] = await pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE type = "withdraw" AND status = "pending"'
    );
    const pendingWithdrawalsCount = pendingWithdrawals[0].count;

    // Total Revenue (Approved Top-ups)
    const [revenue] = await pool.query(
      'SELECT SUM(amount) as total FROM transactions WHERE type = "topup" AND status = "approved"'
    );
    const totalRevenue = parseFloat(revenue[0].total || 0);

    // Recent Transactions
    const [recentTransactions] = await pool.query(`
      SELECT 
        t.id,
        t.type,
        t.amount,
        t.status,
        t.created_at,
        u.phone as user_phone,
        CONCAT('USR', LPAD(u.id, 3, '0')) as user_id
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    res.status(200).json({
      totalUsers,
      pendingTopups: pendingTopupsCount,
      pendingWithdrawals: pendingWithdrawalsCount,
      totalRevenue,
      recentTransactions
    });
  } catch (error) {
    console.error('Get Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};