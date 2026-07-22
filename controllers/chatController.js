const { pool } = require('../config/database');
const { getIo } = require('../socket');

// Helper function to get or create a conversation for a user
const getOrCreateConversation = async (userId, adminId = null) => {
  // 1. Check if active conversation exists
  const [existing] = await pool.query(
    'SELECT id FROM conversations WHERE user_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 1',
    [userId]
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  // 2. If not, create a new conversation
  const [result] = await pool.query(
    'INSERT INTO conversations (user_id, admin_id, status) VALUES (?, ?, "active")',
    [userId, adminId]
  );
  return result.insertId;
};

// ==========================================
// ၁။ Get Messages for User
// ==========================================
exports.getUserMessages = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const conversationId = await getOrCreateConversation(userId);

    // ✅ image_url ကို SELECT ထဲတွင် ထည့်သွင်းထားပါသည်
    const [messages] = await pool.query(
      `SELECT m.id, m.sender_type, m.sender_id, m.message_type, m.content, m.image_url, m.is_read, m.created_at 
       FROM messages m 
       WHERE m.conversation_id = ? 
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    res.status(200).json({ messages });
  } catch (error) {
    console.error('Get User Messages Error:', error);
    res.status(500).json({ message: 'Server error', details: error.sqlMessage || error.message });
  }
};

// ==========================================
// ၂။ Send Message from User
// ==========================================
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { message } = req.body;
    let image_url = null;
    let messageType = 'text';

    // Handle image upload if multer middleware was used
    if (req.file) {
      image_url = `/uploads/chat/${req.file.filename}`;
      messageType = 'image';
    }

    if (!message && !image_url) {
      return res.status(400).json({ message: 'Message content or image is required' });
    }

    const conversationId = await getOrCreateConversation(userId);

    // ✅ INSERT ထဲတွင် image_url ကို ထည့်သွင်းသိမ်းဆည်းပါသည်
    const [result] = await pool.query(
      `INSERT INTO messages (conversation_id, sender_type, sender_id, message_type, content, image_url, is_read) 
       VALUES (?, 'user', ?, ?, ?, ?, 0)`,
      [conversationId, userId, messageType, message || '', image_url]
    );

    // ✅ SELECT ထဲတွင် image_url ပါဝင်အောင် ထုတ်ယူပါသည်
    const [newMessage] = await pool.query(
      `SELECT m.id, m.sender_type, m.sender_id, m.message_type, m.content, m.image_url, m.is_read, m.created_at, c.user_id 
       FROM messages m 
       JOIN conversations c ON m.conversation_id = c.id 
       WHERE m.id = ?`,
      [result.insertId]
    );

    // Emit to Admin Room via Socket.io
    const io = getIo();
    io.to('admin_room').emit('new_message', {
      userId: userId,
      conversationId: conversationId,
      message: newMessage[0]
    });

    res.status(201).json({ message: 'Message sent successfully', data: newMessage[0] });
  } catch (error) {
    console.error('Send Message Error:', error);
    res.status(500).json({ message: 'Server error', details: error.sqlMessage || error.message });
  }
};

// ==========================================
// ၃။ Get All Conversations for Admin
// ==========================================
exports.getConversations = async (req, res) => {
  try {
    const [conversations] = await pool.query(`
      SELECT 
        c.id as conversation_id,
        c.user_id,
        u.phone,
        u.full_name,
        c.status,
        c.updated_at as last_time,
        (SELECT CASE 
                  WHEN message_type = 'image' THEN '📷 [Photo]' 
                  ELSE content 
                END 
         FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_type = 'user' AND is_read = 0) as unread_count
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.updated_at DESC
    `);
    res.status(200).json({ conversations });
  } catch (error) {
    console.error('Get Conversations Error:', error);
    res.status(500).json({ message: 'Server error', details: error.sqlMessage || error.message });
  }
};

// ==========================================
// ၄။ Get Messages for Specific User (Admin View)
// ==========================================
exports.getUserChatMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const conversationId = await getOrCreateConversation(userId);

    // ✅ image_url ပါဝင်အောင် SELECT လုပ်ပေးထားပါသည်
    const [messages] = await pool.query(
      `SELECT m.id, m.sender_type, m.sender_id, m.message_type, m.content, m.image_url, m.is_read, m.created_at 
       FROM messages m 
       WHERE m.conversation_id = ? 
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    res.status(200).json({ messages });
  } catch (error) {
    console.error('Get User Chat Messages Error:', error);
    res.status(500).json({ message: 'Server error', details: error.sqlMessage || error.message });
  }
};

// ==========================================
// ၅။ Send Reply from Admin
// ==========================================
exports.sendAdminReply = async (req, res) => {
  try {
    const adminId = req.adminId || req.user?.adminId;
    if (!adminId) return res.status(401).json({ message: 'Admin authentication failed' });

    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ message: 'User ID and message are required' });
    }

    const conversationId = await getOrCreateConversation(userId, adminId);

    const [result] = await pool.query(
      `INSERT INTO messages (conversation_id, sender_type, sender_id, message_type, content, image_url, is_read) 
       VALUES (?, 'admin', ?, 'text', ?, NULL, 1)`,
      [conversationId, adminId, message]
    );

    const [newMessage] = await pool.query(
      `SELECT m.id, m.sender_type, m.sender_id, m.message_type, m.content, m.image_url, m.is_read, m.created_at, c.user_id 
       FROM messages m 
       JOIN conversations c ON m.conversation_id = c.id 
       WHERE m.id = ?`,
      [result.insertId]
    );

    // Emit to specific User Room via Socket.io
    const io = getIo();
    io.to(`user_${userId}`).emit('new_message', {
      userId: userId,
      conversationId: conversationId,
      message: newMessage[0]
    });

    res.status(201).json({ message: 'Reply sent successfully', data: newMessage[0] });
  } catch (error) {
    console.error('Send Admin Reply Error:', error);
    res.status(500).json({ message: 'Server error', details: error.sqlMessage || error.message });
  }
};

// ==========================================
// ၆။ Mark Messages as Read
// ==========================================
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const conversationId = await getOrCreateConversation(userId);

    await pool.query(
      'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_type = "user" AND is_read = 0',
      [conversationId]
    );

    res.status(200).json({ message: 'Messages marked as read successfully' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error', details: error.sqlMessage || error.message });
  }
};