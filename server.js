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
// 1. Middleware
// ==========================================

// Production-Ready CORS Configuration
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
// 2. API Routes (Order Matters!)
// ⚠️ Specific routes MUST come BEFORE generic routes!
// ==========================================

// A. Specific Admin Routes (Must be first)
app.use('/api/admin/lucky-orders', require('./routes/adminLuckyOrderRoutes'));
app.use('/api/admin/tasks', require('./routes/adminTaskRoutes'));

// B. General Admin & Dashboard Routes
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// C. User & Auth Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/user/tasks', require('./routes/userTaskRoutes'));

// D. Shared / Other Routes (Chat, Settings, Invite Codes)
// ✅ Added console logs to verify these are loading correctly
console.log('📌 Loading chatRoutes...');
app.use('/api/chat', require('./routes/chatRoutes'));

console.log('📌 Loading settingsRoutes...');
app.use('/api/settings', require('./routes/settingsRoutes'));

console.log('📌 Loading inviteCodeRoutes...');
app.use('/api/invite-codes', require('./routes/inviteCodeRoutes'));

// ==========================================
// 3. Socket.IO Connection (Live Chat)
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
// 4. GLOBAL ERROR HANDLER (Must be at the very bottom)
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

// Export for testing or graceful shutdown
module.exports = { app, io, server };