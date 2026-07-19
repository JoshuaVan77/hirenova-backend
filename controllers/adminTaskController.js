const { pool } = require('../config/database');

// Get All Tasks (Admin)
exports.getTasks = async (req, res) => {
  try {
    const [tasks] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.status(200).json({ tasks });
  } catch (error) {
    console.error('Get Tasks Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create New Task (Admin)
exports.createTask = async (req, res) => {
  try {
    const { hotel_name, hotel_image, description, order_amount, commission } = req.body;

    await pool.query(
      'INSERT INTO tasks (hotel_name, hotel_image, description, order_amount, commission, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [hotel_name, hotel_image, description, order_amount, commission]
    );

    res.status(201).json({ message: 'Task created successfully' });
  } catch (error) {
    console.error('Create Task Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Task (Admin)
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { hotel_name, hotel_image, description, order_amount, commission } = req.body;

    await pool.query(
      'UPDATE tasks SET hotel_name = ?, hotel_image = ?, description = ?, order_amount = ?, commission = ? WHERE id = ?',
      [hotel_name, hotel_image, description, order_amount, commission, id]
    );

    res.status(200).json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Update Task Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete Task (Admin)
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete Task Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle Task Status (Active/Inactive)
exports.toggleTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    await pool.query('UPDATE tasks SET is_active = ? WHERE id = ?', [is_active, id]);
    res.status(200).json({ message: 'Task status updated successfully' });
  } catch (error) {
    console.error('Toggle Task Status Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};