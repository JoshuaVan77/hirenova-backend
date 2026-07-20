const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ⚠️ WARNING: Railway တွင် Local Storage သည် Ephemeral ဖြစ်သည်။ 
// Server Restart/Redeploy လုပ်တိုင်း ဤ folder အတွင်းရှိ ဖိုင်များ ပျောက်သွားနိုင်ပါသည်။
// True Production အတွက် Cloudinary သို့မဟုတ် AWS S3 ကို အသုံးပြုရန် အကြံပြုအပ်ပါသည်။

const uploadsDir = path.join(__dirname, '../uploads/chat');

// Folder မရှိသေးရင် ဖန်တီးပါ
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // ဖိုင်နာမည်ကို ဘေးကင်းအောင် ပြုပြင်ခြင်း (Sanitize)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'); 
    cb(null, 'chat-' + uniqueSuffix + '-' + safeName);
  }
});

const fileFilter = (req, file, cb) => {
  // Image ဖိုင်အမျိုးအစားများကိုသာ ခွင့်ပြုမည်
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max (Chat ပုံများအတွက် လုံလောက်ပါသည်)
  }
});

module.exports = upload;