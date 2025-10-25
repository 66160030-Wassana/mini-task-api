
exports.getTasks = (req, res, next) => {
  // ...
};

exports.getTask = (req, res, next) => {
  // ...
};

// ▼▼▼ [สำคัญ] เพิ่มฟังก์ชัน createTask ที่ขาดไป ▼▼▼
/**
 * @desc    Create new task (V2)
 * @route   POST /api/v2/tasks
 * @access  Private
 */
exports.createTask = (req, res, next) => {

  const { title } = req.body;
  const user = req.user;

  res.status(201).json({
    success: true,
    version: 'v2-lite',
    message: `Task (V2) created by ${user.name}`,
    data: {
      title: title,
      status: 'pending',
    },
  });
};

/**
 * @desc    Update a task (V2)
 * @route   PUT /api/v2/tasks/:id
 * @access  Private
 */
exports.updateTask = (req, res, next) => {
  res.status(200).json({
    success: true,
    version: 'v2-lite',
    message: `Task ${req.params.id} updated (V2 Stub)`,
    data: req.body,
  });
};

/**
 * @desc    Delete a task (V2)
 * @route   DELETE /api/v2/tasks/:id
 * @access  Private
 */
exports.deleteTask = (req, res, next) => {
  res.status(200).json({
    success: true,
    version: 'v2-lite',
    message: `Task ${req.params.id} deleted (V2 Stub)`,
    data: {},
  });
};

/**
 * @desc    Update task status (V2)
 * @route   PATCH /api/v2/tasks/:id/status
 * @access  Private
 */
exports.updateTaskStatus = (req, res, next) => {
  res.status(200).json({
    success: true,
    version: 'v2-lite',
    message: `Task ${req.params.id} status updated to '${req.body.status}' (V2 Stub)`,
  });
};