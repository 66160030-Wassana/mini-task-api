// ‼️ 1. Import Dependencies ที่ขาดไป (เหมือน V1) ‼️
const db = require('../config/db');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');

//================================================================
// 1. CREATE TASK (V2)
//================================================================
exports.createTask = asyncHandler(async (req, res, next) => {
  // --- Logic ทั้งหมดเหมือน V1 ---
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return next(new ErrorResponse('Idempotency-Key header is required', 400));
  }
  const { title, description, priority } = req.body;
  const user = req.user;
  const [existingTaskArr] = await db.query(
    'SELECT * FROM tasks WHERE idempotencyKey = ?',
    [idempotencyKey]
  );

  if (existingTaskArr.length > 0) {
    const existingTask = existingTaskArr[0];
    if (
      existingTask.title !== title ||
      existingTask.description !== description ||
      existingTask.priority !== priority
    ) {
      return next(
        new ErrorResponse(
          'Idempotency key conflict (V2)',
          409 // 409 Conflict
        )
      );
    }
    
    // ‼️ 2. แก้ไข Response ให้มี Metadata [cite: 70-79] ‼️
    return res.status(200).json({
      success: true,
      message: 'Request is idempotent. Returning existing task (V2).',
      data: existingTask,
      metadata: { // <--- V2 Upgrade
        createdAt: existingTask.createdAt,
        updatedAt: existingTask.updatedAt,
        version: 'v2'
      }
    });
  }

  if (!title || !description || !priority) {
    return next(
      new ErrorResponse('Please provide title, description, and priority (V2)', 400)
    );
  }
  if (priority === 'high') {
    if (!user.isPremium && user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User role '${user.role}' is not authorized to create a high priority task (V2)`,
          403 // Forbidden
        )
      );
    }
  }

  const ownerId = user.id;
  const sql = `INSERT INTO tasks 
     (title, description, priority, ownerId, assignedTo, status, isPublic, idempotencyKey) 
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)`;

  try {
    const [result] = await db.query(sql, [
      title,
      description,
      priority,
      ownerId,
      ownerId, 
      idempotencyKey,
    ]);
    const [newTaskArr] = await db.query('SELECT * FROM tasks WHERE id = ?', [
      result.insertId,
    ]);
    const newTask = newTaskArr[0];
    
    // ‼️ 3. แก้ไข Response ให้มี Metadata [cite: 70-79] ‼️
    res.status(201).json({
      success: true,
      message: 'Task created successfully (V2)',
      data: newTask,
      metadata: { // <--- V2 Upgrade
        createdAt: newTask.createdAt,
        updatedAt: newTask.updatedAt,
        version: 'v2'
      }
    });
  } catch (err) {
    if (err.errno === 1062) {
      return next(
        new ErrorResponse(
          'Idempotency key conflict (V2)',
          409
        )
      );
    }
    return next(err);
  }
});

//================================================================
// 2. GET ALL TASKS (V2)
//================================================================
exports.getTasks = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const [tasks] = await db.query(
    'SELECT * FROM tasks WHERE ownerId = ? ORDER BY createdAt DESC',
    [userId]
  );
  
  // ‼️ แก้ไข Response ให้มี Metadata [cite: 62] ‼️
  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
    metadata: { // <--- V2 Upgrade
      version: 'v2',
      timestamp: new Date().toISOString()
    }
  });
});

//================================================================
// 3. GET SINGLE TASK (V2)
//================================================================
exports.getTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;
  const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
  const task = tasks[0];

  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${id} (V2)`, 404));
  }
  const isPublic = task.isPublic == true;
  const isOwner = task.ownerId === userId;
  const isAssignee = task.assignedTo === userId;
  const isAdmin = userRole === 'admin';

  if (!isPublic && !isOwner && !isAssignee && !isAdmin) {
    return next(
      new ErrorResponse(`User not authorized to access this task (V2)`, 403)
    );
  }
  
  // ‼️ แก้ไข Response ให้มี Metadata [cite: 70-79] ‼️
  res.status(200).json({
    success: true,
    data: task,
    metadata: { // <--- V2 Upgrade
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      version: 'v2'
    }
  });
});

//================================================================
// 4. UPDATE TASK (V2)
//================================================================
exports.updateTask = asyncHandler(async (req, res, next) => {
  // --- Logic ทั้งหมดเหมือน V1 ---
  const { id } = req.params;
  const { title, description, priority } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  let [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
  let task = tasks[0];
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${id} (V2)`, 404));
  }
  if (task.ownerId !== userId && userRole !== 'admin') {
    return next(
      new ErrorResponse(`User not authorized to update this task (V2)`, 403)
    );
  }
  if (priority && priority === 'high' && task.priority !== 'high') {
    if (!req.user.isPremium && userRole !== 'admin') {
      return next(
        new ErrorResponse(
          `User role '${userRole}' is not authorized to set high priority (V2)`,
          403
        )
      );
    }
  }
  const newTitle = title || task.title;
  const newDesc = description || task.description;
  const newPriority = priority || task.priority;
  await db.query(
    'UPDATE tasks SET title = ?, description = ?, priority = ? WHERE id = ?',
    [newTitle, newDesc, newPriority, id]
  );
  
  // ดึงข้อมูลใหม่
  [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
  const updatedTask = tasks[0];
  
  // ‼️ แก้ไข Response ให้มี Metadata [cite: 70-79] ‼️
  res.status(200).json({
    success: true,
    data: updatedTask,
    metadata: { // <--- V2 Upgrade
      createdAt: updatedTask.createdAt,
      updatedAt: updatedTask.updatedAt, // (ค่านี้จะอัปเดต)
      version: 'v2'
    }
  });
});

//================================================================
// 5. DELETE TASK (V2)
//================================================================
exports.deleteTask = asyncHandler(async (req, res, next) => {
  // --- Logic ทั้งหมดเหมือน V1 ---
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;
  const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
  const task = tasks[0];
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${id} (V2)`, 404));
  }
  if (task.ownerId !== userId && userRole !== 'admin') {
    return next(
      new ErrorResponse(`User not authorized to delete this task (V2)`, 403)
    );
  }
  await db.query('DELETE FROM tasks WHERE id = ?', [id]);
  
  // ‼️ แก้ไข Response ให้มี Metadata [cite: 62] ‼️
  res.status(200).json({
    success: true,
    message: 'Task deleted successfully (V2)',
    data: {},
    metadata: { // <--- V2 Upgrade
      version: 'v2',
      timestamp: new Date().toISOString()
    }
  });
});

//================================================================
// 6. UPDATE TASK STATUS (V2)
//================================================================
exports.updateTaskStatus = asyncHandler(async (req, res, next) => {
  // --- Logic ทั้งหมดเหมือน V1 ---
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  if (!status) {
    return next(new ErrorResponse(`Please provide a 'status' (V2)`, 400));
  }
  let [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
  let task = tasks[0];
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${id} (V2)`, 404));
  }
  if (task.ownerId !== userId && userRole !== 'admin') {
    return next(
      new ErrorResponse(`User not authorized to update this task (V2)`, 403)
    );
  }
  await db.query('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
  [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
  const updatedTask = tasks[0];
  
  // ‼️ แก้ไข Response ให้มี Metadata [cite: 70-79] ‼️
  res.status(200).json({
    success: true,
    data: updatedTask,
    metadata: { // <--- V2 Upgrade
      createdAt: updatedTask.createdAt,
      updatedAt: updatedTask.updatedAt, // (ค่านี้จะอัปเดต)
      version: 'v2'
    }
  });
});