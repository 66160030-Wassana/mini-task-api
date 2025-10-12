const ErrorResponse = require('../utils/errorResponse');
const bcrypt = require('bcryptjs');
const db = require('../config/db'); 
const { v4: uuidv4 } = require('uuid'); // ใช้สำหรับสร้าง ID

// @route   POST /api/v1/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // สร้าง salt และ hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // สร้าง user object สำหรับบันทึก
    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: role || 'user', 
      isPremium: false,
      subscriptionExpiry: null
    };

    // บันทึก user ลง DB (โค้ดจริงจะซับซ้อนกว่านี้)
    // const sql = 'INSERT INTO users SET ?';
    // await db.query(sql, newUser);

    res.status(201).json({
      success: true,
      data: `User ${name} registered successfully`
    });

  } catch (err) {
    next(err);
  }
};