const { pool } = require('../config/database');

console.log('✅✅✅ userTaskController.js LOADED SUCCESSFULLY! ✅✅✅');

// ၁။ Get Today's Tasks for User
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

    const [tasksResult] = await pool.query(
      'SELECT * FROM tasks WHERE is_active = 1 ORDER BY RAND() LIMIT 100'
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
      message: 'Server error: ' + error.message,
      details: error.sqlMessage || error.message 
    });
  }
};

// ၂။ Submit Completed Task (✅ FIXED: Handles Lucky Order Deduction & Commission Addition)
exports.submitTask = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User ID not found' });
    }

    const { task_id, task_number, order_amount, commission, is_lucky_order, lucky_order_amount } = req.body;
    const today = new Date().toISOString().split('T')[0];

    if (!task_id) return res.status(400).json({ message: 'Task ID is required' });
    if (!task_number || task_number < 1 || task_number > 40) {
      return res.status(400).json({ message: 'Invalid task number' });
    }

    const [taskExists] = await pool.query('SELECT id FROM tasks WHERE id = ?', [task_id]);
    if (!taskExists || taskExists.length === 0) {
      return res.status(404).json({ message: 'Task not found in database' });
    }

    const [completedCountResult] = await pool.query(
      'SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ? AND date = ? AND status = "completed"',
      [userId, today]
    );
    const currentCompleted = completedCountResult[0] ? completedCountResult[0].count : 0;

    if (currentCompleted >= 40) {
      return res.status(400).json({ message: 'You have completed all 40 tasks for today.' });
    }

    const [existingTask] = await pool.query(
      'SELECT id FROM user_tasks WHERE user_id = ? AND task_number = ? AND date = ?',
      [userId, task_number, today]
    );

    if (existingTask && existingTask.length > 0) {
      return res.status(400).json({ message: 'This task number is already completed for today' });
    }

    const orderNo = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // ✅ ၁။ user_tasks table ထဲကို သိမ်းဆည်းမယ် (Commission ပါပြီးသား)
    await pool.query(
      `INSERT INTO user_tasks (user_id, task_id, task_number, order_no, order_amount, commission, is_lucky_order, lucky_order_amount, status, date, completed_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, NOW())`,
      [userId, task_id, task_number, orderNo, order_amount || 0, commission || 0, is_lucky_order || 0, lucky_order_amount || 0, today]
    );

    // ✅ ၂။ အကယ်၍ Lucky Order ဖြစ်ပါက Required Amount ကို Balance ထဲက နုတ်ယူမယ်
    if (is_lucky_order && lucky_order_amount > 0) {
      await pool.query('UPDATE users SET balance = balance - ? WHERE id = ?', [lucky_order_amount, userId]);
      
      // Lucky Order status ကို "completed" သို့ ပြောင်းမယ် (ဒါကြောင့် Unfinished tab ကနေ ပျောက်သွားမယ်)
      await pool.query(
        'UPDATE lucky_orders SET status = "completed", completed_at = NOW() WHERE user_id = ? AND task_number = ? AND status IN ("assigned", "pending")',
        [userId, task_number]
      );
    }

    // ✅ ၃။ Commission ကို Balance ထဲသို့ အမြဲထည့်ပေးမယ် (ပုံမှန်ရော၊ Lucky Order ရော)
    await pool.query('UPDATE users SET balance = balance + ? WHERE id = ?', [commission || 0, userId]);

    const [newCompletedCountResult] = await pool.query(
      'SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ? AND date = ? AND status = "completed"',
      [userId, today]
    );
    const newCompleted = newCompletedCountResult[0] ? newCompletedCountResult[0].count : 0;

    res.status(200).json({
      message: 'Task completed successfully',
      commission: commission || 0,
      completedCount: newCompleted,
      remainingTasks: 40 - newCompleted
    });

  } catch (error) {
    console.error('❌❌❌ FATAL ERROR IN submitTask ❌❌❌');
    res.status(500).json({ 
      message: 'Server error: ' + (error.sqlMessage || error.message),
      details: error.message
    });
  }
};

// ၃။ Check Lucky Order for Current Task
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

    // ✅ 'assigned' (Admin ထည့်စဉ်) သို့မဟုတ် 'pending' (User Confirm လုပ်ပြီးသား) နှစ်ခုလုံးကို စစ်ဆေးမယ်
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
      message: 'Server error: ' + (error.sqlMessage || error.message),
      details: error.message 
    });
  }
};

// ၄။ ✅ NEW: Acknowledge Lucky Order (User က Confirm/Top-up နှိပ်တဲ့အခါ ခေါ်မယ်)
exports.acknowledgeLuckyOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { task_number } = req.body;
    
    if (!task_number) {
      return res.status(400).json({ message: 'Task number is required' });
    }

    // Status ကို 'assigned' မှ 'pending' သို့ ပြောင်းမယ် (ဒါမှ Unfinished tab မှာ ပေါ်လာမယ်)
    const [result] = await pool.query(
      'UPDATE lucky_orders SET status = "pending" WHERE user_id = ? AND task_number = ? AND status = "assigned"',
      [userId, task_number]
    );
    
    res.status(200).json({ message: 'Lucky order acknowledged and moved to pending' });
  } catch (error) {
    console.error('❌ Acknowledge Lucky Order Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ၅။ Get Unfinished Tasks (Pending Lucky Orders) - For Order Page
exports.getUnfinishedTasks = async (req, res) => {
  try {
    const userId = req.userId;
    
    // ✅ 'pending' ဖြစ်နေတဲ့ Lucky Order တွေကိုပဲ ရွေးထုတ်မယ် (Hotel info ပါယူမယ်)
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
    res.status(500).json({ message: 'Server error' });
  }
};

// ၆။ Get Completed Tasks History - For Order Page
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
    res.status(500).json({ message: 'Server error' });
  }
};

// ၇။ Get Today's Earnings (Normal + Lucky Commission)
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
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};