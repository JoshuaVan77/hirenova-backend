const { pool } = require('./database');
require('dotenv').config();

async function initDatabase() {
  try {
    console.log('🔄 Starting database initialization...');

    // Foreign Key Check ကို ယာယီပိတ်ထားခြင်း (Table အစီအစဉ် မှားယွင်းမှု မရှိစေရန်)
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
      `CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(100),
        full_name VARCHAR(100),
        nickname VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        payment_password VARCHAR(255) NOT NULL,
        trc20_address VARCHAR(100),
        credit_score INT DEFAULT 100,
        balance DECIMAL(10, 2) DEFAULT 0.00,
        invite_code_used VARCHAR(50),
        language VARCHAR(10) DEFAULT 'en',
        is_banned TINYINT(1) DEFAULT 0,
        tasks_completed_today INT DEFAULT 0,
        last_task_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS invite_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        created_by INT,
        max_uses INT DEFAULT 10,
        used_count INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
      )`,

      `CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hotel_name VARCHAR(100) NOT NULL,
        hotel_image VARCHAR(255),
        description TEXT,
        order_amount DECIMAL(10, 2) NOT NULL,
        commission DECIMAL(10, 2) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS lucky_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_number INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        commission DECIMAL(10, 2) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
      )`,

      `CREATE TABLE IF NOT EXISTS user_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        task_id INT NOT NULL,
        task_number INT NOT NULL,
        order_no VARCHAR(50) UNIQUE NOT NULL,
        order_amount DECIMAL(10, 2) NOT NULL,
        commission DECIMAL(10, 2) NOT NULL,
        is_lucky_order TINYINT(1) DEFAULT 0,
        lucky_order_amount DECIMAL(10, 2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        trc20_address VARCHAR(100),
        payment_password_verified TINYINT(1) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        admin_note TEXT,
        approved_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES admins(id) ON DELETE SET NULL
      )`,

      `CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        admin_id INT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
      )`,

      `CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_type VARCHAR(20) NOT NULL,
        sender_id INT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text',
        content TEXT NOT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(50) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    ];

    // Table တစ်ခုချင်းစီကို ဖန်တီးခြင်း
    for (const tableQuery of tables) {
      await pool.query(tableQuery);
    }

    // Foreign Key Check ကို ပြန်ဖွင့်ခြင်း
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    // Default Settings ထည့်သွင်းခြင်း
    await pool.query(`INSERT IGNORE INTO settings (setting_key, setting_value, description) VALUES 
      ('min_task_balance', '30', 'Minimum balance required to start tasks'),
      ('min_topup_amount', '10', 'Minimum top-up amount in USDT')
    `);

    // Default Admin ထည့်သွင်းခြင်း (စမ်းသပ်ရန်)
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(`INSERT IGNORE INTO admins (username, password, email, role) VALUES 
      ('admin', '${hashedPassword}', 'admin@hirenova.com', 'super_admin')
    `);

    console.log('✅ Database tables initialized successfully!');
    console.log('👤 Default Admin created: username: admin, password: admin123');
    process.exit(0); // Script ကို အောင်မြင်စွာ ပြီးဆုံးစေခြင်း

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();