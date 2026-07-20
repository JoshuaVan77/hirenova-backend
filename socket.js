const { Server } = require('socket.io');

let io;

// ✅ Helper function to get allowed origins dynamically
const getAllowList = () => {
  const envOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];
  return [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://hirenova-user.vercel.app',      // User Website Live URL
    'https://hirenova-admin.vercel.app',     // Admin Dashboard Live URL
    ...envOrigins                             // .env file ကနေ လာတဲ့ URL တွေကို ထပ်ဖြည့်မယ်
  ]
    .filter(Boolean)                          // undefined/null တန်ဖိုးတွေကို ဖယ်ရှားမယ်
    .map(origin => origin.trim());            // URL ရှေ့နောက်မှာ ပါနေတဲ့ Space တွေကို ဖျက်မယ်
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: getAllowList(),
      methods: ['GET', 'POST'],
      credentials: true
    },
    // ✅ Production Optimizations for Proxies (Railway/Vercel)
    transports: ['websocket', 'polling'], // WebSocket မရရင် Polling ကို Fallback လုပ်မယ်
    pingTimeout: 60000,                   // 60 စက္ကန့်အတွင်း response မရမှ disconnected လို့ သတ်မှတ်မယ်
    pingInterval: 25000                   // 25 စက္ကန့်တိုင်း Connection ကောင်းမကောင်း စစ်ဆေးမယ် (Ping)
  });

  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id} | Transport: ${socket.conn.transport.name}`);
    
    socket.on('join_user_room', (userId) => {
      if (!userId) return;
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined room: user_${userId}`);
    });
    
    socket.on('join_admin_room', (adminId) => {
      socket.join('admin_room');
      console.log(`🛡️ Admin ${adminId || 'Unknown'} joined admin_room`);
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`❌ Client disconnected: ${socket.id} | Reason: ${reason}`);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized! Call initSocket(server) first.');
  }
  return io;
};

module.exports = { initSocket, getIo };