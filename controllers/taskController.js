// @route   GET /api/v1/tasks
exports.getTasks = (req, res, next) => {
  res.status(200).json({ success: true, msg: 'Show all tasks' });
};

// @route   GET /api/v1/tasks/:id
exports.getTask = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Show task ${req.params.id}` });
};

const ErrorResponse = require('../utils/errorResponse');
// const db = require('../config/db'); // ยังไม่ใช้ DB จริงในส่วนนี้

// @desc    Create new task
// @route   POST /api/v1/tasks
exports.createTask = async (req, res, next) => {
    try {
        const { title, description, priority } = req.body;
        const user = req.user; 
        if (priority === 'high') {
            if (user.role !== 'premium' && user.role !== 'admin') {
                return next(new ErrorResponse(
                    `User role '${user.role}' is not authorized to create a high priority task`,
                    403 // Forbidden
                ));
            }
        }
        
        //logic บันทึกลง database รอทำ week3
          res.status(201).json({
            success: true,
            msg: `Task created successfully`
        });

    } catch (err) {
        next(err);
    }
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