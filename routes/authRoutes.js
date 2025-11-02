const express = require('express');
const { register, login, refresh, logout } = require('../controllers/authController');

const router = express.Router();

const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', authLimiter, logout);

module.exports = router;