const { pool } = require('../config/database');

// ==========================================
// Get All Invite Codes (Admin)
// ==========================================
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
    res.status(500).json({ 
      message: 'Server error', 
      error: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// Create New Invite Code (Admin)
// ==========================================
exports.createInviteCode = async (req, res) => {
  try {
    const { code, max_uses } = req.body;
    const adminId = req.adminId || req.user?.adminId; // Auth middleware ကနေ လာတဲ့ adminId ကို ဦးစားပေးယူသည်

    // 1. Strict Validation
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ message: 'Valid invite code is required' });
    }

    const parsedMaxUses = parseInt(max_uses, 10);
    if (isNaN(parsedMaxUses) || parsedMaxUses <= 0) {
      return res.status(400).json({ message: 'max_uses must be a positive number' });
    }

    if (!adminId) {
      return res.status(401).json({ message: 'Admin authentication failed' });
    }

    // 2. Clean and Format the Code
    const formattedCode = code.trim().toUpperCase();

    // 3. Insert into Database
    await pool.query(
      'INSERT INTO invite_codes (code, max_uses, created_by, is_active, used_count) VALUES (?, ?, ?, 1, 0)',
      [formattedCode, parsedMaxUses, adminId]
    );

    res.status(201).json({ 
      message: 'Invite code created successfully',
      code: formattedCode 
    });
  } catch (error) {
    // Handle Duplicate Entry Gracefully
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'This invite code already exists. Please choose a different one.' });
    }
    
    console.error('Create Invite Code Error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.sqlMessage || error.message 
    });
  }
};

// ==========================================
// Toggle Invite Code Status (Active/Inactive)
// ==========================================
exports.toggleInviteCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Validate that is_active is strictly 0 or 1
    if (is_active !== 0 && is_active !== 1 && is_active !== true && is_active !== false) {
      return res.status(400).json({ message: 'Invalid status value. Must be 0 or 1.' });
    }

    const statusValue = is_active ? 1 : 0;
    const inviteCodeId = parseInt(id, 10);

    if (isNaN(inviteCodeId)) {
      return res.status(400).json({ message: 'Invalid invite code ID' });
    }

    const [result] = await pool.query(
      'UPDATE invite_codes SET is_active = ? WHERE id = ?',
      [statusValue, inviteCodeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Invite code not found' });
    }

    res.status(200).json({ 
      message: `Invite code status updated to ${statusValue === 1 ? 'Active' : 'Inactive'} successfully` 
    });
  } catch (error) {
    console.error('Toggle Invite Code Error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.sqlMessage || error.message 
    });
  }
};