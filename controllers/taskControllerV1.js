const db = require('../config/db');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');
// const { v4: uuidv4 } = require('uuid'); // (ถ้าคุณใช้ uuid ให้ import มาด้วย)

//================================================================
// 1. CREATE TASK (ที่คุณส่งมา)
//================================================================
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
    if (!user.isPremium && user.role !== 'admin') {
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

//================================================================
// 2. GET ALL TASKS (ที่ขาดไป)
//================================================================
/**
 * @desc    Get all tasks for the logged-in user
 * @route   GET /api/v1/tasks
 * @access  Private
 */
exports.getTasks = asyncHandler(async (req, res, next) => {
  const userId = req.user.id; // มาจาก 'protect'

  // ดึง Task ทั้งหมดที่เป็นของ user ที่ login อยู่
  const [tasks] = await db.query(
    'SELECT * FROM tasks WHERE ownerId = ? ORDER BY createdAt DESC',
    [userId]
  );

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
});

//================================================================
// 3. GET SINGLE TASK (ที่ขาดไป)
//================================================================
/**
 * @desc    Get a single task by ID
 * @route   GET /api/v1/tasks/:id
 * @access  Private (with access check)
 */
exports.getTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  // 1. ดึง Task
  const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
  const task = tasks[0];

  // 2. ตรวจสอบว่า Task มีอยู่จริง
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${id}`, 404));
  }

  const isPublic = task.isPublic == true; 
  const isOwner = task.ownerId === userId;
  const isAssignee = task.assignedTo === userId;
  const isAdmin = userRole === 'admin';

  // ถ้าไม่เข้าเงื่อนไข "สักข้อ" ในนี้ -> ห้ามเข้าถึง
if (!isPublic && !isOwner && !isAssignee && !isAdmin) {
    return next(
      new ErrorResponse(`User not authorized to access this task`, 403)
    );
  }

  res.status(200).json({
    success: true,
    data: task,
  });
});

//================================================================
// 4. UPDATE TASK (ที่ขาดไป)
//================================================================
/**
 * @desc    Update a task (title, description, priority)
 * @route   PUT /api/v1/tasks/:id
 * @access  Private (with access check)
 */
exports.updateTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, description, priority } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  // 1. ดึง Task
  let [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
  let task = tasks[0];

  // 2. ตรวจสอบว่า Task มีอยู่จริง
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${id}`, 404));
  }

  // 3. ตรวจสอบสิทธิ์ (เจ้าของ หรือ admin เท่านั้น)
  // (ขั้นตอนนี้อาจซ้ำซ้อนกับ 'checkTaskAccess' middleware ของคุณ)
  if (task.ownerId !== userId && userRole !== 'admin') {
    return next(
      new ErrorResponse(`User not authorized to update this task`, 403)
    );
  }

  // 4. ตรวจสอบสิทธิ์ (RBAC) ถ้ามีการพยายามอัปเกรดเป็น 'high'
  if (priority && priority === 'high' && task.priority !== 'high') {
    if (!user.isPremium && user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User role '${userRole}' is not authorized to set high priority`,
          403
        )
      );
    }
  }

  // 5. อัปเดตข้อมูล (ใช้ข้อมูลใหม่ หรือถ้าไม่มีให้ใช้ข้อมูลเดิม)
  const newTitle = title || task.title;
  const newDesc = description || task.description;
  const newPriority = priority || task.priority;

  await db.query(
    'UPDATE tasks SET title = ?, description = ?, priority = ? WHERE id = ?',
    [newTitle, newDesc, newPriority, id]
  );

  // 6. ดึงข้อมูล Task ที่อัปเดตแล้วกลับไป
  [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);

  res.status(200).json({
    success: true,
    data: tasks[0],
  });
});

//================================================================
// 5. DELETE TASK (ที่ขาดไป)
//================================================================
/**
 * @desc    Delete a task
 * @route   DELETE /api/v1/tasks/:id
 * @access  Private (with access check)
 */
exports.deleteTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  // 1. ดึง Task (เพื่อตรวจสอบสิทธิ์ก่อนลบ)
  const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
  const task = tasks[0];

  // 2. ตรวจสอบว่า Task มีอยู่จริง
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${id}`, 404));
  }

  // 3. ตรวจสอบสิทธิ์ (เจ้าของ หรือ admin เท่านั้น)
  // (ขั้นตอนนี้อาจซ้ำซ้อนกับ 'checkTaskAccess' middleware ของคุณ)
  if (task.ownerId !== userId && userRole !== 'admin') {
    return next(
      new ErrorResponse(`User not authorized to delete this task`, 403)
    );
  }

  // 4. ลบ Task
  await db.query('DELETE FROM tasks WHERE id = ?', [id]);

  res.status(200).json({
    success: true,
    message: 'Task deleted successfully',
    data: {},
  });
});

//================================================================
// 6. UPDATE TASK STATUS (ที่ขาดไป)
//================================================================
/**
 * @desc    Update only the status of a task
 * @route   PATCH /api/v1/tasks/:id/status
 * @access  Private (with access check)
 */
exports.updateTaskStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  // 1. ตรวจสอบว่าส่ง status มา
  if (!status) {
    return next(new ErrorResponse(`Please provide a 'status'`, 400));
  }
  // (คุณอาจต้องเพิ่ม logic ตรวจสอบว่า status ที่ส่งมาถูกต้องหรือไม่ เช่น ['pending', 'in_progress', 'done'])

  // 2. ดึง Task
  let [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
  let task = tasks[0];

  // 3. ตรวจสอบว่า Task มีอยู่จริง
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${id}`, 404));
  }

  // 4. ตรวจสอบสิทธิ์ (เจ้าของ หรือ admin เท่านั้น)
  // (ขั้นตอนนี้อาจซ้ำซ้อนกับ 'checkTaskAccess' middleware ของคุณ)
  if (task.ownerId !== userId && userRole !== 'admin') {
    return next(
      new ErrorResponse(`User not authorized to update this task`, 403)
    );
  }

  // 5. อัปเดตเฉพาะ status
  await db.query('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);

  // 6. ดึงข้อมูล Task ที่อัปเดตแล้วกลับไป
  [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);

  res.status(200).json({
    success: true,
    data: tasks[0],
  });
});