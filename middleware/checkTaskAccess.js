const db = require('../config/db'); // ตัวเชื่อมต่อฐานข้อมูล
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('./asyncHandler'); // (เราจะสร้างไฟล์นี้ในขั้นถัดไป)

/**
 * @desc Middleware ตรวจสอบสิทธิ์การเข้าถึง Task (ABAC)
 */
exports.checkTaskAccess = asyncHandler(async (req, res, next) => {
  // 1. ดึงข้อมูล User (จาก 'protect' middleware) และ Task ID (จาก URL)
  const user = req.user;
  const taskId = req.params.id;

  // --- กฎข้อที่ 1: ถ้าเป็น Admin ให้ผ่านเลย ---
  if (user.role === 'admin') {
    return next();
  }

  // 2. ถ้าไม่ใช่ Admin, ให้ไปค้นหา Task ใน DB
  const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
  
  const task = tasks[0];

  // 3. ตรวจสอบว่ามี Task นี้จริงหรือไม่
  if (!task) {
    return next(new ErrorResponse(`ไม่พบ Task ที่มี ID ${taskId}`, 404));
  }

  // --- กฎข้อที่ 2: ถ้าเป็นการ "ดู" (GET) และ Task เป็น "สาธารณะ" (Public) ---
  if (req.method === 'GET' && task.isPublic === 1) { // 1 = true
    return next();
  }

  // --- กฎข้อที่ 3: ถ้าเป็น "เจ้าของ" (Owner) Task ---
  if (task.ownerId === user.id) {
    return next();
  }

  // --- กฎข้อที่ 4: ถ้าไม่เข้าเงื่อนไขทั้งหมด ---
  return next(
    new ErrorResponse(
      `User ${user.id} ไม่มีสิทธิ์เข้าถึง Task ${taskId}`,
      403 // 403 Forbidden
    )
  );
});