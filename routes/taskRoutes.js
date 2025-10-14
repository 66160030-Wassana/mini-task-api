const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} = require('../controllers/taskController');

const { protect } = require('../middleware/auth');
const router = express.Router();


// Route สำหรับ /api/v1/tasks
router.route('/')
  .get(protect,getTasks)
  .post(protect,createTask);

// Route สำหรับ /api/v1/tasks/:id
router.route('/:id')
  .get(protect,getTask)
  .put(protect,updateTask)
  .delete(protect,deleteTask);

// Route เฉพาะสำหรับเปลี่ยน status
router.route('/:id/status')
    .patch(protect,updateTaskStatus);

module.exports = router;