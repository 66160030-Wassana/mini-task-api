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
const { apiLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

router.use(protect);
router.use(apiLimiter);

// จับคู่ Route กับ Controller
router.route('/me').get(getMe).put(updateMe);
router.route('/').get(authorize('admin'), getUsers).post(authorize('admin'), createUser);
router.route('/:id').get(authorize('admin'), getUser).put(authorize('admin'), updateUser).delete(authorize('admin'), deleteUser);

module.exports = router;