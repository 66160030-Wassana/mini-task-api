// routes/taskRoutes.js
const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} = require('../controllers/taskController');

const router = express.Router();

// Route สำหรับ /api/v1/tasks
router.route('/')
  .get(getTasks)
  .post(createTask);

// Route สำหรับ /api/v1/tasks/:id
router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

// Route เฉพาะสำหรับเปลี่ยน status
router.route('/:id/status')
    .patch(updateTaskStatus);

module.exports = router;