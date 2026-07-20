const mysql = require('mysql2/promise');
require('dotenv').config();

// ✅ Production-Ready Database Configuration
// Railway (Auto-injected MYSQL* variables) နဲ့ Localhost (.env DB_* variables) နှစ်ခုလုံးကို Support လုပ်ထားသည်
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'hirenova',
  port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 15, // Production အတွက် Connection Limit ကို အနည်းငယ် တိုးထားသည်
  queueLimit: 0,
  enableKeepAlive: true, // Long-running connections များအတွက် Keep-Alive ဖွင့်ထားသည်
  keepAliveInitialDelay: 0
};

// MySQL Connection Pool ဖန်တီးခြင်း
const pool = mysql.createPool(dbConfig);

// Connection ကို test လုပ်ခြင်း
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database Connected Successfully!');
    console.log(`📍 Connected to Host: ${dbConfig.host} | Database: ${dbConfig.database}`);
    connection.release();
  } catch (error) {
    console.error('❌ Database Connection Failed:', error.message);
    
    // Production Environment တွင် Database မချိတ်ဆက်နိုင်ပါက Server ကို ရပ်တန့်စေခြင်း (Optional)
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️ Critical: Cannot start server without database connection.');
      // process.exit(1); // လိုအပ်ပါက ဒီလိုင်းကို ဖွင့်လိုက်ပါ (Uncomment)
    }
  }
}

module.exports = { pool, testConnection };