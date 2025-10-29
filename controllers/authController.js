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
        const isMatch = password === user.password;

        // 4. ถ้ารหัสผ่านไม่ตรงกัน
        if (!isMatch) {
            return next(new ErrorResponse('Invalid credentials', 401));
        }

        // 5. ถ้าทุกอย่างถูกต้อง: สร้าง Token จากข้อมูลจริงใน DB
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE,
        });

        res.status(200).json({ success: true, token });

    } catch (err) {
        next(err);
    }
};