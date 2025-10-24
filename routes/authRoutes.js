const express = require('express');
const { register, login } = require('../controllers/authController');

const router = express.Router();

const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

module.exports = router;