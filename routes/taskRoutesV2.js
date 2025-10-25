const express = require('express');
const { getTasks,getTask,createTask,updateTask,deleteTask,updateTaskStatus} = require('../controllers/taskControllerV2');
const { protect } = require('../middleware/auth');
const { checkTaskAccess } = require('../middleware/checkTaskAccess');

// 1. นำเข้า apiLimiter
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Route สำหรับ /api/v1/tasks
router.route('/')
  .get([protect, apiLimiter], getTasks)     // 2. เพิ่ม apiLimiter
  .post([protect, apiLimiter], createTask); // 3. เพิ่ม apiLimiter

// Route สำหรับ /api/v1/tasks/:id
router.route('/:id')
  .get([protect, checkTaskAccess, apiLimiter], getTask)       // 4. เพิ่ม apiLimiter
  .put([protect, checkTaskAccess, apiLimiter], updateTask)     // 5. เพิ่ม apiLimiter
  .delete([protect, checkTaskAccess, apiLimiter], deleteTask); // 6. เพิ่ม apiLimiter

// Route เฉพาะสำหรับเปลี่ยน status
router.route('/:id/status')
  .patch([protect, checkTaskAccess, apiLimiter], updateTaskStatus); // 7. เพิ่ม apiLimiter

module.exports = router;