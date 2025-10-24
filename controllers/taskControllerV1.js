// (ตรวจสอบว่าคุณ import 3 ตัวนี้ไว้ด้านบนไฟล์นะครับ)
const db = require('../config/db');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');
// (ถ้าคุณใช้ uuid ให้ import มาด้วย)
// const { v4: uuidv4 } = require('uuid');

// ... (โค้ด controllers อื่นๆ ของคุณ) ...

/**
 * @desc    Create new task (Idempotent & RBAC Check)
 * @route   POST /api/v1/tasks
 * @access  Private
 */
exports.createTask = asyncHandler(async (req, res, next) => {
  // --- 1. IDEMPOTENCY LOGIC ---
  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    return next(new ErrorResponse('Idempotency-Key header is required', 400));
  }

  // ตรวจสอบว่า Key นี้เคยถูกใช้สร้าง Task ไปหรือยัง
  const [existingTask] = await db.query(
    'SELECT * FROM tasks WHERE idempotencyKey = ?',
    [idempotencyKey]
  );

  // ถ้าเคยใช้ Key นี้แล้ว -> คืนค่า Task เดิม (Idempotent response)
  if (existingTask.length > 0) {
    return res.status(200).json({
      success: true,
      message: 'Request is idempotent. Returning existing task.',
      data: existingTask[0],
    });
  }

  // --- 2. BUSINESS LOGIC (จากโค้ดเดิมของคุณ) ---
  const { title, description, priority } = req.body;
  const user = req.user; // มาจาก 'protect' middleware

  // เช็กว่ามีข้อมูลครบ
  if (!title || !description || !priority) {
    return next(
      new ErrorResponse('Please provide title, description, and priority', 400)
    );
  }

  // เช็กสิทธิ์การสร้าง High priority task
  if (priority === 'high') {
    if (user.role !== 'premium' && user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User role '${user.role}' is not authorized to create a high priority task`,
          403 // Forbidden
        )
      );
    }
  }

  // --- 3. DATABASE INSERTION (ถ้าทุกอย่างผ่าน) ---
  const ownerId = user.id;
  const sql = `INSERT INTO tasks 
    (title, description, priority, ownerId, assignedTo, status, isPublic, idempotencyKey) 
    VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)`; // (สมมติ assignedTo คือ ownerId และ isPublic=0)

  try {
    const [result] = await db.query(sql, [
      title,
      description,
      priority,
      ownerId,
      ownerId, // assignedTo (สมมติ)
      idempotencyKey,
    ]);

    // ดึง Task ที่เพิ่งสร้างเสร็จกลับมา
    const [newTask] = await db.query('SELECT * FROM tasks WHERE id = ?', [
      result.insertId,
    ]);

    // ตอบกลับว่า "สร้างสำเร็จ"
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: newTask[0],
    });

  } catch (err) {
    // ดักจับขั้นสูง (เผื่อส่ง Key ซ้ำมาพร้อมกัน)
    if (err.errno === 1062) { // 1062 = ER_DUP_ENTRY (Unique key ซ้ำ)
      return next(
        new ErrorResponse(
          'Idempotency key conflict. Please try again with a new key.',
          409 // 409 Conflict
        )
      );
    }
    return next(err); // โยน Error อื่นๆ
  }
});