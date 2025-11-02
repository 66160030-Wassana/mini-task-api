const crypto = require('crypto');
const ErrorResponse = require('../utils/errorResponse');
const bcrypt = require('bcryptjs');
const db = require('../config/db'); 
const jwt = require('jsonwebtoken');

// @route   POST /api/v1/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. เตรียมข้อมูล user object (ไม่มี id เพราะ DB จะสร้างให้)
    const newUser = {
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      isPremium: false,
      subscriptionExpiry: null,
    };

    // 3. เขียน SQL เพื่อบันทึกข้อมูล
    const sql = 'INSERT INTO users SET ?';
    await db.query(sql, newUser);

    // 4. ตอบกลับเป็นข้อความสำเร็จ (ไม่มี Token)
    res.status(201).json({
      success: true,
      msg: 'User registered successfully. Please log in.' // <-- ส่งแค่ข้อความนี้กลับไป
    });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
        return next(new ErrorResponse('Email already exists', 400));
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new ErrorResponse('Please provide an email and password', 400));
        }

        // 1. ค้นหา user จาก email ในฐานข้อมูล
        const sql = 'SELECT * FROM users WHERE email = ?';
        const [users] = await db.query(sql, [email]);

        // 2. ถ้าไม่เจอ user
        if (users.length === 0) {
            return next(new ErrorResponse('Invalid credentials', 401)); // ใช้ 401 เพื่อความปลอดภัย
        }

        const user = users[0];

        // 3. เปรียบเทียบรหัสผ่านที่ส่งมากับรหัสผ่านที่ hash ไว้ใน DB
        const isMatch = await bcrypt.compare(password, user.password);

        // 4. ถ้ารหัสผ่านไม่ตรงกัน
        if (!isMatch) {
            return next(new ErrorResponse('Invalid credentials', 401));
        }

        // 5. ถ้าถูกต้อง สร้าง Token ทั้งสองชนิด
        await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);

        // สร้าง Token ใหม่
        const { accessToken, refreshToken } = await generateAndStoreTokens(user, db);

        res.status(200).json({ success: true, accessToken, refreshToken });

    } catch (err) {
        next(err);
    }
};

exports.refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return next(new ErrorResponse('Refresh token is required', 400));
        }

        // 1. ตรวจสอบ Refresh Token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (err) {
            // ถ้า Token ผิดพลาด (เช่น หมดอายุ, signature ไม่ถูก)
            return next(new ErrorResponse('Invalid or expired refresh token', 401));
        }
        
        // 2. ตรวจสอบใน DB ว่า Token นี้ (tokenId) ถูก blacklisted (ลบไป) หรือยัง
        const sql = 'SELECT * FROM refresh_tokens WHERE user_id = ? AND token_id = ?';
        const [tokens] = await db.query(sql, [decoded.userId, decoded.tokenId]);

        if (tokens.length === 0) {
            // Token นี้ไม่มีในระบบ (อาจจะ logout ไปแล้ว)
            return next(new ErrorResponse('Invalid refresh token or session expired', 401));
        }

        // 3. (Optional) ตรวจสอบว่า user ยังมีอยู่จริง
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
        if (users.length === 0) {
            return next(new ErrorResponse('User not found', 404));
        }

        const user = users[0];

        // 4. ถ้าทุกอย่างผ่าน: สร้าง *เฉพาะ Access Token* ใหม่
        const accessTokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            isPremium: user.isPremium,
        };
        
        const accessToken = jwt.sign(accessTokenPayload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE || '15m' // ตรงตามโจทย์ [cite: 210]
        });

        res.status(200).json({
            success: true,
            accessToken
        });

    } catch (err) {
        next(err);
    }
};

exports.logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return next(new ErrorResponse('Refresh token is required to logout', 400));
        }

        // 1. Decode token เพื่อเอา tokenId (ไม่จำเป็นต้อง verify เพราะเราแค่จะลบมัน)
        // แต่การ verify ก่อนก็ปลอดภัยกว่า เผื่อมีการส่ง token มั่วๆ มา
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (err) {
            // ถ้าส่ง token มั่วมา ก็แค่บอกว่าสำเร็จ (เพราะเป้าหมายคือ logout)
             return res.status(200).json({ success: true, msg: 'Logged out successfully' });
        }
        
        // 2. ลบ Token ID นี้ออกจากฐานข้อมูล
        const sql = 'DELETE FROM refresh_tokens WHERE token_id = ? AND user_id = ?';
        await db.query(sql, [decoded.tokenId, decoded.userId]);

        res.status(200).json({
            success: true,
            msg: 'Logged out successfully'
        });

    } catch (err) {
        next(err);
    }
};

async function generateAndStoreTokens(user, db) {
    // 1. สร้าง Access Token (ตาม spec [cite: 210-217])
    const accessTokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
    };
    const accessToken = jwt.sign(accessTokenPayload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '15m'
    });

    // 2. สร้าง Refresh Token (ตาม spec [cite: 218-223])
    const tokenId = crypto.randomBytes(32).toString('hex'); // ID เฉพาะของ token นี้ [cite: 221]
    const refreshTokenPayload = {
        userId: user.id,
        tokenId: tokenId 
    };
    const refreshToken = jwt.sign(refreshTokenPayload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' // 7 วัน [cite: 218]
    });

    // 3. บันทึก Refresh Token ลง DB เพื่อการ Blacklist
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 วัน

    const sql = 'INSERT INTO refresh_tokens (user_id, token_id, expires_at) VALUES (?, ?, ?)';
    await db.query(sql, [user.id, tokenId, expiryDate]);

    return { accessToken, refreshToken };
}