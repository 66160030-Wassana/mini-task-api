const db = require('../config/db');
const ErrorResponse = require('../utils/errorResponse');
exports.getUsers = async (req, res, next) => {
  try {
    const sql = 'SELECT id, name, email, role, isPremium, createdAt FROM users';
    
    const [users] = await db.query(sql);

    res.status(200).json({ 
      success: true, 
      count: users.length,
      data: users
    });

  } catch (err) {
    next(err);
  }
};


// @route   GET /api/v1/users/:id
exports.getUser = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Show user ${req.params.id}` });
};


// @route   POST /api/v1/users
exports.createUser = (req, res, next) => {
  res.status(201).json({ success: true, msg: 'Create new user' });
};


// @route   PUT /api/v1/users/:id
exports.updateUser = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Update user ${req.params.id}` });
};


// @route   DELETE /api/v1/users/:id
exports.deleteUser = async (req, res, next) => {
    try {
        const sql = 'DELETE FROM users WHERE id = ?';
        const [result] = await db.query(sql, [req.params.id]);

        if (result.affectedRows === 0) {
            return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
        }

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

exports.getMe = async (req, res, next) => {
  try {
    // เราได้ req.user.id มาจาก middleware 'protect'
    // เราจะดึงข้อมูล user ที่ "ไม่มีรหัสผ่าน" กลับไป
    const sql = 'SELECT id, name, email, role, isPremium, subscriptionExpiry, createdAt FROM users WHERE id = ?';
    const [users] = await db.query(sql, [req.user.id]);

    if (users.length === 0) {
      return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: users[0]
    });
  } catch (err) {
    next(err);
  }
};

exports.updateMe = async (req, res, next) => {
  // ‼️ นี่คือฟังก์ชันตัวอย่างสำหรับอัปเดต 'name'
  [cite_start]// โจทย์ไม่ได้บังคับว่าต้องอัปเดตอะไรบ้าง [cite: 87-89]
  
  const { name } = req.body;
  const userId = req.user.id; // จาก middleware 'protect'

  if (!name) {
     return next(new ErrorResponse('Please provide a name to update', 400));
  }

  try {
    const sql = 'UPDATE users SET name = ? WHERE id = ?';
    await db.query(sql, [name, userId]);
    
    // ดึงข้อมูลใหม่มาแสดง
    const [updatedUsers] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);

    res.status(200).json({
      success: true,
      data: updatedUsers[0]
    });
  } catch (err) {
    next(err);
  }
};