const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config(); // ✅ Must be at the very top

const { testConnection } = require('./config/database');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// ✅ Socket.io initialization
const io = initSocket(server);

// ==========================================
// Middleware
// ==========================================

// ✅ Production-Ready CORS Configuration
// Railway .env မှ FRONTEND_URL ကို comma (,) ခြားပြီး ထည့်ထားပါက အလိုအလျောက် ဖတ်ယူပါမည်
const envOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://hirenova-user.vercel.app',      // User Website Live URL
  'https://hirenova-admin.vercel.app',     // Admin Dashboard Live URL
  ...envOrigins                             // .env file ကနေ လာတဲ့ URL တွေကို ထပ်ဖြည့်မယ်
]
  .filter(Boolean)                          // undefined/null တန်ဖိုးတွေကို ဖယ်ရှားမယ်
  .map(origin => origin.trim());            // URL ရှေ့နောက်မှာ ပါနေတဲ့ Space တွေကို ဖျက်မယ်

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or Railway internal health checks)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      console.warn('⚠️ CORS Blocked:', msg);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

app.use(express.json({ limit: '10mb' })); // Parse JSON bodies (limit increased for image uploads)
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Serve static files for uploads (ensure 'uploads' folder exists in root)
app.use('/uploads', express.static('uploads')); 

// ==========================================
// API Routes
// ⚠️ CRITICAL: Specific routes MUST come BEFORE generic routes!
// ==========================================

// 1. Admin Routes
app.use('/api/admin/lucky-orders', require('./routes/adminLuckyOrderRoutes'));
app.use('/api/admin/tasks', require('./routes/adminTaskRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// 2. User Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/user/tasks', require('./routes/userTaskRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/invite-codes', require('./routes/inviteCodeRoutes'));

// ==========================================
// Socket.IO Connection (Live Chat)
// ==========================================
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });
  
  socket.on('join_admin_room', () => {
    socket.join('admin_room');
    console.log('🛡️ Admin joined admin room');
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// ==========================================
// GLOBAL ERROR HANDLER (Must be at the very bottom)
// ==========================================
app.use((err, req, res, next) => {
  console.error('💥💥💥 GLOBAL ERROR CAUGHT 💥💥💥');
  console.error('URL:', req.originalUrl);
  console.error('Method:', req.method);
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  
  // Production မှာ Error Detail ကို User ဆီ မပြမိအောင် ကာကွယ်ထားသည်
  res.status(err.status || 500).json({ 
    message: 'Internal Server Error', 
    details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong on the server'
  });
});

// ==========================================
// Server Start
// ==========================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  await testConnection();
});

// Export server as well (useful for testing or graceful shutdown)
module.exports = { app, io, server };