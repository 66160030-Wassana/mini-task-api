// routes/userRoutes.js
const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController'); 
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// จับคู่ Route กับ Controller
router.route('/').get(protect,getUsers).post(protect,createUser);
router.route('/:id').get(protect,getUser).put(protect,updateUser).delete(protect, authorize('admin'), deleteUser);


module.exports = router;