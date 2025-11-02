// routes/userRoutes.js
const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getMe,
  updateMe
} = require('../controllers/userController'); 
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// จับคู่ Route กับ Controller
router.route('/me').get(protect, getMe).put(protect, updateMe);
router.route('/').get(protect, authorize('admin'), getUsers).post(protect, authorize('admin'), createUser);
router.route('/:id').get(protect, authorize('admin'), getUser).put(protect, authorize('admin'), updateUser).delete(protect, authorize('admin'), deleteUser);

module.exports = router;