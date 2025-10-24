// (ในไฟล์ controllers/taskControllerV2.js)

// @route   GET /api/v2/tasks
exports.getTasks = (req, res, next) => {
  // V2 จะส่งข้อความกลับไปต่างจาก V1
  res.status(200).json({ 
    success: true, 
    version: 'v2-lite',
    msg: 'Show all tasks (V2 - No Description)' 
  });
};

// @route   GET /api/v2/tasks/:id
exports.getTask = (req, res, next) => {
  res.status(200).json({ 
    success: true, 
    version: 'v2-lite',
    msg: `Show task ${req.params.id} (V2)` 
  });
};

// (ฟังก์ชันอื่นๆ เช่น createTask, updateTask ปล่อยไว้เหมือนเดิมก่อน)