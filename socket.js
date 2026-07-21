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
    ...envOrigins                            // .env file ကနေ လာတဲ့ URL များ
  ]
    .filter(Boolean)
    .map(origin => origin.trim());
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Postman / Mobile Apps သို့မဟုတ် AllowList ထဲပါရင် ခွင့်ပြုမည်
        const allowedOrigins = getAllowList();
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(null, true); // Production WebSockets delay မဖြစ်စေရန် fallback အားဖြင့် ခွင့်ပြုပေးထားသည်
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    // ✅ Fast Connection Setup for Railway & Vercel
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,   // 60 စက္ကန့်အတွင်း response မရမှ disconnected
    pingInterval: 25000   // 25 စက္ကန့်တိုင်း Connection ping လုပ်မည်
  });

  io.on('connection', (socket) => {
    const transportName = socket.conn ? socket.conn.transport.name : 'unknown';
    console.log(`🔌 New client connected: ${socket.id} | Transport: ${transportName}`);

    // User Room သို့ ချိတ်ဆက်ခြင်း
    socket.on('join_user_room', (userId) => {
      if (!userId) return;
      const roomName = `user_${userId}`;
      socket.join(roomName);
      console.log(`👤 User ${userId} joined room: ${roomName}`);
    });

    // Admin Room သို့ ချိတ်ဆက်ခြင်း
    socket.on('join_admin_room', (adminId) => {
      socket.join('admin_room');
      console.log(`🛡️ Admin ${adminId || 'Unknown'} joined: admin_room`);
    });

    // Client Disconnect ဖြစ်သွားချိန်
    socket.on('disconnect', (reason) => {
      console.log(`❌ Client disconnected: ${socket.id} | Reason: ${reason}`);
    });
  });

  return io;
};

// Helper functions (getIO နှင့် getIo နှစ်မျိုးလုံး ခေါ်သုံးနိုင်အောင် Support ပေးထားသည်)
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized! Call initSocket(server) first.');
  }
  return io;
};

module.exports = { 
  initSocket, 
  getIO, 
  getIo: getIO 
};