const db = require('../config/db');
exports.getUsers = (req, res, next) => {
  res.status(200).json({ success: true, msg: 'Show all users' });
};


// @route   GET /api/v1/users/:id
exports.getUser = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Show user ${req.params.id}` });
};


// @route   POST /api/v1/users
exports.createUser = (req, res, next) => {
  res.status(201).json({ success: true, msg: 'Create new user' });
};


// @route   PUT /api/v1/users/:id
exports.updateUser = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Update user ${req.params.id}` });
};


// @route   DELETE /api/v1/users/:id
exports.deleteUser = async (req, res, next) => {
    try {
        const sql = 'DELETE FROM users WHERE id = ?';
        const [result] = await db.query(sql, [req.params.id]);

        if (result.affectedRows === 0) {
            return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
        }

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};