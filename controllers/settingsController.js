const { pool } = require('../config/database');

// ==========================================
// Get All Settings (Admin & User)
// ==========================================
exports.getSettings = async (req, res) => {
  try {
    // setting_key နဲ့ setting_value ကိုသာ ယူပါ (Performance အတွက်)
    const [settings] = await pool.query('SELECT setting_key, setting_value FROM settings');
    
    const settingsObj = {};
    settings.forEach(s => { 
      settingsObj[s.setting_key] = s.setting_value; 
    });
    
    res.status(200).json({ settings: settingsObj });
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      details: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// Update Settings (Admin Only)
// ==========================================
exports.updateSettings = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const settingsToUpdate = req.body;

    if (!settingsToUpdate || Object.keys(settingsToUpdate).length === 0) {
      return res.status(400).json({ message: 'No settings provided for update' });
    }

    await connection.beginTransaction();

    for (const [key, value] of Object.entries(settingsToUpdate)) {
      // 1. Validation for numeric settings
      if (key === 'min_task_balance' || key === 'min_topup_amount') {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          await connection.rollback();
          return res.status(400).json({ message: `${key} must be a valid positive number` });
        }
      }

      // 2. Dynamic Upsert (Insert or Update)
      // setting_value က TEXT ဖြစ်တဲ့အတွက် String အဖြစ် ပြောင်းထည့်ပါမယ်
      await connection.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, String(value), String(value)]
      );
    }

    await connection.commit();
    res.status(200).json({ message: 'Settings updated successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('Update Settings Error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      details: error.sqlMessage || error.message 
    });
  } finally {
    connection.release();
  }
};