const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL Connection Pool ဖန်တီးခြင်း
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Connection ကို test လုပ်ခြင်း
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database Connected Successfully!');
    connection.release();
  } catch (error) {
    console.error('❌ Database Connection Failed:', error.message);
  }
}

module.exports = { pool, testConnection };