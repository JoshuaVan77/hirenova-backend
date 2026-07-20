const jwt = require('jsonwebtoken');

// ✅ Production-Ready Admin Authentication Middleware
const adminAuth = (req, res, next) => {
  try {
    // 1. Get token from header (Case-insensitive check)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ Auth attempt without valid Bearer token');
      return res.status(401).json({ message: 'Access denied. No token provided or invalid format.' });
    }

    // 2. Extract the token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. Token is missing.' });
    }

    // 3. Ensure JWT_SECRET exists in environment
    if (!process.env.JWT_SECRET) {
      console.error('❌ CRITICAL: JWT_SECRET is not defined in environment variables!');
      return res.status(500).json({ message: 'Server configuration error.' });
    }

    // 4. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 5. ✅ CRITICAL: Role Verification (Admin only)
    // သင့် JWT payload ထဲမှာ 'role' ဆိုတဲ့ field ရှိမရှိ စစ်ဆေးသည်
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      console.warn(`⚠️ Unauthorized access attempt by user ID: ${decoded.id || decoded.adminId}`);
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    // 6. Set user info in request for downstream controllers
    req.user = decoded;
    req.adminId = decoded.id || decoded.adminId; // 'id' သို့မဟုတ် 'adminId' နှစ်ခုလုံးကို Support လုပ်သည်
    
    // Success - proceed to next middleware or route handler
    next();
    
  } catch (error) {
    // Log full error for server-side debugging (Railway Logs)
    console.error('❌ Admin Auth Middleware Error:', error.message);
    
    // Provide specific, user-friendly error messages
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format.' });
    }

    // Generic fallback for other JWT errors
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

module.exports = adminAuth;