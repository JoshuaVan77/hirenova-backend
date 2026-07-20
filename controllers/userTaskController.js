const { pool } = require('../config/database');

console.log('✅✅✅ userTaskController.js LOADED SUCCESSFULLY! ✅✅✅');

// ==========================================
// ၁။ Get Today's Tasks for User
// ==========================================
exports.getTodayTasks = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User ID not found' });
    }
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const [completedCountResult] = await pool.query(
      'SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ? AND date = ? AND status = "completed"',
      [userId, today]
    );
    const completed = completedCountResult[0] ? completedCountResult[0].count : 0;

    // Note: ORDER BY RAND() is acceptable for small tables. 
    const [tasksResult] = await pool.query(
      'SELECT id as task_id, hotel_name, hotel_image, description, order_amount, commission FROM tasks WHERE is_active = 1 ORDER BY RAND() LIMIT 100'
    );
    
    const tasks = Array.isArray(tasksResult) ? tasksResult : [];

    res.status(200).json({
      tasks: tasks,
      completedCount: completed,
      totalTasks: 40
    });
  } catch (error) {
    console.error('❌ Get Today Tasks Error:', error);
    res.status(500).json({ 
      message: 'Server error',
      details: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// ၂။ Submit Completed Task (✅ FIXED: Handles Lucky Order Deduction & Commission Addition with Transactions)
// ==========================================
exports.submitTask = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User ID not found' });
    }

    const { task_id, task_number, order_amount, commission, is_lucky_order, lucky_order_amount } = req.body;
    const today = new Date().toISOString().split('T')[0];

    if (!task_id || !task_number) {
      return res.status(400).json({ message: 'Task ID and Task Number are required' });
    }

    await connection.beginTransaction();

    // 1. Check if already completed 40 tasks today
    const [completedCountResult] = await connection.query(
      'SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ? AND date = ? AND status = "completed"',
      [userId, today]
    );
    const currentCompleted = completedCountResult[0] ? completedCountResult[0].count : 0;

    if (currentCompleted >= 40) {
      await connection.rollback();
      return res.status(400).json({ message: 'You have completed all 40 tasks for today.' });
    }

    // 2. Check for duplicate task_number today (Race condition protection)
    const [existingTask] = await connection.query(
      'SELECT id FROM user_tasks WHERE user_id = ? AND task_number = ? AND date = ?',
      [userId, task_number, today]
    );
    if (existingTask && existingTask.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'This task number is already completed for today' });
    }

    // 3. Parse values safely
    const finalCommission = parseFloat(commission || 0);
    const finalOrderAmount = parseFloat(order_amount || 0);
    const isLucky = is_lucky_order ? 1 : 0;
    const luckyAmount = parseFloat(lucky_order_amount || 0);

    // 4. Handle Lucky Order Logic
    if (isLucky && luckyAmount > 0) {
      // ⚠️ CRITICAL: Check if user has enough balance BEFORE deducting
      const [userBalanceResult] = await connection.query('SELECT balance FROM users WHERE id = ?', [userId]);
      if (userBalanceResult.length === 0 || userBalanceResult[0].balance < luckyAmount) {
        await connection.rollback();
        return res.status(400).json({ message: 'Insufficient balance to complete this lucky order' });
      }

      // Deduct balance
      await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [luckyAmount, userId]);
      
      // Update lucky order status to completed
      await connection.query(
        'UPDATE lucky_orders SET status = "completed", completed_at = NOW() WHERE user_id = ? AND task_number = ? AND status IN ("assigned", "pending")',
        [userId, task_number]
      );
    }

    // 5. Insert into user_tasks
    const orderNo = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    await connection.query(
      `INSERT INTO user_tasks (user_id, task_id, task_number, order_no, order_amount, commission, is_lucky_order, lucky_order_amount, status, date, completed_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, NOW())`,
      [userId, task_id, task_number, orderNo, finalOrderAmount, finalCommission, isLucky, luckyAmount, today]
    );

    // 6. Add commission to balance (for both normal and lucky orders)
    if (finalCommission > 0) {
      await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [finalCommission, userId]);
    }

    await connection.commit();

    const newCompleted = currentCompleted + 1;

    res.status(200).json({
      message: 'Task completed successfully',
      commission: finalCommission,
      completedCount: newCompleted,
      remainingTasks: 40 - newCompleted
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌❌❌ FATAL ERROR IN submitTask ❌❌❌', error);
    
    // Handle unique constraint violation if it happens despite checks
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'This task has already been recorded for today.' });
    }

    res.status(500).json({ 
      message: 'Server error',
      details: error.sqlMessage || error.message 
    });
  } finally {
    connection.release();
  }
};

// ==========================================
// ၃။ Check Lucky Order for Current Task
// ==========================================
exports.checkLuckyOrder = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { task_number } = req.body;
    if (!task_number) {
      return res.status(400).json({ message: 'Task number is required' });
    }

    const [luckyOrders] = await pool.query(
      `SELECT lo.id, lo.amount, lo.commission, lo.task_number, t.hotel_name, t.hotel_image, t.id as task_id
       FROM lucky_orders lo
       LEFT JOIN tasks t ON lo.task_number = t.id 
       WHERE lo.user_id = ? AND lo.task_number = ? AND lo.status IN ('assigned', 'pending')`,
      [userId, task_number]
    );

    if (luckyOrders && luckyOrders.length > 0) {
      const luckyOrder = luckyOrders[0];
      
      return res.status(200).json({
        isLuckyOrder: true,
        requiredAmount: parseFloat(luckyOrder.amount || 0),
        commission: parseFloat(luckyOrder.commission || 0),
        hotel_name: luckyOrder.hotel_name || 'Lucky Hotel',
        hotel_image: luckyOrder.hotel_image || '',
        task_id: luckyOrder.task_id || null,
        message: 'Lucky order found. Please confirm.'
      });
    }

    res.status(200).json({ 
      isLuckyOrder: false, 
      message: 'No lucky order for this task' 
    });
  } catch (error) {
    console.error('❌ Check Lucky Order Error:', error);
    res.status(500).json({ 
      message: 'Server error',
      details: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// ၄။ Acknowledge Lucky Order (User က Confirm/Top-up နှိပ်တဲ့အခါ ခေါ်မယ်)
// ==========================================
exports.acknowledgeLuckyOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { task_number } = req.body;
    
    if (!task_number) {
      return res.status(400).json({ message: 'Task number is required' });
    }

    // Status ကို 'assigned' မှ 'pending' သို့ ပြောင်းမယ်
    const [result] = await pool.query(
      'UPDATE lucky_orders SET status = "pending" WHERE user_id = ? AND task_number = ? AND status = "assigned"',
      [userId, task_number]
    );
    
    res.status(200).json({ message: 'Lucky order acknowledged and moved to pending' });
  } catch (error) {
    console.error('❌ Acknowledge Lucky Order Error:', error);
    res.status(500).json({ 
      message: 'Server error',
      details: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// ၅။ Get Unfinished Tasks (Pending Lucky Orders) - For Order Page
// ==========================================
exports.getUnfinishedTasks = async (req, res) => {
  try {
    const userId = req.userId;
    
    const [orders] = await pool.query(
      `SELECT lo.id, lo.task_number, lo.amount as required_amount, lo.commission, lo.status, lo.created_at, t.hotel_name, t.hotel_image
       FROM lucky_orders lo
       LEFT JOIN tasks t ON lo.task_number = t.id
       WHERE lo.user_id = ? AND lo.status = 'pending'
       ORDER BY lo.task_number ASC`,
      [userId]
    );
    
    res.status(200).json({ tasks: orders || [] });
  } catch (error) {
    console.error('Get Unfinished Tasks Error:', error);
    res.status(500).json({ 
      message: 'Server error',
      details: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// ၆။ Get Completed Tasks History - For Order Page
// ==========================================
exports.getCompletedTasks = async (req, res) => {
  try {
    const userId = req.userId;
    
    const [tasks] = await pool.query(
      `SELECT ut.task_number, ut.commission, ut.completed_at, t.hotel_name, t.hotel_image 
       FROM user_tasks ut 
       JOIN tasks t ON ut.task_id = t.id 
       WHERE ut.user_id = ? AND ut.status = 'completed' 
       ORDER BY ut.completed_at DESC 
       LIMIT 100`,
      [userId]
    );
    
    res.status(200).json({ tasks: tasks || [] });
  } catch (error) {
    console.error('Get Completed Tasks Error:', error);
    res.status(500).json({ 
      message: 'Server error',
      details: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// ၇။ Get Today's Earnings (Normal + Lucky Commission)
// ==========================================
exports.getTodayEarnings = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const [result] = await pool.query(
      `SELECT SUM(commission) as totalEarnings 
       FROM user_tasks 
       WHERE user_id = ? AND date = ? AND status = 'completed'`,
      [userId, today]
    );

    const totalEarnings = result[0]?.totalEarnings ? parseFloat(result[0].totalEarnings) : 0;

    res.status(200).json({
      totalEarnings: totalEarnings,
      message: 'Today\'s earnings fetched successfully'
    });
  } catch (error) {
    console.error('❌ Get Today Earnings Error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      details: error.sqlMessage || error.message 
    });
  }
};