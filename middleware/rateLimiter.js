const rateLimit = require('express-rate-limit');

// 1. Limiter สำหรับ routes ที่ "ไม่" ต้องล็อกอิน (เช่น login, register)
//    ป้องกันการยิงสมัครสมาชิก/login รัวๆ
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 20, // อนุญาต 20 requests ต่อ 15 นาที ต่อ IP
  message: {
    success: false,
    message: 'Too many login/register attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true, // ส่งข้อมูล rate limit กลับไปใน headers
  legacyHeaders: false, // ปิด 'X-RateLimit-*' headers
});

// 2. Limiter "หลัก" สำหรับ routes ที่ "ต้อง" ล็อกอิน (3 Tiers)
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที

  // 'max' จะเป็น function ที่ทำงานแบบ async
  // มันจะรัน "หลังจาก" middleware 'protect' ทำงานแล้ว
  max: async (req, res) => {
    // req.user ถูกแนบมาจาก 'protect' middleware
    if (!req.user) {
      // กรณีนี้ไม่ควรเกิด ถ้าเราวาง 'apiLimiter' ไว้หลัง 'protect'
      // แต่ถ้าหลุดมา ให้ limit ไว้ต่ำๆ ที่ 100
      return 100;
    }

    // อ่าน role จาก req.user (ตามที่ project.pdf กำหนด)
    switch (req.user.role) {
      case 'admin':
        return 0; // 0 = ไม่จำกัด
      case 'premium':
        return 500; // 500 requests / 15 นาที
      case 'user':
      default:
        return 100; // 100 requests / 15 นาที
    }
  },

  message: (req, res) => {
    // ส่งข้อความแบบ dynamic
    const role = req.user ? req.user.role : 'user';
    return {
      success: false,
      message: `Too many requests for ${role} account, please try again after 15 minutes.`,
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
});