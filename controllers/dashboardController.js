const { pool } = require('../config/database');

// ==========================================
// Get Dashboard Statistics
// ==========================================
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Total Users
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = users[0]?.count || 0;

    // 2. Pending Top-ups (Including lucky_order_topup for consistency)
    const [pendingTopups] = await pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE type IN ("topup", "lucky_order_topup") AND status = "pending"'
    );
    const pendingTopupsCount = pendingTopups[0]?.count || 0;

    // 3. Pending Withdrawals
    const [pendingWithdrawals] = await pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE type = "withdraw" AND status = "pending"'
    );
    const pendingWithdrawalsCount = pendingWithdrawals[0]?.count || 0;

    // 4. Total Revenue (Approved Top-ups & Lucky Order Top-ups)
    const [revenue] = await pool.query(
      'SELECT SUM(amount) as total FROM transactions WHERE type IN ("topup", "lucky_order_topup") AND status = "approved"'
    );
    const totalRevenue = parseFloat(revenue[0]?.total || 0);

    // 5. Recent Transactions (Last 10)
    const [recentTransactions] = await pool.query(`
      SELECT 
        t.id,
        t.type,
        t.amount,
        t.status,
        t.created_at,
        u.phone as user_phone,
        CONCAT('USR', LPAD(u.id, 3, '0')) as formatted_user_id
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
      recentTransactions: recentTransactions || []
    });
  } catch (error) {
    console.error('Get Dashboard Stats Error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      details: error.sqlMessage || error.message 
    });
  }
};