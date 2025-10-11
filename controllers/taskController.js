// controllers/taskController.js

// @desc    Get all tasks
// @route   GET /api/v1/tasks
exports.getTasks = (req, res, next) => {
  res.status(200).json({ success: true, msg: 'Show all tasks' });
};

// @desc    Get single task
// @route   GET /api/v1/tasks/:id
exports.getTask = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Show task ${req.params.id}` });
};

// @desc    Create new task
// @route   POST /api/v1/tasks
exports.createTask = (req, res, next) => {
  res.status(201).json({ success: true, msg: 'Create new task' });
};

// @desc    Update task
// @route   PUT /api/v1/tasks/:id
exports.updateTask = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Update task ${req.params.id}` });
};

// @desc    Update task status
// @route   PATCH /api/v1/tasks/:id/status
exports.updateTaskStatus = (req, res, next) => {
    res.status(200).json({ success: true, msg: `Update status for task ${req.params.id}` });
};

// @desc    Delete task
// @route   DELETE /api/v1/tasks/:id
exports.deleteTask = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Delete task ${req.params.id}` });
};