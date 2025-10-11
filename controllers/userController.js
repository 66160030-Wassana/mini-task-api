// controllers/userController.js

// @desc    Get all users
// @route   GET /api/v1/users
exports.getUsers = (req, res, next) => {
  res.status(200).json({ success: true, msg: 'Show all users' });
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
exports.getUser = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Show user ${req.params.id}` });
};

// @desc    Create new user
// @route   POST /api/v1/users
exports.createUser = (req, res, next) => {
  res.status(201).json({ success: true, msg: 'Create new user' });
};

// @desc    Update user
// @route   PUT /api/v1/users/:id
exports.updateUser = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Update user ${req.params.id}` });
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
exports.deleteUser = (req, res, next) => {
  res.status(200).json({ success: true, msg: `Delete user ${req.params.id}` });
};