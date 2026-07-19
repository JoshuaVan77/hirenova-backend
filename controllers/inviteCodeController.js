const { pool } = require('../config/database');

// Get All Invite Codes (Admin)
exports.getInviteCodes = async (req, res) => {
  try {
    const [codes] = await pool.query(`
      SELECT ic.*, a.username as created_by_name 
      FROM invite_codes ic 
      LEFT JOIN admins a ON ic.created_by = a.id 
      ORDER BY ic.created_at DESC
    `);
    res.status(200).json({ codes });
  } catch (error) {
    console.error('Get Invite Codes Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create New Invite Code (Admin)
exports.createInviteCode = async (req, res) => {
  try {
    const { code, max_uses } = req.body;
    const adminId = req.adminId || 1; // Fallback admin ID

    if (!code || !max_uses) {
      return res.status(400).json({ message: 'Code and max_uses are required' });
    }

    await pool.query(
      'INSERT INTO invite_codes (code, max_uses, created_by, is_active) VALUES (?, ?, ?, 1)',
      [code.toUpperCase(), parseInt(max_uses), adminId]
    );

    res.status(201).json({ message: 'Invite code created successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'This invite code already exists' });
    }
    console.error('Create Invite Code Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle Invite Code Status (Active/Inactive)
exports.toggleInviteCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    await pool.query(
      'UPDATE invite_codes SET is_active = ? WHERE id = ?',
      [is_active, id]
    );

    res.status(200).json({ message: 'Invite code status updated successfully' });
  } catch (error) {
    console.error('Toggle Invite Code Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};