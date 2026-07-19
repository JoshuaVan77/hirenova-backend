const { pool } = require('../config/database');
const { getIo } = require('../socket');

// Get Messages for User
exports.getUserMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const [messages] = await pool.query(
      'SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC',
      [userId]
    );
    res.status(200).json({ messages });
  } catch (error) {
    console.error('Get User Messages Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send Message from User
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { message } = req.body;
    let image_url = null;

    if (req.file) {
      image_url = `/uploads/chat/${req.file.filename}`;
    }

    const [result] = await pool.query(
      'INSERT INTO chat_messages (user_id, sender, message, image_url, is_read) VALUES (?, "user", ?, ?, 0)',
      [userId, message, image_url]
    );

    const [newMessage] = await pool.query(
      'SELECT * FROM chat_messages WHERE id = ?',
      [result.insertId]
    );

    const io = getIo();
    io.to('admin_room').emit('new_message', {
      userId: userId,
      message: newMessage[0]
    });

    res.status(200).json({ message: 'Message sent successfully', data: newMessage[0] });
  } catch (error) {
    console.error('Send Message Error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Get All Conversations for Admin
exports.getConversations = async (req, res) => {
  try {
    const [conversations] = await pool.query(`
      SELECT DISTINCT 
        cm.user_id,
        u.phone,
        u.full_name,
        (SELECT message FROM chat_messages WHERE user_id = cm.user_id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages WHERE user_id = cm.user_id ORDER BY created_at DESC LIMIT 1) as last_time,
        (SELECT COUNT(*) FROM chat_messages WHERE user_id = cm.user_id AND sender = 'user' AND is_read = 0) as unread_count
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      ORDER BY last_time DESC
    `);
    res.status(200).json({ conversations });
  } catch (error) {
    console.error('Get Conversations Error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Get Messages for Specific User (Admin View)
exports.getUserChatMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const [messages] = await pool.query(
      'SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC',
      [userId]
    );
    res.status(200).json({ messages });
  } catch (error) {
    console.error('Get User Chat Messages Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send Reply from Admin
exports.sendAdminReply = async (req, res) => {
  try {
    const adminId = req.adminId || 1;
    const { userId, message } = req.body;

    const [result] = await pool.query(
      'INSERT INTO chat_messages (user_id, admin_id, sender, message, is_read) VALUES (?, ?, "admin", ?, 1)',
      [userId, adminId, message]
    );

    const [newMessage] = await pool.query(
      'SELECT * FROM chat_messages WHERE id = ?',
      [result.insertId]
    );

    const io = getIo();
    io.to(`user_${userId}`).emit('new_message', {
      userId: userId,
      message: newMessage[0]
    });

    res.status(200).json({ message: 'Reply sent successfully', data: newMessage[0] });
  } catch (error) {
    console.error('Send Admin Reply Error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// ✅ Admin က conversation ကို ဖွင့်ကြည့်တဲ့အခါ messages တွေကို "read" ဖြစ်အောင် ပြောင်းပေးမယ်
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // ✅ သင့် chat_messages table နဲ့ ကိုက်ညီအောင် ပြင်ဆင်ထားခြင်း
    await pool.query(
      'UPDATE chat_messages SET is_read = 1 WHERE user_id = ? AND sender = "user" AND is_read = 0',
      [userId]
    );

    res.status(200).json({ message: 'Messages marked as read successfully' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};