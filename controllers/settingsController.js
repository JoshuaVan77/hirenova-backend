const { pool } = require('../config/database');

// Get All Settings (Admin & User)
exports.getSettings = async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM settings');
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });
    res.status(200).json({ settings: settingsObj });
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Settings (Admin Only)
exports.updateSettings = async (req, res) => {
  try {
    const { trc20_address, min_task_balance } = req.body;

    if (trc20_address) {
      await pool.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES ("trc20_address", ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [trc20_address, trc20_address]
      );
    }

    if (min_task_balance) {
      await pool.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES ("min_task_balance", ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [min_task_balance, min_task_balance]
      );
    }

    res.status(200).json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update Settings Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};