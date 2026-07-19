const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// User Register
exports.register = async (req, res) => {
  try {
    const { phone, password, payment_password, full_name, nickname, invite_code } = req.body;

    // 1. Check if phone exists
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // 2. Validate Invite Code
    if (!invite_code) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const [codes] = await pool.query(
      'SELECT * FROM invite_codes WHERE code = ? AND is_active = 1', 
      [invite_code.toUpperCase()]
    );

    if (codes.length === 0) {
      return res.status(400).json({ message: 'Invalid or inactive invite code' });
    }

    if (codes[0].current_uses >= codes[0].max_uses) {
      return res.status(400).json({ message: 'Invite code has reached its maximum usage limit' });
    }

    // 3. Hash passwords
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPaymentPassword = await bcrypt.hash(payment_password, 10);

    // 4. Insert User
    const [result] = await pool.query(
      'INSERT INTO users (phone, password, payment_password, full_name, nickname, invite_code) VALUES (?, ?, ?, ?, ?, ?)',
      [phone, hashedPassword, hashedPaymentPassword, full_name, nickname, invite_code.toUpperCase()]
    );

    // 5. Increment Invite Code current_uses
    await pool.query(
      'UPDATE invite_codes SET current_uses = current_uses + 1 WHERE id = ?',
      [codes[0].id]
    );

    res.status(201).json({ 
      message: 'Registration successful', 
      userId: result.insertId 
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User Login
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // ၁။ ဖုန်းနံပါတ်ဖြင့် User ရှာဖွေခြင်း
    const [users] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'ဖုန်းနံပါတ် သို့မဟုတ် Password မှားယွင်းနေပါသည်။' });
    }

    const user = users[0];

    // ၂။ Account ပိတ်ထားခြင်း (Ban) ရှိ/မရှိ စစ်ဆေးခြင်း
    if (user.is_banned) {
      return res.status(403).json({ message: 'သင့်အကောင့်ကို ပိတ်ထားပါသည်။ Admin နှင့် ဆက်သွယ်ပါ။' });
    }

    // ၃။ Password မှန်/မမှန် စစ်ဆေးခြင်း
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'ဖုန်းနံပါတ် သို့မဟုတ် Password မှားယွင်းနေပါသည်။' });
    }

    // ၄။ JWT Token ဖန်တီးခြင်း
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // ၇ ရက် သက်တမ်းရှိမယ်
    );

    // ၅။ Password များကို Response မှ ဖယ်ထုတ်ခြင်း
    const { password: _, payment_password: __, ...userWithoutPasswords } = user;

    res.status(200).json({
      message: 'Login ဝင်ရောက်ခြင်း အောင်မြင်ပါသည်။',
      token,
      user: userWithoutPasswords
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'စနစ်ပိုင်းဆိုင်ရာ အမှားအယွင်း တစ်ခုခု ဖြစ်ပေါ်နေပါသည်။' });
  }
};