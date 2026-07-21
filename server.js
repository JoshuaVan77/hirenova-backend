const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config(); // ✅ Must be at the very top

const { testConnection } = require('./config/database');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// ==========================================
// 1. Middleware & CORS Configuration
// ==========================================

const envOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://hirenova-user.vercel.app',
  'https://hirenova-admin.vercel.app',
  ...envOrigins
]
  .filter(Boolean)
  .map(origin => origin.trim());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow Postman, mobile apps, etc.
    if (allowedOrigins.indexOf(origin) === -1) {
      console.warn(`⚠️ CORS Blocked: ${origin}`);
      return callback(new Error('CORS policy does not allow access'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// ==========================================
// 2. Socket.io Initialization
// ==========================================
// ✅ initSocket ထဲတွင် CORS နှင့် Ping settings များကို ပေါင်းစပ်ထားသည်
const io = initSocket(server, allowedOrigins);

// ==========================================
// 3. API Routes
// ==========================================

// A. Specific Admin Routes
app.use('/api/admin/lucky-orders', require('./routes/adminLuckyOrderRoutes'));
app.use('/api/admin/tasks', require('./routes/adminTaskRoutes'));

// B. General Admin & Dashboard Routes
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// C. User & Auth Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/user/tasks', require('./routes/userTaskRoutes'));

// D. Shared / Other Routes
console.log('📌 Loading chatRoutes...');
app.use('/api/chat', require('./routes/chatRoutes'));

console.log('📌 Loading settingsRoutes...');
app.use('/api/settings', require('./routes/settingsRoutes'));

console.log('📌 Loading inviteCodeRoutes...');
app.use('/api/invite-codes', require('./routes/inviteCodeRoutes'));

// ==========================================
// 4. GLOBAL ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
  console.error('💥💥💥 GLOBAL ERROR CAUGHT 💥💥💥');
  console.error('URL:', req.originalUrl);
  console.error('Method:', req.method);
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  
  res.status(err.status || 500).json({ 
    message: 'Internal Server Error', 
    details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong on the server'
  });
});

// ==========================================
// 5. Server Start
// ==========================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`\n🚀 ==========================================`);
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🚀 ==========================================\n`);
  
  await testConnection();
});

module.exports = { app, io, server };