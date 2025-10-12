// @route   GET /api/v1/tasks
exports.getTasks = (req, res, next) => {
  res.status(200).json({ success: true, msg: 'Show all tasks' });
};

// @route   GET /api/v1/tasks/:id
exports.getTask = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Show task ${req.params.id}` });
};

// @route   POST /api/v1/tasks
exports.createTask = (req, res, next) => {
  res.status(201).json({ success: true, msg: 'Create new task' });
};

// @route   PUT /api/v1/tasks/:id
exports.updateTask = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Update task ${req.params.id}` });
};

// @route   PATCH /api/v1/tasks/:id/status
exports.updateTaskStatus = (req, res, next) => {
    res.status(200).json({ success: true, msg: `Update status for task ${req.params.id}` });
};

// @route   DELETE /api/v1/tasks/:id
exports.deleteTask = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Delete task ${req.params.id}` });
};