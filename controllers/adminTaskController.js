const { pool } = require('../config/database');

// ==========================================
// Get All Tasks (Admin)
// ==========================================
exports.getTasks = async (req, res) => {
  try {
    const [tasks] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.status(200).json({ tasks: tasks || [] });
  } catch (error) {
    console.error('Get Tasks Error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      details: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// Create New Task (Admin)
// ==========================================
exports.createTask = async (req, res) => {
  try {
    const { hotel_name, hotel_image, description, order_amount, commission } = req.body;

    // 1. Validation
    if (!hotel_name || order_amount === undefined || commission === undefined) {
      return res.status(400).json({ message: 'Hotel name, order amount, and commission are required' });
    }

    const parsedOrderAmount = parseFloat(order_amount);
    const parsedCommission = parseFloat(commission);

    if (isNaN(parsedOrderAmount) || parsedOrderAmount < 0) {
      return res.status(400).json({ message: 'Order amount must be a valid positive number' });
    }

    if (isNaN(parsedCommission) || parsedCommission < 0) {
      return res.status(400).json({ message: 'Commission must be a valid positive number' });
    }

    // 2. Insert into Database
    await pool.query(
      'INSERT INTO tasks (hotel_name, hotel_image, description, order_amount, commission, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [hotel_name.trim(), hotel_image || '', description || '', parsedOrderAmount, parsedCommission]
    );

    res.status(201).json({ message: 'Task created successfully' });
  } catch (error) {
    console.error('Create Task Error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      details: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// Update Task (Admin)
// ==========================================
exports.updateTask = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const { hotel_name, hotel_image, description, order_amount, commission } = req.body;

    // 1. Validation
    if (!hotel_name || order_amount === undefined || commission === undefined) {
      return res.status(400).json({ message: 'Hotel name, order amount, and commission are required' });
    }

    const parsedOrderAmount = parseFloat(order_amount);
    const parsedCommission = parseFloat(commission);

    if (isNaN(parsedOrderAmount) || parsedOrderAmount < 0) {
      return res.status(400).json({ message: 'Order amount must be a valid positive number' });
    }

    if (isNaN(parsedCommission) || parsedCommission < 0) {
      return res.status(400).json({ message: 'Commission must be a valid positive number' });
    }

    // 2. Update Database
    const [result] = await pool.query(
      'UPDATE tasks SET hotel_name = ?, hotel_image = ?, description = ?, order_amount = ?, commission = ? WHERE id = ?',
      [hotel_name.trim(), hotel_image || '', description || '', parsedOrderAmount, parsedCommission, taskId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Update Task Error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      details: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// Delete Task (Admin)
// ==========================================
exports.deleteTask = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    // Note: Due to ON DELETE CASCADE in user_tasks schema, this will also delete related user task records.
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [taskId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete Task Error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      details: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// Toggle Task Status (Active/Inactive)
// ==========================================
exports.toggleTaskStatus = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const { is_active } = req.body;

    // Validate that is_active is strictly 0 or 1 (or boolean)
    if (is_active !== 0 && is_active !== 1 && is_active !== true && is_active !== false) {
      return res.status(400).json({ message: 'Invalid status value. Must be 0 or 1.' });
    }

    const statusValue = is_active ? 1 : 0;

    const [result] = await pool.query('UPDATE tasks SET is_active = ? WHERE id = ?', [statusValue, taskId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json({ 
      message: `Task status updated to ${statusValue === 1 ? 'Active' : 'Inactive'} successfully` 
    });
  } catch (error) {
    console.error('Toggle Task Status Error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      details: error.sqlMessage || error.message 
    });
  }
};